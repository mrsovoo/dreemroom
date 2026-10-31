# Universal Kiyim-Kechak Do'koni: O'rnatish va Ishga Tushirish Qo'llanmasi (INSTALL.md)

Ushbu qo'llanma loyihani yangi serverda, lokal kompyuterda yoki bulutli xizmatlarda (Vercel, Railway, Render) noldan boshlab to'liq ishga tushirish bo'yicha qadamma-qadam yo'riqnomadir.

---

## 📋 Talablar (Prerequisites)

- **Node.js:** Versiyasi `v18.0.0` yoki undan yuqori (tavsiya: `v20+` yoki `v22+`).
- **npm:** Versiyasi `9+` yoki `10+`.
- **PostgreSQL (Neon.tech):** Bulutli Serverless PostgreSQL ma'lumotlar bazasi (https://neon.tech bepul tarif beradi).
- **Telegram Bot:** @BotFather orqali yaratilgan bot tokeni.

---

## 1-Qadam: Repozitoriyni Klonlash va Papkaga Kirish

```bash
git clone <repo-url> clothing-store
cd clothing-store
```

---

## 2-Qadam: Bog'liqliklarni (Dependencies) O'rnatish

```bash
npm install
```

Barcha frontend va backend paketlari avtomatik o'rnatiladi.

---

## 3-Qadam: Muhit O'zgaruvchilarini (.env) Sozlash

`.env.example` faylidan nusxa oling:

```bash
cp .env.example .env
```

`.env` faylini ochib, quyidagi asosiy o'zgaruvchilarni kiriting:

```env
# 1. Neon.tech dan olingan PostgreSQL havolasi
DATABASE_URL=postgresql://user:password@ep-sample-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require

# 2. @BotFather dan olingan yagona Telegram bot tokeni
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
BOT_USERNAME=my_clothing_shop_bot
OWNER_TELEGRAM_ID=123456789

# 3. Buyurtmalar tushadigan Telegram guruh yoki kanal ID (-100...)
TARGET_CHAT_ID=-1001234567890

# 4. Do'kon manzili (Vercel, Railway yoki localhost)
WEB_APP_URL=http://localhost:5173

# 5. Admin panel kirish ma'lumotlari
ADMIN_USERNAME=admin
ADMIN_PASSWORD=
PORT=3000
```

> **Eslatma:** Agar `ADMIN_PASSWORD` ni bo'sh qoldirsangiz, tizim avtomatik xavfsiz tasodifiy parol yaratib konsolga chiqaradi va `.auth_credentials.json` faylida saqlaydi.

---

## 4-Qadam: Ma'lumotlar Bazasini Initsializatsiya Qilish (init-db)

Barcha kerakli PostgreSQL jadvallari va indekslarini bir buyruq bilan yaratish uchun:

```bash
npm run db:init
```

Ushbu skript quyidagilarni bajaradi:
1. `products`, `orders`, `customers`, `settings`, `admin_users`, `hero_banners`, `product_images` jadvallarini yaratadi.
2. Tezkor qidiruv indekslarini o'rnatadi.
3. Agar ko'rsatilgan bo'lsa, `OWNER_TELEGRAM_ID` egasini admin jadvaliga kiritadi.
4. Admin panel uchun login va parolni konsolga chiqaradi.

---

## 5-Qadam: Telegram Botni Guruhga Ulash va Topiklarni Sozlash

1. Yaratilgan botingizni do'kon xodimlari ichki guruhiga qo'shing va unga **Administrator** (jumladan **"Manage Topics"**) huquqini bering.
2. Guruh sozlamalarida **"Topics" (Mavzular / Forum)** rejimini yoqing.
3. Botga shaxsiy xabarda yoki guruhda `/setupgroup` buyrug'ini yuboring (faqat `OWNER_TELEGRAM_ID` yubora oladi).
4. Bot avtomatik 4 ta topikni ochadi:
   - 🛍 **Buyurtmalar** (yangi tushgan buyurtmalar uchun)
   - 🚚 **Yetkazilganlar** (yetkazib berilgan buyurtmalar o'tadigan joy)
   - 📊 **Hisobotlar** (har kuni 22:00 dagi avtomatik hisobotlar)
   - ⚙️ **Tizim** (tizim bildirishnomalari)

---

## 6-Qadam: Loyihani Ishga Tushirish

### A. Lokal dasturlash rejimi (Frontend + Backend + Bot bir vaqtda):
```bash
npm run dev:all
```
- Vitrina (Frontend): `http://localhost:5173`
- Server (Backend API): `http://localhost:3000`
- Admin Panel: `http://localhost:3000/admin`
- Telegram Bot: Polling rejimida faol ishlaydi.

### B. Faqat Frontendni ishga tushirish:
```bash
npm run dev
```

### C. Faqat Backend serverni ishga tushirish:
```bash
npm start
```

### D. Production Build (Ishlab chiqarishga tayyorlash):
```bash
npm run build
```

---

## 7-Qadam: Railway yoki Bulutli Serverga (Deploy) Joylash

Loyiha **Railway** da bitta yagona Node.js jarayonida (`server.js`) to'liq ishlash uchun optimallashtirilgan:

### Railway da Deploy Qilish:
1. **Repozitoriyni ulash:** Railway dashboardida `New Project` -> `Deploy from GitHub repo` orqali ushbu omborni tanlang.
2. **Build & Start sozlamalari:**
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start` (yoki `node server.js`)
   - **Railway Healthcheck Path:** `/health` (sozlamalarda `Healthcheck Path: /health` deb belgilang).
3. **Environment Variables:**
   - `DATABASE_URL` (Neon PostgreSQL)
   - `BOT_TOKEN` (Telegram Bot)
   - `TARGET_CHAT_ID` (Guruh/kanal ID)
   - `OWNER_TELEGRAM_ID` (Egasi ID)
   - `WEB_APP_URL` (`https://${{RAILWAY_PUBLIC_DOMAIN}}` yoki o'z domeningiz)
   - `PORT` (Railway avtomatik tarzda dinamik port beradi va `server.js` uni to'g'ridan-to'g'ri o'qiydi).
4. **Bitta Jarayonli Arxitektura Afzalliklari:**
   - Statik sayt, REST API va Telegram Bot bitta Node.js jarayoni (PID) ichida ishlaydi.
   - Long polling vaqtidagi `409 Conflict` (ikki nusxa to'qnashuvi) avtomatik `deleteWebhook`, yagona instansiya nazorati va `SIGTERM` da darhol so'rovni uzuvchi `AbortController` orqali to'liq bartaraf etilgan.

Muvaffaqiyatli ishga tushirildi! Savollar yoki moslashtirish bo'yicha [CUSTOMIZE.md](CUSTOMIZE.md) qo'llanmasiga qarang.

