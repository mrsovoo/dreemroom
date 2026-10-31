import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { brandConfig } from "./brand.config.js";

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
const ADMIN_USERS_FILE = path.join(__dirname, "admin_users.json");
const ADMIN_KEYS_FILE = path.join(__dirname, "admin_keys.json");
const TELEGRAM_GROUPS_FILE = path.join(__dirname, "telegram_groups.json");
const CUSTOMERS_FILE = path.join(__dirname, "customers.json");

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

let tablesInitialized = false;
let productsCache = null;
let productsCacheTime = 0;
let bannersCache = null;
let bannersCacheTime = 0;
const CACHE_TTL_MS = 6000; // 6 soniya tezkor xotirada saqlash (DB ga yukni 90% kamaytiradi)

export function invalidateProductsCache() {
  productsCache = null;
}

export function invalidateBannersCache() {
  bannersCache = null;
}

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
        is_popular BOOLEAN DEFAULT false,
        sales_count INTEGER DEFAULT 0,
        color TEXT,
        sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
        description TEXT,
        telegram JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
    `.catch(() => {});
    await sql`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
    `.catch(() => {});

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

    // 1. Mijozlar jadvali (Sodiqlik / Loyalty uchun - Requirement 6)
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        telegram_id TEXT,
        name TEXT,
        first_order_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 2. Tizim sozlamalari (Guruh message_thread_id lari va h.k. - Requirement 1)
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Mavjud orders jadvaliga yangi ustunlarni xavfsiz migratsiya qilish (Requirement 7)
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_topic_id INTEGER;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_by TEXT;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`.catch(() => {});

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

    // 1. Admin botdan foydalanuvchilar (Adminlar)
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        full_name TEXT,
        used_key TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 2. Maxfiy kalit so'zlar
    await sql`
      CREATE TABLE IF NOT EXISTS admin_keys (
        key TEXT PRIMARY KEY,
        label TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 3. Bot qo'shilgan guruhlar va kanallar
    await sql`
      CREATE TABLE IF NOT EXISTS telegram_groups (
        chat_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        username TEXT,
        is_target BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 4. Asosiy sahifa bannyerlari (Hero Banners)
    await sql`
      CREATE TABLE IF NOT EXISTS hero_banners (
        id TEXT PRIMARY KEY,
        src TEXT NOT NULL,
        alt TEXT,
        title TEXT,
        subtitle TEXT,
        eyebrow TEXT,
        button_text TEXT,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Boshlang'ich kalit so'z (agar .env da berilgan bo'lsa)
    if (process.env.ADMIN_SECRET) {
      const defaultKey = process.env.ADMIN_SECRET.toLowerCase().trim();
      await sql`
        INSERT INTO admin_keys (key, label)
        VALUES (${defaultKey}, 'Asosiy kalit so''z')
        ON CONFLICT (key) DO NOTHING;
      `;
    }

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
  const now = Date.now();
  if (productsCache && (now - productsCacheTime < CACHE_TTL_MS)) {
    return productsCache;
  }

  // Buyurtmalar bazasidan har bir mahsulotning sotuv va buyurtmalar sonini aniqlash
  const salesMap = {};
  const ordersCountMap = {};
  try {
    const orders = await getOrders();
    for (const ord of orders || []) {
      const items = Array.isArray(ord.items) ? ord.items : [];
      for (const item of items) {
        if (item && item.id) {
          const qty = Number(item.quantity) || 1;
          salesMap[item.id] = (salesMap[item.id] || 0) + qty;
          ordersCountMap[item.id] = (ordersCountMap[item.id] || 0) + 1;
        }
      }
    }
  } catch {}

  let products = [];
  if (sql) {
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
          COALESCE(is_popular, false) as "isPopular",
          COALESCE(sales_count, 0) as "salesCount",
          color, 
          sizes, 
          description, 
          telegram,
          created_at
        FROM products 
        ORDER BY created_at DESC;
      `;
      products = rows || [];
    } catch (err) {
      console.error("[DB]: Neon getProducts xatosi:", err.message);
      if (err.message && err.message.includes("does not exist")) {
        await initDatabase();
      }
    }
  }

  // Fallback to local products.json
  if (!products.length) {
    try {
      if (fs.existsSync(PRODUCTS_FILE)) {
        const list = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
        products = Array.isArray(list) ? list : [];
      }
    } catch {}
  }

  const result = products.map((p) => {
    const norm = normalizeProduct(p);
    const dynamicSales = salesMap[norm.id] || 0;
    const dynamicOrders = ordersCountMap[norm.id] || 0;
    const manualSales = Number(norm.salesCount) || 0;
    const totalSales = dynamicSales + manualSales;
    const isPopular = Boolean(norm.isPopular || totalSales > 0 || dynamicOrders > 0);
    return {
      ...norm,
      isPopular,
      salesCount: totalSales,
      ordersCount: dynamicOrders,
    };
  });

  productsCache = result;
  productsCacheTime = Date.now();
  return result;
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

  const isPopular = Boolean(prod.isPopular);
  const salesCount = Number(prod.salesCount) || 0;

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO products (
          id, name, price, images, category, season, is_new, is_popular, sales_count, color, sizes, description, telegram
        ) VALUES (
          ${prod.id},
          ${prod.name},
          ${prod.price},
          ${JSON.stringify(prod.images || [])},
          ${prod.category || "Dvoyka"},
          ${prod.season || "Barchasi"},
          ${Boolean(prod.isNew)},
          ${isPopular},
          ${salesCount},
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
          is_popular = EXCLUDED.is_popular,
          sales_count = EXCLUDED.sales_count,
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
  invalidateProductsCache();
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
          is_popular = ${Boolean(merged.isPopular)},
          sales_count = ${Number(merged.salesCount) || 0},
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
  invalidateProductsCache();
  return merged;
}

