#!/usr/bin/env node

/**
 * Universal Kiyim-Kechak Do'koni: Ma'lumotlar bazasini initsializatsiya qilish skripti
 *
 * Ishga tushirish:
 *   node scripts/init-db.js
 *   yoki npm run db:init
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

// 1. Muhit o'zgaruvchilarini yuklash
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(ROOT_DIR, ".env"));
  }
} catch {
  // .env mavjud bo'lmasa, jarayon davom etadi
}

const DATABASE_URL = process.env.DATABASE_URL?.trim();

async function main() {
  console.log("\n" + "=".repeat(64));
  console.log("🚀 BAZANI INITSIALIZATSIYA QILISH (Universal Clothing Store DB Init)");
  console.log("=".repeat(64));

  if (!DATABASE_URL) {
    console.warn("\n⚠️  [DIQQAT]: DATABASE_URL muhit o'zgaruvchisi topilmadi!");
    console.warn("ℹ️  Tizim lokal JSON rejimida ishlaydi (products.json, orders.json).");
    console.warn("ℹ️  PostgreSQL bazasini ulash uchun .env faylida DATABASE_URL ni belgilang.\n");
    generateAdminCredentials();
    return;
  }

  console.log("⏳ Neon Serverless PostgreSQL ga ulanilmoqda...");
  const sql = neon(DATABASE_URL);

  try {
    // 1. Jadvallarni yaratish
    console.log("⏳ Jadvallar va indekslar tekshirilmoqda/yaratilmoqda...");

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
      CREATE TABLE IF NOT EXISTS product_images (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL DEFAULT 'image/jpeg',
        data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

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

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer JSONB NOT NULL,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        total INTEGER NOT NULL,
        status TEXT DEFAULT 'Yangi',
        payment_method TEXT DEFAULT 'Naqd / Karta',
        customer_id TEXT,
        telegram_message_id INTEGER,
        telegram_chat_id TEXT,
        telegram_topic_id INTEGER,
        updated_by TEXT,
        updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bot_config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );
    `;

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

    await sql`
      CREATE TABLE IF NOT EXISTS admin_keys (
        key TEXT PRIMARY KEY,
        label TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

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

    // Ustunlarni yangilash (Xavfsiz migratsiyalar)
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;`.catch(() => {});
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_topic_id INTEGER;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_by TEXT;`.catch(() => {});
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`.catch(() => {});

    // Indekslar
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`.catch(() => {});

    // Owner ID kiritilgan bo'lsa, uni avtomatik admin_users jadvaliga faol admin sifatida kiritish
    const ownerId = process.env.OWNER_TELEGRAM_ID?.trim();
    if (ownerId) {
      await sql`
        INSERT INTO admin_users (user_id, full_name, used_key, status, created_at)
        VALUES (${ownerId}, 'Do''kon Egasi (Owner)', 'owner-setup', 'active', NOW())
        ON CONFLICT (user_id) DO UPDATE SET status = 'active';
      `;
      console.log(`✅ [OWNER]: ${ownerId} Telegram ID egasi adminlar jadvaliga qo'shildi.`);
    }

    console.log("✅ Barcha PostgreSQL jadvallari muvaffaqiyatli tayyorlandi!\n");
  } catch (err) {
    console.error("❌ [DB XATOSI]:", err.message);
  }

  generateAdminCredentials();
}

function generateAdminCredentials() {
  const credFile = path.join(ROOT_DIR, ".auth_credentials.json");
  const username = (process.env.ADMIN_USERNAME || "admin").trim();
  let password = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD).trim() : "";
  let isGenerated = false;

  if (!password) {
    if (fs.existsSync(credFile)) {
      try {
        const saved = JSON.parse(fs.readFileSync(credFile, "utf-8"));
        if (saved?.password) {
          password = saved.password;
        }
      } catch {}
    }

    if (!password) {
      // Yangi xavfsiz tasodifiy parol generatsiya qilish
      password = crypto.randomBytes(8).toString("base64").replace(/[+/=]/g, "A").slice(0, 10) + "!9";
      isGenerated = true;
      const jwtSecret = process.env.JWT_SECRET?.trim() || crypto.randomBytes(32).toString("hex");

      try {
        fs.writeFileSync(credFile, JSON.stringify({ password, jwtSecret }, null, 2), "utf-8");
      } catch (err) {
        console.warn("⚠️  .auth_credentials.json saqlashda ogohlantirish:", err.message);
      }
    }
  }

  console.log("-".repeat(64));
  console.log("🔐 ADMIN PANEL KIRISH MA'LUMOTLARI:");
  console.log(`👤 Login:  ${username}`);
  console.log(`🔑 Parol:  ${password}`);
  if (isGenerated) {
    console.log("ℹ️  Ushbu tasodifiy parol .auth_credentials.json faylida saqlandi.");
  }
  console.log("🌐 Kirish manzili: http://localhost:3000/admin (yoki sizning domeningiz/admin)");
  console.log("-".repeat(64));
  console.log("🎉 Tayyor! Endi 'npm run dev:all' yoki 'npm start' buyrug'ini bering.\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

