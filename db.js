import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");
const CONFIG_FILE = path.join(__dirname, "bot-config.json");

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

let tablesInitialized = false;

export async function initDatabase() {
  if (!sql || tablesInitialized) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        images JSONB NOT NULL DEFAULT '[]'::jsonb,
        category TEXT,
        season TEXT,
        is_new BOOLEAN DEFAULT true,
        color TEXT,
        sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
        description TEXT,
        telegram JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer JSONB NOT NULL,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        total INTEGER NOT NULL,
        status TEXT DEFAULT 'Yangi',
        payment_method TEXT DEFAULT 'Naqd / Karta',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bot_config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS product_images (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL DEFAULT 'image/jpeg',
        data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    tablesInitialized = true;
    console.log("[DB]: Neon PostgreSQL jadvallari muvaffaqiyatli tekshirildi/yaratildi.");
  } catch (err) {
    console.error("[DB]: Neon jadvallarini yaratishda xatolik:", err.message);
  }
}

// Helper: Rasm manzillarini universal /api/images?id=... formatiga normallashtirish
export function normalizeProduct(p) {
  if (!p) return p;
  let images = Array.isArray(p.images) ? [...p.images] : [];
  images = images.map((img) => {
    if (typeof img === "string") {
      img = { src: img, alt: p.name || "" };
    }
    let src = img.src || "";
    // Agar bot orqali /images/main-... yoki /images/side... bo'lib saqlangan bo'lsa
    if (src.startsWith("/images/main-") || src.startsWith("/images/side") || src.startsWith("/images/img-")) {
      const id = src.replace("/images/", "");
      src = `/api/images?id=${encodeURIComponent(id)}`;
    }
    return { ...img, src };
  });
  return { ...p, images };
}

// --------------------------------------------------------------------------
// 1. PRODUCTS
// --------------------------------------------------------------------------
export async function getProducts() {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT 
          id, 
          name, 
          price, 
          images, 
          category, 
          season, 
          is_new as "isNew", 
          color, 
          sizes, 
          description, 
          telegram,
          created_at
        FROM products 
        ORDER BY created_at DESC;
      `;
      return (rows || []).map(normalizeProduct);
    } catch (err) {
      console.error("[DB]: Neon getProducts xatosi:", err.message);
    }
  }

  // Fallback to local products.json
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const list = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
      return Array.isArray(list) ? list.map(normalizeProduct) : [];
    }
  } catch {}
  return [];
}

export async function getProductById(id) {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT 
          id, 
          name, 
          price, 
          images, 
          category, 
          season, 
          is_new as "isNew", 
          color, 
          sizes, 
          description, 
          telegram,
          created_at
        FROM products 
        WHERE id = ${id}
        LIMIT 1;
      `;
      return rows && rows.length > 0 ? normalizeProduct(rows[0]) : null;
    } catch (err) {
      console.error("[DB]: Neon getProductById xatosi:", err.message);
    }
  }

  const list = await getProducts();
  return list.find((p) => p.id === id) || null;
}