export async function deleteProduct(id) {
  const existing = await getProductById(id);
  if (!existing) return null;

  if (sql) {
    await initDatabase();
    try {
      await sql`DELETE FROM products WHERE id = ${id};`;
      invalidateProductsCache();
      return existing;
    } catch (err) {
      console.error("[DB]: Neon deleteProduct xatosi:", err.message);
    }
  }

  // Fallback
  const list = await getProducts();
  const filtered = list.filter((p) => p.id !== id);
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  invalidateProductsCache();
  return existing;
}

export async function clearAllProducts() {
  invalidateProductsCache();
  if (sql) {
    await initDatabase();
    try {
      await sql`TRUNCATE TABLE products;`;
      await sql`TRUNCATE TABLE orders;`;
    } catch (err) {
      console.error("[DB]: clearAllProducts SQL xatosi:", err.message);
    }
  }

  try {
    fs.writeFileSync(PRODUCTS_FILE, "[]", "utf-8");
    fs.writeFileSync(ORDERS_FILE, "[]", "utf-8");
  } catch {}

  return true;
}

// --------------------------------------------------------------------------
// 2. ORDERS & CUSTOMERS
// --------------------------------------------------------------------------

/**
 * Buyurtma statusi o'zgarganda chaqiriladigan integratsiya funksiyasi.
 * Kelajakda sodiqlik / cashback / ballar moduli shu yerga ulanadi (Requirement 6).
 */
export function onOrderStatusChange(order, oldStatus, newStatus) {
  const orderId = order?.id || "NOMA'LUM";
  const customerName = order?.customer?.name || order?.customerId || "Mijoz";
  console.log(`[ORDER STATUS CHANGED]: #${orderId} | "${oldStatus || 'Yangi'}" -> "${newStatus}" | Mijoz: ${customerName}`);
}

/**
 * Mijoz ma'lumotlarini saqlash yoki yangilash (Requirement 6)
 */
export async function saveOrUpdateCustomer({ phone, name, telegramId }) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 9) return null;

  const custId = `CUST-${digits}`;
  const formattedPhone = String(phone).trim();
  const customerName = (name && name.trim()) || "Mijoz";

  if (sql) {
    await initDatabase();
    try {
      const existing = await sql`
        SELECT id, name FROM customers 
        WHERE phone = ${formattedPhone} OR id = ${custId} 
        LIMIT 1;
      `;
      if (existing && existing.length > 0) {
        if (name && name !== "Mijoz") {
          await sql`UPDATE customers SET name = ${customerName} WHERE id = ${existing[0].id};`;
        }
        return existing[0].id;
      }

      await sql`
        INSERT INTO customers (id, phone, name, telegram_id, first_order_at, created_at)
        VALUES (${custId}, ${formattedPhone}, ${customerName}, ${telegramId ? String(telegramId) : null}, NOW(), NOW())
        ON CONFLICT (phone) DO UPDATE SET name = COALESCE(EXCLUDED.name, customers.name);
      `;
      return custId;
    } catch (err) {
      console.error("[DB]: saveOrUpdateCustomer xatosi:", err.message);
    }
  }

  // File fallback
  try {
    let list = [];
    if (fs.existsSync(CUSTOMERS_FILE)) {
      list = JSON.parse(fs.readFileSync(CUSTOMERS_FILE, "utf-8"));
    }
    const idx = list.findIndex((c) => c.phone === formattedPhone || c.id === custId);
    if (idx >= 0) {
      if (name && name !== "Mijoz") list[idx].name = customerName;
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[idx].id;
    }
    const newCust = {
      id: custId,
      phone: formattedPhone,
      name: customerName,
      telegramId: telegramId ? String(telegramId) : null,
      firstOrderAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    list.push(newCust);
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(list, null, 2), "utf-8");
    return custId;
  } catch {}
  return custId;
}

/**
 * Admin panel uchun mijozlar ro'yxatini statistika bilan olish (Requirement 6)
 */
export async function getCustomersWithStats() {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT 
          c.id,
          c.phone,
          c.name,
          c.telegram_id as "telegramId",
          c.first_order_at as "firstOrderAt",
          c.created_at as "createdAt",
          COUNT(o.id)::int as "ordersCount",
          COALESCE(SUM(o.total), 0)::int as "totalSpent"
        FROM customers c
        LEFT JOIN orders o ON (o.customer_id = c.id OR o.customer->>'phone' = c.phone)
        GROUP BY c.id, c.phone, c.name, c.telegram_id, c.first_order_at, c.created_at
        ORDER BY c.created_at DESC;
      `;
      return rows;
    } catch (err) {
      console.error("[DB]: getCustomersWithStats xatosi:", err.message);
    }
  }

  // File fallback
  try {
    let customersList = [];
    if (fs.existsSync(CUSTOMERS_FILE)) {
      customersList = JSON.parse(fs.readFileSync(CUSTOMERS_FILE, "utf-8"));
    }
    const ordersList = await getOrders();
    return customersList.map((c) => {
      const custOrders = ordersList.filter(
        (o) => o.customerId === c.id || o.customer?.phone === c.phone
      );
      const totalSpent = custOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      return {
        id: c.id,
        phone: c.phone,
        name: c.name,
        telegramId: c.telegramId,
        firstOrderAt: c.firstOrderAt,
        createdAt: c.createdAt,
        ordersCount: custOrders.length,
        totalSpent,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Tizim sozlamalari (settings jadvali) (Requirement 1)
 */
export async function getSetting(key) {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`SELECT value FROM settings WHERE key = ${key} LIMIT 1;`;
      if (rows && rows.length > 0) return rows[0].value;
    } catch {}
  }
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      return fileCfg[key] ?? null;
    }
  } catch {}
  return null;
}

export async function setSetting(key, value) {
  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `;
      await sql`
        INSERT INTO bot_config (key, value)
        VALUES (${key}, ${JSON.stringify(value)})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `.catch(() => {});
    } catch (err) {
      console.error(`[DB]: setSetting(${key}) xatosi:`, err.message);
    }
  }
  try {
    let fileCfg = {};
    if (fs.existsSync(CONFIG_FILE)) {
      fileCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
    fileCfg[key] = value;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(fileCfg, null, 2), "utf-8");
  } catch {}
  return value;
}

