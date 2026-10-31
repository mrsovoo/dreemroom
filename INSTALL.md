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

## 7-Qadam: Serverga (Deploy) Joylash

### Vercel (Frontend & Serverless API):
1. Vercel dashboardiga loyihani import qiling.
2. Environment Variables bo'limida `.env` dagi o'zgaruvchilarni (`DATABASE_URL`, `BOT_TOKEN`, `WEB_APP_URL` va h.k.) kiriting.
3. Deploy tugmasini bosing.
4. Kunlik hisobot uchun `vercel.json` faylidagi cron avtomatik ishlaydi.

### Railway yoki VPS (Node.js Server & Bot):
1. Repozitoriyni ulang.
2. Start Command: `npm start` (server.js avtomatik tarzda bot.js ni ham fonda ishga tushiradi).
3. Environment variables larni sozlang.

Muvaffaqiyatli ishga tushirildi! Savollar yoki moslashtirish bo'yicha [CUSTOMIZE.md](CUSTOMIZE.md) qo'llanmasiga qarang.