export async function createProduct(prod) {
  let price = Number(prod.price) || 0;
  if (price > 0 && price < 1000) price *= 1000;
  prod.price = price;

  if (!prod.id) {
    const slug = (prod.name || "item")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    prod.id = `${slug || "item"}-${Date.now().toString(36)}`;
  }

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO products (
          id, name, price, images, category, season, is_new, color, sizes, description, telegram
        ) VALUES (
          ${prod.id},
          ${prod.name},
          ${prod.price},
          ${JSON.stringify(prod.images || [])},
          ${prod.category || "Dvoyka"},
          ${prod.season || "Barchasi"},
          ${Boolean(prod.isNew)},
          ${prod.color || "Asosiy"},
          ${JSON.stringify(prod.sizes || ["XS", "S", "M", "L", "XL"])},
          ${prod.description || ""},
          ${JSON.stringify(prod.telegram || null)}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          images = EXCLUDED.images,
          category = EXCLUDED.category,
          season = EXCLUDED.season,
          is_new = EXCLUDED.is_new,
          color = EXCLUDED.color,
          sizes = EXCLUDED.sizes,
          description = EXCLUDED.description,
          telegram = EXCLUDED.telegram;
      `;
      return prod;
    } catch (err) {
      console.error("[DB]: Neon createProduct xatosi:", err.message);
    }
  }

  // Fallback to local file
  const list = await getProducts();
  const existingIdx = list.findIndex((p) => p.id === prod.id);
  if (existingIdx >= 0) {
    list[existingIdx] = prod;
  } else {
    list.unshift(prod);
  }
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  return prod;
}

export async function updateProduct(id, updates) {
  if (updates.price !== undefined) {
    let price = Number(updates.price) || 0;
    if (price > 0 && price < 1000) price *= 1000;
    updates.price = price;
  }

  const existing = await getProductById(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates, id };

  if (sql) {
    await initDatabase();
    try {
      await sql`
        UPDATE products SET
          name = ${merged.name},
          price = ${merged.price},
          images = ${JSON.stringify(merged.images || [])},
          category = ${merged.category || "Dvoyka"},
          season = ${merged.season || "Barchasi"},
          is_new = ${Boolean(merged.isNew)},
          color = ${merged.color || "Asosiy"},
          sizes = ${JSON.stringify(merged.sizes || [])},
          description = ${merged.description || ""},
          telegram = ${JSON.stringify(merged.telegram || null)}
        WHERE id = ${id};
      `;
      return merged;
    } catch (err) {
      console.error("[DB]: Neon updateProduct xatosi:", err.message);
    }
  }

  // Fallback to local file
  const list = await getProducts();
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = merged;
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  }
  return merged;
}

export async function deleteProduct(id) {
  const existing = await getProductById(id);
  if (!existing) return null;

  if (sql) {
    await initDatabase();
    try {
      await sql`DELETE FROM products WHERE id = ${id};`;
      return existing;
    } catch (err) {
      console.error("[DB]: Neon deleteProduct xatosi:", err.message);
    }
  }

  // Fallback
  const list = await getProducts();
  const filtered = list.filter((p) => p.id !== id);
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return existing;
}

// --------------------------------------------------------------------------
// 2. ORDERS
// --------------------------------------------------------------------------
export async function getOrders() {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT 
          id, 
          customer, 
          items, 
          total, 
          status, 
          payment_method as "paymentMethod",
          created_at as "createdAt"
        FROM orders 
        ORDER BY created_at DESC;
      `;
      return rows;
    } catch (err) {
      console.error("[DB]: Neon getOrders xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

export async function createOrder(order) {
  if (!order.id) {
    order.id = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  }
  if (!order.createdAt) {
    order.createdAt = new Date().toISOString();
  }
  if (!order.status) {
    order.status = "Yangi";
  }

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO orders (
          id, customer, items, total, status, payment_method, created_at
        ) VALUES (
          ${order.id},
          ${JSON.stringify(order.customer || {})},
          ${JSON.stringify(order.items || [])},
          ${order.total || 0},
          ${order.status || "Yangi"},
          ${order.paymentMethod || "Naqd / Karta"},
          ${order.createdAt}
        );
      `;

      // Yangi buyurtma haqida Telegram adminga avtomatik xabar yuborish
      notifyTelegramOrder(order).catch(() => null);

      return order;
    } catch (err) {
      console.error("[DB]: Neon createOrder xatosi:", err.message);
    }
  }

  const list = await getOrders();
  list.unshift(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  notifyTelegramOrder(order).catch(() => null);
  return order;
}

async function notifyTelegramOrder(order) {
  try {
    const cfg = await getBotConfig();
    const token = cfg.botToken;
    const targetChat = cfg.targetChatId;
    if (!token || !targetChat) return;

    const itemsList = (order.items || [])
      .map((it) => `• <b>${it.name}</b> (O'lcham: ${it.size}) × ${it.quantity} ta — ${(Number(it.price || 0) * it.quantity).toLocaleString("ru-RU")} so'm`)
      .join("\n");

    const msg =
      `🛍 <b>YANGI BUYURTMA #${order.id}</b>\n\n` +
      `👤 <b>Mijoz:</b> ${order.customer?.name || "Noma'lum"}\n` +
      `📞 <b>Telefon:</b> ${order.customer?.phone || "Kiritilmagan"}\n` +
      `📍 <b>Yetkazish manzili:</b> ${order.customer?.address || "Kiritilmagan"}\n` +
      `💳 <b>To'lov turi:</b> ${order.paymentMethod || "Naqd / Karta"}\n\n` +
      `📦 <b>Xarid qilingan modellar:</b>\n${itemsList || "—"}\n\n` +
      `💰 <b>JAMI:</b> <b>${Number(order.total || 0).toLocaleString("ru-RU")} so'm</b>\n` +
      `🕒 <b>Vaqt:</b> ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChat,
        text: msg,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.warn("[ORDER NOTIFY ERROR]:", err.message);
  }
}

export async function updateOrder(id, updates) {
  const list = await getOrders();
  const existing = list.find((o) => o.id === id);
  if (!existing) return null;

  const merged = { ...existing, ...updates, id };

  if (sql) {
    await initDatabase();
    try {
      await sql`
        UPDATE orders SET
          status = ${merged.status || "Yangi"}
        WHERE id = ${id};
      `;
      return merged;
    } catch (err) {
      console.error("[DB]: Neon updateOrder xatosi:", err.message);
    }
  }

  const idx = list.findIndex((o) => o.id === id);
  if (idx >= 0) {
    list[idx] = merged;
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  }
  return merged;
}

export async function deleteOrder(id) {
  if (sql) {
    await initDatabase();
    try {
      await sql`DELETE FROM orders WHERE id = ${id};`;
      return { success: true, id };
    } catch (err) {
      console.error("[DB]: Neon deleteOrder xatosi:", err.message);
    }
  }

  const list = await getOrders();
  const filtered = list.filter((o) => o.id !== id);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return { success: true, id };
}

// --------------------------------------------------------------------------
// 3. BOT CONFIG
// --------------------------------------------------------------------------
export async function getBotConfig() {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`SELECT value FROM bot_config WHERE key = 'main' LIMIT 1;`;
      if (rows && rows.length > 0) return rows[0].value;
    } catch {}
  }

  let fileCfg = {};
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fileCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}

  return {
    botToken: process.env.ADMIN_BOT_TOKEN || process.env.BOT_TOKEN || fileCfg.botToken || "",
    adminBotUsername: process.env.ADMIN_BOT_USERNAME || fileCfg.adminBotUsername || "dreemroom_adm_bot",
    orderBotToken: process.env.ORDER_BOT_TOKEN || fileCfg.orderBotToken || "",
    orderBotUsername: process.env.ORDER_BOT_USERNAME || fileCfg.orderBotUsername || "dreemroom_bot",
    targetChatId: process.env.TARGET_CHAT_ID ? Number(process.env.TARGET_CHAT_ID) : (fileCfg.targetChatId || ""),
    adminSecret: process.env.ADMIN_SECRET || fileCfg.adminSecret || "dreemroom-adm",
    webAppUrl: process.env.WEB_APP_URL || fileCfg.webAppUrl || "http://localhost:5173",
  };
}

export async function setBotConfig(cfg) {
  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO bot_config (key, value)
        VALUES ('main', ${JSON.stringify(cfg)})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `;
    } catch {}
  }

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch {}
  return cfg;
}

// --------------------------------------------------------------------------
// 4. PRODUCT IMAGES (Neon PostgreSQL + Local Fallback + Auto Telegram Recovery)
// --------------------------------------------------------------------------
export async function saveImage(id, dataBase64, contentType = "image/jpeg") {
  const cleanId = String(id).replace(/^\/images\//, "").replace(/^\/api\/images\?id=/, "");
  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO product_images (id, content_type, data)
        VALUES (${cleanId}, ${contentType}, ${dataBase64})
        ON CONFLICT (id) DO UPDATE SET
          content_type = EXCLUDED.content_type,
          data = EXCLUDED.data;
      `;
      return true;
    } catch (err) {
      console.error("[DB]: saveImage xatosi:", err.message);
      return false;
    }
  }
  return false;
}

export async function getImage(id) {
  const cleanId = String(id).replace(/^\/images\//, "").replace(/^\/api\/images\?id=/, "");

  // 1. Neon PostgreSQL dan olish
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT id, content_type, data FROM product_images WHERE id = ${cleanId} LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.error("[DB]: getImage DB xatosi:", err.message);
    }
  }

  // 2. Lokal public/images/ papkadan tekshirish
  try {
    const localPath = path.join(__dirname, "public", "images", cleanId);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      const buf = fs.readFileSync(localPath);
      const b64 = buf.toString("base64");
      if (sql) {
        saveImage(cleanId, b64, "image/jpeg").catch(() => null);
      }
      return {
        id: cleanId,
        content_type: "image/jpeg",
        data: b64,
      };
    }
  } catch {}

  // 3. Agar rasm DB da ham, faylda ham bo'lmasa, Telegram fileId orqali qayta yuklab olish
  if (sql) {
    try {
      const cfg = await getBotConfig();
      const token = cfg?.botToken?.trim();
      if (token) {
        const prodRows = await sql`
          SELECT images FROM products WHERE images::text LIKE ${'%' + cleanId + '%'};
        `;
        if (prodRows && prodRows.length > 0) {
          const imgs = prodRows[0].images || [];
          const found = imgs.find((img) => img.src && (img.src.includes(cleanId) || img.fileId));
          if (found && found.fileId) {
            const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${found.fileId}`).then((r) => r.json()).catch(() => null);
            if (fileRes?.ok && fileRes?.result?.file_path) {
              const downUrl = `https://api.telegram.org/file/bot${token}/${fileRes.result.file_path}`;
              const imgRes = await fetch(downUrl).catch(() => null);
              if (imgRes && imgRes.ok) {
                const arrBuf = await imgRes.arrayBuffer();
                const b64 = Buffer.from(arrBuf).toString("base64");
                await saveImage(cleanId, b64, "image/jpeg");
                return {
                  id: cleanId,
                  content_type: "image/jpeg",
                  data: b64,
                };
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[DB]: Telegramdan avto-qayta tiklash xatosi:", err.message);
    }
  }

  return null;
}