/**
 * Guruh Forum Topiklari sozlamalari (Requirement 1)
 */
export async function getGroupTopics() {
  return await getSetting("group_topics");
}

export async function saveGroupTopics(topics) {
  return await setSetting("group_topics", topics);
}

/**
 * Kunlik savdo hisoboti matnini tayyorlash (Requirement 5)
 */
export async function generateDailyReportText(targetDateStr) {
  const dateStr =
    targetDateStr ||
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });

  const allOrders = await getOrders();
  const todayOrders = allOrders.filter((o) => {
    if (!o.createdAt) return false;
    const orderDate = new Date(o.createdAt).toLocaleDateString("en-CA", {
      timeZone: "Asia/Tashkent",
    });
    return orderDate === dateStr;
  });

  const totalCount = todayOrders.length;
  let totalSum = 0;
  let countNew = 0;
  let countAccepted = 0;
  let countDelivered = 0;
  let countCanceled = 0;

  const itemCounts = {};

  for (const o of todayOrders) {
    const total = Number(o.total) || 0;
    if (o.status !== "Bekor qilindi") {
      totalSum += total;
    }

    if (o.status === "Qabul qilindi") countAccepted++;
    else if (o.status === "Yetkazildi") countDelivered++;
    else if (o.status === "Bekor qilindi") countCanceled++;
    else countNew++;

    if (o.status !== "Bekor qilindi" && Array.isArray(o.items)) {
      for (const it of o.items) {
        const name = (it.name || "Mahsulot").trim();
        const qty = Number(it.quantity) || 1;
        itemCounts[name] = (itemCounts[name] || 0) + qty;
      }
    }
  }

  let topProductText = "Hozircha yo'q";
  let topCount = 0;
  for (const [name, cnt] of Object.entries(itemCounts)) {
    if (cnt > topCount) {
      topCount = cnt;
      topProductText = `<b>${name}</b> (${cnt} ta)`;
    }
  }

  const [y, m, d] = dateStr.split("-");
  const formattedDate = `${d}.${m}.${y}`;

  return (
    `📊 <b>KUNLIK SAVDO HISOBOTI</b>\n` +
    `📅 <b>Sana:</b> ${formattedDate}\n\n` +
    `🛍 <b>Bugungi buyurtmalar:</b> <b>${totalCount} ta</b>\n` +
    `💰 <b>Jami savdo summasi:</b> <b>${totalSum.toLocaleString("ru-RU")} ${brandConfig.currency || "so'm"}</b>\n\n` +
    `📈 <b>Statuslar bo'yicha taqsimot:</b>\n` +
    `• 🟡 Yangi: <b>${countNew} ta</b>\n` +
    `• 🔵 Qabul qilindi: <b>${countAccepted} ta</b>\n` +
    `• 🟢 Yetkazildi: <b>${countDelivered} ta</b>\n` +
    `• 🔴 Bekor qilindi: <b>${countCanceled} ta</b>\n\n` +
    `👑 <b>Eng ko'p buyurtma qilingan mahsulot:</b>\n${topProductText}\n\n` +
    `🕒 <i>Hisobot vaqti: ${new Date().toLocaleTimeString("uz-UZ", { timeZone: "Asia/Tashkent" })}</i>`
  );
}

/**
 * Kunlik hisobotni guruhga yoki adminga yuborish (Requirement 5)
 */
export async function sendDailyReport(isManual = false, manualChatId = null) {
  const reportText = await generateDailyReportText();
  const cfg = await getBotConfig();
  const token = cfg.botToken?.trim();
  if (!token) return { ok: false, error: "BOT_TOKEN yo'q" };

  if (isManual && manualChatId) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: manualChatId,
        text: reportText,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json().catch(() => null);
    return { ok: Boolean(data?.ok), reportText };
  }

  const topics = await getGroupTopics();
  const targetChat = topics?.groupChatId || cfg.targetChatId;
  if (!targetChat) return { ok: false, error: "Target chat yo'q" };

  const payload = {
    chat_id: targetChat,
    text: reportText,
    parse_mode: "HTML",
  };
  if (topics?.reportsThreadId) {
    payload.message_thread_id = Number(topics.reportsThreadId);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  return { ok: Boolean(data?.ok), reportText };
}

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
          customer_id as "customerId",
          telegram_message_id as "telegramMessageId",
          telegram_chat_id as "telegramChatId",
          telegram_topic_id as "telegramTopicId",
          updated_by as "updatedBy",
          updated_at as "updatedAt",
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

