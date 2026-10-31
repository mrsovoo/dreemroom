-- ==============================================================================
-- UNIVERSAL CLOTHING STORE: Baza Sxemasi (PostgreSQL / Neon)
-- ==============================================================================

-- 1. Mahsulotlar jadvali
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

-- 2. Mahsulotlar rasmlari (Base64 Binary Storage)
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mijozlar jadvali (Sodiqlik / Loyalty)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  telegram_id TEXT,
  name TEXT,
  first_order_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Buyurtmalar jadvali
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

-- 5. Tizim sozlamalari (Topiklar, hisobotlar va h.k.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bot konfiguratsiyasi va kontaktlar
CREATE TABLE IF NOT EXISTS bot_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- 7. Admin bot foydalanuvchilari (Adminlar)
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

-- 8. Maxfiy kalit so'zlar
CREATE TABLE IF NOT EXISTS admin_keys (
  key TEXT PRIMARY KEY,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Ulangan guruhlar va kanallar
CREATE TABLE IF NOT EXISTS telegram_groups (
  chat_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  username TEXT,
  is_target BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Asosiy sahifa vitrina bannyerlari (Hero Banners)
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

-- Indekslar (Tezkor qidiruv va filtrlash uchun)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

