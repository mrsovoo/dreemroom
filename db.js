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

    tablesInitialized = true;
    console.log("[DB]: Neon PostgreSQL jadvallari muvaffaqiyatli tekshirildi/yaratildi.");
  } catch (err) {
    console.error("[DB]: Neon jadvallarini yaratishda xatolik:", err.message);
  }
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
      return rows;
    } catch (err) {
      console.error("[DB]: Neon getProducts xatosi:", err.message);
    }
  }

  // Fallback to local products.json
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
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
      return rows[0] || null;
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
      return order;
    } catch (err) {
      console.error("[DB]: Neon createOrder xatosi:", err.message);
    }
  }

  const list = await getOrders();
  list.unshift(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  return order;
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