export async function getOrderById(id) {
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
          customer_id as "customerId",
          telegram_message_id as "telegramMessageId",
          telegram_chat_id as "telegramChatId",
          telegram_topic_id as "telegramTopicId",
          updated_by as "updatedBy",
          updated_at as "updatedAt",
          created_at as "createdAt"
        FROM orders 
        WHERE id = ${id}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.error("[DB]: Neon getOrderById xatosi:", err.message);
    }
  }

  const list = await getOrders();
  return list.find((o) => o.id === id) || null;
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

  // Sodiqlik uchun mijozni saqlash va customer_id ni bog'lash (Requirement 6)
  const custPhone = order.customer?.phone || "";
  const custName = order.customer?.name || "Mijoz";
  let customerId = order.customerId || null;
  if (custPhone) {
    try {
      customerId = await saveOrUpdateCustomer({
        phone: custPhone,
        name: custName,
        telegramId: order.customer?.telegramId || null,
      });
      order.customerId = customerId;
    } catch (err) {
      console.warn("[CUSTOMER SYNC WARN]:", err.message);
    }
  }

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO orders (
          id, customer, items, total, status, payment_method, customer_id, created_at
        ) VALUES (
          ${order.id},
          ${JSON.stringify(order.customer || {})},
          ${JSON.stringify(order.items || [])},
          ${order.total || 0},
          ${order.status || "Yangi"},
          ${order.paymentMethod || "Naqd / Karta"},
          ${customerId},
          ${order.createdAt}
        );
      `;

      onOrderStatusChange(order, null, order.status || "Yangi");
      notifyTelegramOrder(order).catch(() => null);

      return order;
    } catch (err) {
      console.error("[DB]: Neon createOrder xatosi:", err.message);
    }
  }

  const list = await getOrders();
  list.unshift(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  onOrderStatusChange(order, null, order.status || "Yangi");
  notifyTelegramOrder(order).catch(() => null);
  return order;
}

export async function notifyTelegramOrder(order) {
  try {
    const cfg = await getBotConfig();
    const token = cfg.botToken?.trim();
    if (!token) return;

    // Guruh yoki Forum topik parametrlarini olish (Requirement 1 & 7)
    const topics = await getGroupTopics();
    const targetChat = topics?.groupChatId || cfg.targetChatId;
    if (!targetChat) return;

    const ordersThreadId = topics?.ordersThreadId ? Number(topics.ordersThreadId) : null;
    const systemThreadId = topics?.systemThreadId ? Number(topics.systemThreadId) : null;

    const itemsList = (order.items || [])
      .map((it) => `• <b>${it.name}</b> (O'lcham: ${it.size}) × ${it.quantity} ta — ${(Number(it.price || 0) * it.quantity).toLocaleString("ru-RU")} so'm`)
      .join("\n");

    const msg =
      `🛍 <b>YANGI BUYURTMA #${order.id}</b>\n\n` +
      `👤 <b>Mijoz:</b> ${order.customer?.name || "Noma'lum"}\n` +
      `📞 <b>Telefon:</b> ${order.customer?.phone || "Kiritilmagan"}\n` +
      `🏪 <b>Manzil / Usul:</b> ${order.customer?.address || "Do'kondan olib ketish"}\n` +
      `💳 <b>To'lov turi:</b> ${order.paymentMethod || "Naqd / Karta"}\n\n` +
      `📦 <b>Buyurtma tarkibi:</b>\n${itemsList || "—"}\n\n` +
      `💰 <b>JAMI:</b> <b>${Number(order.total || 0).toLocaleString("ru-RU")} so'm</b>\n` +
      `🕒 <b>Vaqt:</b> ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}\n\n` +
      `📊 <b>Holat:</b> 🟡 Yangi`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Qabul qilindi", callback_data: `ord:accept:${order.id}` },
          { text: "🚚 Yetkazildi", callback_data: `ord:deliver:${order.id}` },
          { text: "❌ Bekor qilindi", callback_data: `ord:cancel:${order.id}` },
        ],
      ],
    };

    let sentMessage = null;
    const firstImg = order.items?.[0]?.image;
    let photoUrl = "";
    if (firstImg && typeof firstImg === "string") {
      if (firstImg.startsWith("http://") || firstImg.startsWith("https://")) {
        photoUrl = firstImg;
      } else if (cfg.webAppUrl && (firstImg.startsWith("/api/images") || firstImg.startsWith("/brand") || firstImg.startsWith("/image"))) {
        photoUrl = `${cfg.webAppUrl.replace(/\/+$/, "")}${firstImg}`;
      }
    }

    // 1-urinish: Rasmli xabar (sendPhoto)
    if (photoUrl) {
      const payload = {
        chat_id: targetChat,
        photo: photoUrl,
        caption: msg,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      };
      if (ordersThreadId) payload.message_thread_id = ordersThreadId;

      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          sentMessage = data.result;
        } else if (data?.description?.includes("thread not found")) {
          // Topik topilmasa yoki o'chirilgan bo'lsa Tizimga xabar
          if (systemThreadId) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: targetChat,
                message_thread_id: systemThreadId,
                text: "⚠️ <b>Ogohlantirish:</b> 'Buyurtmalar' topiki topilmadi yoki o'chirilgan! Iltimos, /setupgroup buyrug'i orqali topiklarni qayta sozlang.",
                parse_mode: "HTML",
              }),
            }).catch(() => null);
          }
          // Fallback: umumiy chatga yuborish
          delete payload.message_thread_id;
          const retryRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const retryData = await retryRes.json().catch(() => null);
          if (retryData?.ok) sentMessage = retryData.result;
        }
      } catch (err) {
        console.warn("[SEND PHOTO FAILED]:", err.message);
      }
    }

    // 2-urinish: Matnli xabar (sendMessage)
    if (!sentMessage) {
      const payload = {
        chat_id: targetChat,
        text: msg,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      };
      if (ordersThreadId) payload.message_thread_id = ordersThreadId;

      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          sentMessage = data.result;
        } else if (data?.description?.includes("thread not found")) {
          delete payload.message_thread_id;
          const retryRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const retryData = await retryRes.json().catch(() => null);
          if (retryData?.ok) sentMessage = retryData.result;
        }
      } catch (err) {
        console.error("[ORDER NOTIFY ERROR]:", err.message);
      }
    }

    // Xabar ma'lumotlarini buyurtmaga biriktirib qo'yish
    if (sentMessage?.message_id) {
      await updateOrder(order.id, {
        telegramMessageId: sentMessage.message_id,
        telegramChatId: String(targetChat),
        telegramTopicId: ordersThreadId || null,
      }).catch(() => null);
    }
  } catch (err) {
    console.warn("[ORDER NOTIFY MAIN ERROR]:", err.message);
  }
}

