# DREEM ROOM — Ayollar Kiyimlari Do'koni & Telegram WebApp

<p align="center">
  <img src="public/favicon.svg" width="90" height="90" alt="DREEM ROOM Logo" />
</p>

<p align="center">
  <b>DREEM ROOM</b> — zamonaviy ayollar kiyimlari to'plamini taqdim etuvchi yuqori unumdorlikka ega, to'liq responsiv elektron tijorat platformasi hamda Telegram WebApp (Mini App).
</p>

---

## 📌 Loyiha haqida

Loyiha eng so'nggi zamonaviy veb-texnologiyalar yordamida ishlab chiqilgan bo'lib, xaridorlarga brauzerda ham, Telegram messenjeri ichida ham birdek qulay, tezkor va intuitiv xarid qilish tajribasini taqdim etadi.

Platforma **Vercel Hobby** tarifining Serverless cheklovlariga to'liq moslashtirilgan, **Neon Serverless PostgreSQL** ma'lumotlar bazasi bilan integratsiya qilingan hamda buyurtmalar va mahsulotlarni boshqaruvchi Telegram bot tizimiga ega.

---

## 🚀 Asosiy Imkoniyatlar va Afzalliklar

### 🛍 Xaridorlar uchun (Storefront & UX)
- **0-sekundli Tezkor Yuklanish**: Brauzer `localStorage` keshidan foydalanib ma'lumotlar zudlik bilan ochiladi, fonda backend API bilan yangilanadi (in-memory 6 soniyali kesh va Edge Cache s-maxage).
- **Avtomatik Narx Tizimi**: Barcha narxlar o'zbek so'mida aks etadi (`250 000 so'm`). Telegram bot yoki admin orqali kiritilgan ixcham qiymatlar (masalan `250` yoki `180`) avtomatik ravishda `1000` ga ko'paytirilib, to'g'ri so'm formatida ko'rsatiladi.
- **Moslashuvchan Mahsulot Modali**:
  - Kompyuterda nafis markaziy ikki ustunli dialog (chapda galereya, o'ngda xarid parametrlari).
  - Mobil qurilmalarda silliq pastdan chiquvchi Bottom Sheet.
  - Har doim pastda qadalib turuvchi (*bottom sticky*) qulay **"SAVATGA QO'SHISH"** tugmasi.
- **O'lcham Tanlash (XS, S, M, L, XL)**:
  - Har bir kiyim uchun o'lcham tugmalari.
  - **"O'lcham jadvali"** interaktiv tavsiya bloki (bo'y va vaznga mos tavsiyalar: *masalan, XS — 150–158 sm, 40–48 kg*).
- **Ko'p Rakursli Suratlar Galereyasi**:
  - Mahsulot kartochkalarida suratlarni almashtirish (Desktopda hover/klik, mobil qurilmalarda qulay navigatsiya).
  - Mahsulot oynasida vertikal miniatyuralar, pagination ko'rsatkichlari va ulashish (*Share*) tugmasi.
- **Savat va Sevimlilar (Wishlist)**:
  - O'lcham bo'yicha mahsulotlarni guruhlash, sonini oshirish/kamaytirish.
  - Sevimli tovarlarni bir klikda saqlash va boshqarish.
- **Telegram Mini App Integratsiyasi**:
  - Telegram ichida to'liq ekranga moslashish, *safe-area* va tebranishlar (*Telegram Haptic Feedback*).
  - Telegram orqali bitta klikda buyurtma rasmiylashtirish.

### ⚙️ Boshqaruv va Administrator Tizimi (Admin & Bots)
- **Zamonaviy Admin Panel (`/admin` yoki `admin.html`)**:
  - **Boshqaruv (Dashboard)**: Buyurtmalar statistikasi, umumiy tushum, faol tovarlar monitoringi.
  - **Mahsulotlar Katalogi**: Barcha tovarlar ro'yxati, narxlarni ko'rish, qidirish va bazani tozalash (*Reset*).
  - **Bannerlar Slayderi**: Bosh sahifadagi promo slayderlarni boshqarish (yangi rasm, sarlavha, havola qo'shish yoki o'chirish).
  - **Aloqa & Manzil Sozlamalari**: Telefon raqam, Telegram kanal, Instagram sahifa, do'kon manzili, ish vaqti va brend tavsifini to'g'ridan-to'g'ri o'zgartirish (sayt footerida darhol yangilanadi).
  - **Foydalanuvchilar & Xavfsizlik**: Admin huquqlari va maxfiy ruxsat kalitlarini boshqarish.
- **Telegram Admin Bot (`@dreemroom_adm_bot`)**:
  - Do'kon egasi uchun to'g'ridan-to'g'ri Telegram orqali yangi tovarlar va fotosuratlarni yuklash.
- **Buyurtma Xabarnomalari Boti**:
  - Yangi buyurtma kelib tushganda mijoz ismi, telefon raqami, manzili, tovarlar ro'yxati va summasini Telegram guruh yoki adminga yuboradi.

---

## 🛠 Texnologik Stek

| Qatlam | Texnologiyalar |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Motion (Framer Motion), Lucide Icons |
| **Bundler** | Vite Single-File Bundle (Yuqori tezlik va optimallashtirilgan assetlar) |
| **Backend & API** | Node.js Serverless Function (Vercel yagona router `api/index.js`), Express/HTTP `server.js` |
| **Ma'lumotlar Bazasi** | Neon Serverless PostgreSQL (`db.js`, Pool Connection & Resilience Fallbacks) |
| **Telegram API** | Telegraf / Telegram Bot API (Mini App SDK, WebApp Haptics) |
| **Dizayn & Stil** | Maxsus zamonaviy palitra: `#403D4F` (Velvorn Slate), `#18181b` (Onyx Black), `#FFFFFF` |

---

## 📁 Loyiha Tuzilmasi

```text
├── api/
│   └── index.js              # Vercel Serverless Function (Yagona birlashtirilgan router)
├── public/
│   ├── favicon.svg           # Brauzer nishonchasi
│   ├── admin.html            # Administrator boshqaruv paneli
│   ├── image-landing/        # Hero promo slayder rasmlari
│   └── images/               # Mahsulotlar uchun namunaviy suratlar
├── src/
│   ├── components/
│   │   ├── Logo.tsx          # Yangi vektorli geometrik DREEM ROOM logotipi
│   │   ├── ProductCard.tsx   # Tovar kartochkasi (ko'p suratli slider, narx)
│   │   ├── ProductGallery.tsx# Modal ichidagi galereya va miniatyuralar
│   │   └── Sheet.tsx         # Responsiv modal (Desktop markaz / Mobil bottom sheet)
│   ├── App.tsx               # Asosiy do'kon ilovasi, routing, footer watermark
│   ├── data.ts               # Turlar, yordamchi funksiyalar va doimiy ma'lumotlar
│   ├── index.css             # Asosiy dizayn qoidalari, animatsiyalar va media so'rovlar
│   └── main.tsx              # React kirish nuqtasi
├── admin.html                # Asosiy Administrator paneli
├── bot.js                    # Mijoz buyurtmalarini qabul qiluvchi Telegram bot
├── admin-bot.js              # Admin uchun tovar yuklovchi Telegram bot
├── db.js                     # Neon PostgreSQL bilan ishlash qatlami (CRUD amallari)
├── server.js                 # Standart Node.js HTTP server (Local yoki Docker/Railway uchun)
├── vercel.json               # Vercel deploy, kesh va rewrites konfiguratsiyasi
├── package.json              # Bog'liqliklar va buyruqlar
└── README.md                 # Loyiha hujjatlari
```

---

## ⚙️ Sozlash va Ishga Tushirish

### 1. Repozitoriyani klonlash
```sh
git clone https://github.com/mrsovoo/dreemroom.git
cd dreemroom
```

### 2. Bog'liqliklarni o'rnatish
```sh
npm install
```

### 3. Muhit o'zgaruvchilari (`.env`)
Loyihaning ildiz papkasida `.env` faylini yarating va quyidagi parametrlarni kiriting:

```env
# Neon PostgreSQL ma'lumotlar bazasi URL
DATABASE_URL=postgresql://user:password@ep-sample-pool.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Telegram Bot tokenlari
BOT_TOKEN=123456789:AAExampleBotTokenForOrders
ADMIN_BOT_TOKEN=123456789:AAExampleBotTokenForAdmin

# Server porti (ixtiyoriy, standart 3000)
PORT=3000
```

### 4. Dasturchi rejimida ishga tushirish (Local)
Frontendni Vite orqali ishga tushirish:
```sh
npm run dev
```

Mahalliy to'liq serverni (API + Static) ishga tushirish:
```sh
node server.js
```

Telegram botlarini alohida ishga tushirish (kerak bo'lsa):
```sh
node admin-bot.js   # Tovar qo'shuvchi bot
node bot.js         # Buyurtma qabul qiluvchi bot
```

---

## 🌐 Deploy Qilish (Vercel)

Loyiha **Vercel Hobby** tarifiga 100% moslashtirilgan. Vercel Hobby tarifida 12 tadan ortiq Serverless Funksiyaga ruxsat berilmaganligi sababli, barcha API so'rovlari `api/index.js` yagona routeriga birlashtirilgan.

1. Repozitoriyani Vercel bilan ulang: [https://vercel.com](https://vercel.com)
2. `Settings -> Environment Variables` bo'limida quyidagilarni kiriting:
   - `DATABASE_URL` (Neon PostgreSQL ulanish manzili)
   - `BOT_TOKEN`
   - `ADMIN_BOT_TOKEN`
3. Vercel avtomatik ravishda `npm run build` buyrug'ini bajaradi va saytni `dist/` katalogidan bir necha soniyada ishga tushiradi.
4. Admin paneliga kirish uchun: `https://sizning-domen.vercel.app/admin` manzilidan foydalaning.

---

## 📡 Asosiy API Endpointlar

| Usul | Yo'nalish | Tavsif |
|---|---|---|
| `GET` | `/api/products` | Barcha mahsulotlar ro'yxatini olish (keshlangan) |
| `POST` | `/api/products` | Yangi mahsulot qo'shish |
| `PUT` | `/api/products/:id` | Mahsulot ma'lumotlarini yangilash |
| `DELETE` | `/api/products/:id` | Mahsulotni o'chirish |
| `GET` | `/api/banners` | Bosh sahifa hero bannerlari |
| `POST` | `/api/banners` | Yangi promo banner qo'shish |
| `DELETE` | `/api/banners/:id`| Bannerni o'chirish |
| `GET` | `/api/contacts` | Sayt aloqa va manzil ma'lumotlari |
| `POST` | `/api/contacts` | Aloqa ma'lumotlarini yangilash |
| `POST` | `/api/orders` | Yangi xarid buyurtmasini yaratish va botga yuborish |
| `POST` | `/api/admin/clear-all` | Barcha tovarlarni tozalash |

---

## 🎨 Brend va Logotip

Loyiha uchun yangi vektorli (SVG) **DREEM ROOM** logotipi ishlab chiqilgan va loyihaning barcha asosiy nuqtalariga o'rnatilgan:
- **Header Navbar**: [`src/components/Logo.tsx`](file:///src/components/Logo.tsx) orqali toza SVG.
- **Footer Watermark**: Saytning pastki qismida orqa fonda nafis, shaffof suv belgisi sifatida.
- **Admin Panel**: [`admin.html`](file:///admin.html) yon paneli tepasida brend logotipi.

---

## 📄 Litsenziya

Ushbu loyiha mualliflik huquqi bilan himoyalangan. DREEM ROOM brendi uchun maxsus ishlab chiqilgan.