export async function updateOrder(id, updates) {
  const list = await getOrders();
  const existing = list.find((o) => o.id === id);
  if (!existing) return null;

  const merged = { ...existing, ...updates, id };

  if (updates.status && updates.status !== existing.status) {
    onOrderStatusChange(existing, existing.status, updates.status);
  }

  if (sql) {
    await initDatabase();
    try {
      await sql`
        UPDATE orders SET
          status = ${merged.status || "Yangi"},
          customer_id = ${merged.customerId || null},
          telegram_message_id = ${merged.telegramMessageId || null},
          telegram_chat_id = ${merged.telegramChatId || null},
          telegram_topic_id = ${merged.telegramTopicId || null},
          updated_by = ${merged.updatedBy || null},
          updated_at = ${merged.updatedAt || new Date().toISOString()}
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
    botToken: process.env.BOT_TOKEN || process.env.ADMIN_BOT_TOKEN || process.env.ORDER_BOT_TOKEN || fileCfg.botToken || "",
    adminBotUsername: process.env.BOT_USERNAME || process.env.ADMIN_BOT_USERNAME || fileCfg.adminBotUsername || "",
    orderBotToken: process.env.BOT_TOKEN || process.env.ORDER_BOT_TOKEN || fileCfg.orderBotToken || "",
    orderBotUsername: process.env.BOT_USERNAME || process.env.ORDER_BOT_USERNAME || fileCfg.orderBotUsername || "",
    targetChatId: process.env.TARGET_CHAT_ID ? Number(process.env.TARGET_CHAT_ID) : (fileCfg.targetChatId || ""),
    adminSecret: process.env.ADMIN_SECRET || fileCfg.adminSecret || "",
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
// 4. PRODUCT IMAGES (Neon PostgreSQL + Fallback Cache)
// --------------------------------------------------------------------------
const fallbackImageCache = new Map();

export async function saveImage(id, dataBase64, contentType = "image/jpeg") {
  const cleanId = String(id).replace(/^\/images\//, "").replace(/^\/api\/images\?id=/, "");
  fallbackImageCache.set(cleanId, { id: cleanId, content_type: contentType, data: dataBase64 });

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
  return true;
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

  // 2. Fallback memory keshdan tekshirish
  if (fallbackImageCache.has(cleanId)) {
    return fallbackImageCache.get(cleanId);
  }

  // 3. Lokal public/images/ papkadan tekshirish
  try {
    const localPath = path.join(__dirname, "public", "images", cleanId);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      const buf = fs.readFileSync(localPath);
      const b64 = buf.toString("base64");
      const imgObj = {
        id: cleanId,
        content_type: "image/jpeg",
        data: b64,
      };
      fallbackImageCache.set(cleanId, imgObj);
      if (sql) {
        saveImage(cleanId, b64, "image/jpeg").catch(() => null);
      }
      return imgObj;
    }
  } catch {}

  return null;
}

// --------------------------------------------------------------------------
// 4. ADMIN USERS (Admin botdan foydalanuvchilar)
// --------------------------------------------------------------------------
export async function getAdminUsers() {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT 
          user_id as "userId",
          username,
          first_name as "firstName",
          last_name as "lastName",
          full_name as "fullName",
          used_key as "usedKey",
          status,
          created_at as "createdAt",
          last_active_at as "lastActiveAt"
        FROM admin_users
        ORDER BY last_active_at DESC;
      `;
      return rows;
    } catch (err) {
      console.error("[DB]: getAdminUsers DB xatosi:", err.message);
    }
  }

  // Fallback JSON
  try {
    if (fs.existsSync(ADMIN_USERS_FILE)) {
      return JSON.parse(fs.readFileSync(ADMIN_USERS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

export async function getAdminUser(userId) {
  const uId = String(userId);
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT 
          user_id as "userId",
          username,
          first_name as "firstName",
          last_name as "lastName",
          full_name as "fullName",
          used_key as "usedKey",
          status,
          created_at as "createdAt",
          last_active_at as "lastActiveAt"
        FROM admin_users
        WHERE user_id = ${uId}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.error("[DB]: getAdminUser DB xatosi:", err.message);
    }
  }

  const users = await getAdminUsers();
  return users.find((u) => String(u.userId) === uId) || null;
}

export async function saveAdminUser({ userId, username, firstName, lastName, usedKey }) {
  const uId = String(userId);
  const uName = username ? `@${String(username).replace(/^@/, "")}` : "";
  const fName = firstName || "";
  const lName = lastName || "";
  const fullName = `${fName} ${lName}`.trim() || uName || `ID: ${uId}`;
  const now = new Date().toISOString();

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO admin_users (
          user_id, username, first_name, last_name, full_name, used_key, status, created_at, last_active_at
        ) VALUES (
          ${uId}, ${uName}, ${fName}, ${lName}, ${fullName}, ${usedKey || ""}, 'active', NOW(), NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          username = EXCLUDED.username,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          full_name = EXCLUDED.full_name,
          used_key = COALESCE(NULLIF(EXCLUDED.used_key, ''), admin_users.used_key),
          last_active_at = NOW();
      `;
    } catch (err) {
      console.error("[DB]: saveAdminUser DB xatosi:", err.message);
    }
  }

  // Fallback JSON
  try {
    let users = [];
    if (fs.existsSync(ADMIN_USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(ADMIN_USERS_FILE, "utf-8"));
    }
    const idx = users.findIndex((u) => String(u.userId) === uId);
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        username: uName,
        firstName: fName,
        lastName: lName,
        fullName,
        usedKey: usedKey || users[idx].usedKey,
        lastActiveAt: now,
      };
    } else {
      users.unshift({
        userId: uId,
        username: uName,
        firstName: fName,
        lastName: lName,
        fullName,
        usedKey: usedKey || "",
        status: "active",
        createdAt: now,
        lastActiveAt: now,
      });
    }
    fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB]: saveAdminUser fayl xatosi:", err.message);
  }

  return { userId: uId, username: uName, fullName, status: "active" };
}

export async function updateAdminUserStatus(userId, status) {
  const uId = String(userId);
  if (sql) {
    await initDatabase();
    try {
      await sql`
        UPDATE admin_users
        SET status = ${status}
        WHERE user_id = ${uId};
      `;
    } catch (err) {
      console.error("[DB]: updateAdminUserStatus DB xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(ADMIN_USERS_FILE)) {
      const users = JSON.parse(fs.readFileSync(ADMIN_USERS_FILE, "utf-8"));
      const target = users.find((u) => String(u.userId) === uId);
      if (target) {
        target.status = status;
        fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
      }
    }
  } catch {}
  return true;
}

export async function deleteAdminUser(userId) {
  const uId = String(userId);
  if (sql) {
    await initDatabase();
    try {
      await sql`
        DELETE FROM admin_users
        WHERE user_id = ${uId};
      `;
    } catch (err) {
      console.error("[DB]: deleteAdminUser DB xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(ADMIN_USERS_FILE)) {
      let users = JSON.parse(fs.readFileSync(ADMIN_USERS_FILE, "utf-8"));
      users = users.filter((u) => String(u.userId) !== uId);
      fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    }
  } catch {}
  return true;
}

// --------------------------------------------------------------------------
// 5. ADMIN KEYS (Maxfiy kalit so'zlar)
// --------------------------------------------------------------------------
export async function getAdminKeys() {
  const defaultKey = process.env.ADMIN_SECRET ? process.env.ADMIN_SECRET.toLowerCase().trim() : "";

  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT key, label, created_at as "createdAt"
        FROM admin_keys
        ORDER BY created_at DESC;
      `;
      if (rows && rows.length > 0) return rows;
    } catch (err) {
      console.error("[DB]: getAdminKeys DB xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(ADMIN_KEYS_FILE)) {
      const keys = JSON.parse(fs.readFileSync(ADMIN_KEYS_FILE, "utf-8"));
      if (Array.isArray(keys) && keys.length > 0) return keys;
    }
  } catch {}

  return [{ key: defaultKey, label: "Asosiy kalit so'z", createdAt: new Date().toISOString() }];
}

export async function addAdminKey(key, label = "") {
  const cleanKey = String(key || "").toLowerCase().trim();
  if (!cleanKey) return null;
  const keyLabel = label?.trim() || "Admin kaliti";
  const now = new Date().toISOString();

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO admin_keys (key, label, created_at)
        VALUES (${cleanKey}, ${keyLabel}, NOW())
        ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;
      `;
    } catch (err) {
      console.error("[DB]: addAdminKey DB xatosi:", err.message);
    }
  }

  try {
    let keys = [];
    if (fs.existsSync(ADMIN_KEYS_FILE)) {
      keys = JSON.parse(fs.readFileSync(ADMIN_KEYS_FILE, "utf-8"));
    }
    if (!keys.some((k) => k.key.toLowerCase() === cleanKey)) {
      keys.unshift({ key: cleanKey, label: keyLabel, createdAt: now });
      fs.writeFileSync(ADMIN_KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
    }
  } catch {}

  return { key: cleanKey, label: keyLabel, createdAt: now };
}

export async function deleteAdminKey(key) {
  const cleanKey = String(key || "").toLowerCase().trim();
  if (sql) {
    await initDatabase();
    try {
      await sql`
        DELETE FROM admin_keys
        WHERE LOWER(key) = ${cleanKey};
      `;
    } catch (err) {
      console.error("[DB]: deleteAdminKey DB xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(ADMIN_KEYS_FILE)) {
      let keys = JSON.parse(fs.readFileSync(ADMIN_KEYS_FILE, "utf-8"));
      keys = keys.filter((k) => k.key.toLowerCase() !== cleanKey);
      fs.writeFileSync(ADMIN_KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
    }
  } catch {}
  return true;
}

export async function isValidAdminKey(enteredKey) {
  if (!enteredKey) return false;
  const clean = String(enteredKey).toLowerCase().trim();
  const keys = await getAdminKeys();
  const defaultSecret = process.env.ADMIN_SECRET ? process.env.ADMIN_SECRET.toLowerCase().trim() : "";
  return keys.some((k) => k.key.toLowerCase().trim() === clean) || (defaultSecret && clean === defaultSecret);
}

// --------------------------------------------------------------------------
// 6. TELEGRAM GROUPS & CHANNELS (Bot qo'shilgan guruhlar va kanallar)
// --------------------------------------------------------------------------
export async function getTelegramGroups() {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`
        SELECT 
          chat_id as "chatId",
          title,
          type,
          username,
          is_target as "isTarget",
          created_at as "createdAt",
          last_active_at as "lastActiveAt"
        FROM telegram_groups
        ORDER BY last_active_at DESC;
      `;
      return rows;
    } catch (err) {
      console.error("[DB]: getTelegramGroups DB xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(TELEGRAM_GROUPS_FILE)) {
      return JSON.parse(fs.readFileSync(TELEGRAM_GROUPS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

export async function saveTelegramGroup({ chatId, title, type, username, isTarget }) {
  const cId = String(chatId);
  const cTitle = title || (type === "channel" ? "Kanal" : "Guruh");
  const cType = type || "group";
  const uName = username ? `@${String(username).replace(/^@/, "")}` : "";
  const now = new Date().toISOString();

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO telegram_groups (
          chat_id, title, type, username, is_target, created_at, last_active_at
        ) VALUES (
          ${cId}, ${cTitle}, ${cType}, ${uName}, ${Boolean(isTarget)}, NOW(), NOW()
        )
        ON CONFLICT (chat_id) DO UPDATE SET
          title = EXCLUDED.title,
          type = EXCLUDED.type,
          username = EXCLUDED.username,
          is_target = CASE WHEN ${isTarget !== undefined} THEN ${Boolean(isTarget)} ELSE telegram_groups.is_target END,
          last_active_at = NOW();
      `;
    } catch (err) {
      console.error("[DB]: saveTelegramGroup DB xatosi:", err.message);
    }
  }

  try {
    let groups = [];
    if (fs.existsSync(TELEGRAM_GROUPS_FILE)) {
      groups = JSON.parse(fs.readFileSync(TELEGRAM_GROUPS_FILE, "utf-8"));
    }
    const idx = groups.findIndex((g) => String(g.chatId) === cId);
    if (idx >= 0) {
      groups[idx] = {
        ...groups[idx],
        title: cTitle,
        type: cType,
        username: uName,
        isTarget: isTarget !== undefined ? Boolean(isTarget) : groups[idx].isTarget,
        lastActiveAt: now,
      };
    } else {
      groups.unshift({
        chatId: cId,
        title: cTitle,
        type: cType,
        username: uName,
        isTarget: Boolean(isTarget),
        createdAt: now,
        lastActiveAt: now,
      });
    }
    fs.writeFileSync(TELEGRAM_GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB]: saveTelegramGroup fayl xatosi:", err.message);
  }

  return { chatId: cId, title: cTitle, type: cType };
}

export async function deleteTelegramGroup(chatId) {
  const cId = String(chatId);
  if (sql) {
    await initDatabase();
    try {
      await sql`
        DELETE FROM telegram_groups
        WHERE chat_id = ${cId};
      `;
    } catch (err) {
      console.error("[DB]: deleteTelegramGroup DB xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(TELEGRAM_GROUPS_FILE)) {
      let groups = JSON.parse(fs.readFileSync(TELEGRAM_GROUPS_FILE, "utf-8"));
      groups = groups.filter((g) => String(g.chatId) !== cId);
      fs.writeFileSync(TELEGRAM_GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8");
    }
  } catch {}
  return true;
}

export async function setTargetTelegramGroup(chatId) {
  const cId = String(chatId);
  if (sql) {
    await initDatabase();
    try {
      await sql`
        UPDATE telegram_groups
        SET is_target = (chat_id = ${cId});
      `;
    } catch (err) {
      console.error("[DB]: setTargetTelegramGroup DB xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(TELEGRAM_GROUPS_FILE)) {
      const groups = JSON.parse(fs.readFileSync(TELEGRAM_GROUPS_FILE, "utf-8"));
      groups.forEach((g) => {
        g.isTarget = String(g.chatId) === cId;
      });
      fs.writeFileSync(TELEGRAM_GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8");
    }
  } catch {}
  return true;
}

// --------------------------------------------------------------------------
// 7. HERO BANNERS (Asosiy sahifa bannyerlari)
// --------------------------------------------------------------------------
const BANNERS_FILE = path.join(__dirname, "banners.json");

export async function getBanners() {
  const now = Date.now();
  if (bannersCache && (now - bannersCacheTime < CACHE_TTL_MS)) {
    return bannersCache;
  }

  let banners = [];
  if (sql) {
    try {
      const rows = await sql`
        SELECT 
          id, 
          src, 
          alt, 
          title, 
          subtitle, 
          eyebrow, 
          button_text as "buttonText",
          position,
          created_at
        FROM hero_banners
        ORDER BY position ASC, created_at ASC;
      `;
      banners = rows || [];
    } catch (err) {
      console.error("[DB]: getBanners xatosi:", err.message);
      if (err.message && err.message.includes("does not exist")) {
        await initDatabase();
      }
    }
  }

  if (!banners.length) {
    try {
      if (fs.existsSync(BANNERS_FILE)) {
        banners = JSON.parse(fs.readFileSync(BANNERS_FILE, "utf-8"));
      }
    } catch {}
  }

  bannersCache = banners;
  bannersCacheTime = Date.now();
  return banners;
}

export async function createBanner(bannerData) {
  const id = bannerData.id || `banner-${Date.now()}`;
  let src = bannerData.src || "";

  // Agar rasm base64 bo'lsa, uni faylga va DB ga saqlash
  if (bannerData.imageBase64) {
    const ext = bannerData.imageType?.includes("png") ? ".png" : ".jpg";
    const fileName = `banner-${Date.now()}${ext}`;
    const cleanBase64 = bannerData.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    const landingDir = path.join(__dirname, "public", "image-landing");
    if (!fs.existsSync(landingDir)) fs.mkdirSync(landingDir, { recursive: true });
    fs.writeFileSync(path.join(landingDir, fileName), buffer);
    src = `/image-landing/${fileName}`;

    if (sql) {
      await saveImage(fileName, cleanBase64, bannerData.imageType || "image/jpeg");
    }
  }

  const newBanner = {
    id,
    src: src || brandConfig.hero?.banner || "/image-landing/banner-1.jpg",
    alt: bannerData.alt || brandConfig.brandName,
    title: bannerData.title || brandConfig.hero?.title || "DAILY WINDS FOR COLORS",
    subtitle: bannerData.subtitle || brandConfig.hero?.subtitle || "Zamonaviy bichim va yuqori sifatli matolar.",
    eyebrow: bannerData.eyebrow || brandConfig.hero?.eyebrow || `${brandConfig.brandName} • COLLECTION`,
    buttonText: bannerData.buttonText || brandConfig.hero?.buttonText || "TO'PLAMNI KO'RISH",
    position: Number(bannerData.position) || 0,
    created_at: new Date().toISOString(),
  };

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO hero_banners (id, src, alt, title, subtitle, eyebrow, button_text, position)
        VALUES (
          ${newBanner.id}, 
          ${newBanner.src}, 
          ${newBanner.alt}, 
          ${newBanner.title}, 
          ${newBanner.subtitle}, 
          ${newBanner.eyebrow}, 
          ${newBanner.buttonText},
          ${newBanner.position}
        )
        ON CONFLICT (id) DO UPDATE SET
          src = EXCLUDED.src,
          alt = EXCLUDED.alt,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          eyebrow = EXCLUDED.eyebrow,
          button_text = EXCLUDED.button_text,
          position = EXCLUDED.position;
      `;
    } catch (err) {
      console.error("[DB]: createBanner SQL xatosi:", err.message);
    }
  }

  try {
    let list = [];
    if (fs.existsSync(BANNERS_FILE)) {
      list = JSON.parse(fs.readFileSync(BANNERS_FILE, "utf-8"));
    }
    const idx = list.findIndex((b) => b.id === id);
    if (idx >= 0) {
      list[idx] = newBanner;
    } else {
      list.push(newBanner);
    }
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {}

  invalidateBannersCache();
  return newBanner;
}

export async function deleteBanner(id) {
  invalidateBannersCache();
  if (sql) {
    await initDatabase();
    try {
      await sql`DELETE FROM hero_banners WHERE id = ${id};`;
    } catch (err) {
      console.error("[DB]: deleteBanner SQL xatosi:", err.message);
    }
  }

  try {
    if (fs.existsSync(BANNERS_FILE)) {
      let list = JSON.parse(fs.readFileSync(BANNERS_FILE, "utf-8"));
      list = list.filter((b) => b.id !== id);
      fs.writeFileSync(BANNERS_FILE, JSON.stringify(list, null, 2), "utf-8");
    }
  } catch {}

  return true;
}

// --------------------------------------------------------------------------
// 7. CONTACTS & SITE SETTINGS (ALOQA VA MA'LUMOTLAR)
// --------------------------------------------------------------------------
const CONTACTS_FILE = path.join(__dirname, "contacts.json");
const DEFAULT_CONTACTS = {
  phone: brandConfig.contacts?.phone || "+998 90 123 45 67",
  telegram: brandConfig.contacts?.telegram || "@brand",
  telegramUrl: brandConfig.contacts?.telegramUrl || "https://t.me/brand",
  instagram: brandConfig.contacts?.instagram || "@brand",
  instagramUrl: brandConfig.contacts?.instagramUrl || "https://instagram.com/brand",
  address: brandConfig.contacts?.address || "Toshkent shahri, O'zbekiston",
  workHours: brandConfig.contacts?.workHours || "Har kuni 09:00 — 21:00",
  email: brandConfig.contacts?.email || "info@brand.uz",
  brandDesc: brandConfig.footer?.description || brandConfig.tagline || "Zamonaviy kiyimlar to'plami.",
};

export async function getContacts() {
  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`SELECT value FROM bot_config WHERE key = 'contacts' LIMIT 1;`;
      if (rows && rows.length > 0 && rows[0].value) {
        return { ...DEFAULT_CONTACTS, ...rows[0].value };
      }
    } catch (err) {
      console.warn("[DB WARNING]: Kontaklar o'qishda xatolik:", err.message);
    }
  }

  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONTACTS_FILE, "utf-8"));
      return { ...DEFAULT_CONTACTS, ...data };
    }
  } catch {}

  return DEFAULT_CONTACTS;
}

export async function setContacts(data) {
  let tgUrl = (data.telegramUrl || "").trim();
  let tgHandle = (data.telegram || "").trim();
  if (tgHandle && !tgUrl) {
    tgUrl = tgHandle.startsWith("http") ? tgHandle : `https://t.me/${tgHandle.replace(/^@/, "")}`;
  }
  if (!tgHandle && tgUrl) {
    tgHandle = tgUrl.replace(/^https?:\/\/t\.me\//, "@");
  }

  let igUrl = (data.instagramUrl || "").trim();
  let igHandle = (data.instagram || "").trim();
  if (igHandle && !igUrl) {
    igUrl = igHandle.startsWith("http") ? igHandle : `https://instagram.com/${igHandle.replace(/^@/, "")}`;
  }
  if (!igHandle && igUrl) {
    igHandle = igUrl.replace(/^https?:\/\/instagram\.com\//, "@").replace(/\/$/, "");
  }

  const merged = {
    phone: data.phone?.trim() || DEFAULT_CONTACTS.phone,
    telegram: tgHandle || DEFAULT_CONTACTS.telegram,
    telegramUrl: tgUrl || DEFAULT_CONTACTS.telegramUrl,
    instagram: igHandle || DEFAULT_CONTACTS.instagram,
    instagramUrl: igUrl || DEFAULT_CONTACTS.instagramUrl,
    address: data.address?.trim() || DEFAULT_CONTACTS.address,
    workHours: data.workHours?.trim() || DEFAULT_CONTACTS.workHours,
    email: data.email?.trim() || DEFAULT_CONTACTS.email,
    brandDesc: data.brandDesc?.trim() || DEFAULT_CONTACTS.brandDesc,
  };

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO bot_config (key, value)
        VALUES ('contacts', ${JSON.stringify(merged)})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `;
    } catch (err) {
      console.warn("[DB WARNING]: Kontaklar yozishda xatolik:", err.message);
    }
  }

  try {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  } catch {}

  return merged;
}

// --------------------------------------------------------------------------
// 8. STORE SETTINGS (BREND SOZLAMALARI: BAZA VA BRAND.CONFIG BIRIKMASI)
// --------------------------------------------------------------------------
const SETTINGS_FILE = path.join(__dirname, "settings.json");

export async function getStoreSettings() {
  let dbSettings = {};

  if (sql) {
    await initDatabase();
    try {
      const rows = await sql`SELECT value FROM bot_config WHERE key = 'store_settings' LIMIT 1;`;
      if (rows && rows.length > 0 && rows[0].value) {
        dbSettings = rows[0].value;
      }
    } catch (err) {
      console.warn("[DB WARNING]: Sozlamalar o'qishda xatolik:", err.message);
    }
  } else {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        dbSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      }
    } catch {}
  }

  // brandConfig ni asos sifatida olib, admin paneldan o'zgartirilgan maydonlarni ustiga qo'shish
  return {
    ...brandConfig,
    ...dbSettings,
    colors: { ...brandConfig.colors, ...(dbSettings.colors || {}) },
    font: { ...brandConfig.font, ...(dbSettings.font || {}) },
    hero: { ...brandConfig.hero, ...(dbSettings.hero || {}) },
    contacts: { ...brandConfig.contacts, ...(dbSettings.contacts || {}) },
    bot: { ...brandConfig.bot, ...(dbSettings.bot || {}) },
    features: { ...brandConfig.features, ...(dbSettings.features || {}) },
  };
}

export async function setStoreSettings(overrides = {}) {
  const current = await getStoreSettings();
  const merged = {
    ...current,
    ...overrides,
    colors: { ...current.colors, ...(overrides.colors || {}) },
    font: { ...current.font, ...(overrides.font || {}) },
    hero: { ...current.hero, ...(overrides.hero || {}) },
    contacts: { ...current.contacts, ...(overrides.contacts || {}) },
    bot: { ...current.bot, ...(overrides.bot || {}) },
    features: { ...current.features, ...(overrides.features || {}) },
  };

  if (sql) {
    await initDatabase();
    try {
      await sql`
        INSERT INTO bot_config (key, value)
        VALUES ('store_settings', ${JSON.stringify(merged)})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `;
    } catch (err) {
      console.warn("[DB WARNING]: Sozlamalar yozishda xatolik:", err.message);
    }
  }

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  } catch {}

  return merged;
}



