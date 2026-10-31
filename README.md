# Universal Kiyim-Kechak Do'koni Shabloni (E-Commerce & Telegram WebApp)

<p align="center">
  <img src="public/brand/logo.svg" width="220" alt="Brand Logo" />
</p>

<p align="center">
  <b>Universal Kiyim-Kechak Shabloni</b> — har qanday kiyim-kechak, moda va to'qimachilik brendlari uchun tayyorlangan, yuqori unumdorlikka ega zamonaviy elektron tijorat platformasi, Telegram WebApp (Mini App), yagona Telegram bot va boshqaruv admin paneli.
</p>

---

## 📌 Loyiha Haqida

Ushbu shablon kiyim-kechak do'konlari uchun standartlashtirilgan bo'lib, yangi mijoz yoki brendga moslashtirish uchun **kodni o'zgartirish talab etilmaydi**. Do'kon nomi, logotipi, ranglar gammasi, shriftlar, bannerlar, kategoriyalar va kontaktlar faqat bitta `brand.config.js` konfiguratsiya fayli orqali boshqariladi.

### Asosiy Afzalliklari:
1. **White-label Arxitektura:** Kodda hech qanday mijozga xos nomlar yoki hardcoded havolalar yo'q.
2. **Yagona Telegram Bot:** Foydalanuvchilar va administratorlar bitta botdan foydalanadi (rollar Telegram ID va baza orqali aniqlanadi).
3. **Forum Topiklar Integratsiyasi:** Telegram ichki guruhida `Buyurtmalar`, `Yetkazilganlar`, `Hisobotlar` va `Tizim` mavzulari (forum topics) orqali to'liq avtomatlashtirilgan buyurtmalar nazorati.
4. **Kunlik Avtomatik Hisobot:** Har kuni soat 22:00 da (Asia/Tashkent) "Hisobotlar" topikiga kunlik tushum, yangi mijozlar va buyurtmalar statistikasi avtomatik yuboriladi.
5. **Mijozlar Bazasi (Loyalty):** Har bir xaridorning buyurtmalari soni, sarflagan summasi va oxirgi faolligi saqlanadi.
6. **Xavfsiz Admin Panel:** JWT sessiya va HTTP-only cookie bilan himoyalangan, parolsiz kirish imkonsiz, birinchi ishga tushishda avtomatik xavfsiz parol generatsiya qilinadi.

---

## 🛠 Texnologiyalar (Stack)

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Motion (`motion/react`), Lucide React.
- **Backend:** Node.js HTTP Server (`server.js`), RESTful API (`api-core.js`), Vercel Serverless Functions (`api/index.js`, `api/cron-daily-report.js`).
- **Ma'lumotlar Bazasi:** Neon Serverless PostgreSQL (`@neondatabase/serverless`), in-memory kesh, mahalliy JSON zaxira rejimi.
- **Bot va Integratsiyalar:** Yagona Telegram Bot API (`bot.js`), Telegram WebApp Mini App SDK, Forum Topics API.
- **Dizayn Tizimi:** CSS Custom Properties (`var(--color-primary)` va h.k.) orqali `brand.config.js` ga 100% bog'langan reaktiv mavzulashtirish.

---

## 📁 Papka Strukturasi

```
├── brand.config.js         # Yagona konfiguratsiya fayli (nom, ranglar, shriftlar, bot, kontaktlar)
├── public/                 # Statik fayllar
│   ├── brand/              # Brend logotipi (logo.svg), favicon va boshlang'ich banner
│   ├── image-landing/      # Vitrina karusel bannerlari
│   ├── images/             # Mahsulot rasmlari va placeholder
│   └── admin.html          # Boshqaruv admin paneli interfeysi
├── src/                    # Frontend React ilovasi
│   ├── App.tsx             # Asosiy do'kon ilovasi va marshrutlash
│   ├── config/             # brandConfig yuklovchi modul
│   ├── components/         # UI komponentlar (Header, Footer, Logo, ProductCard va h.k.)
│   ├── pages/              # Sahifalar (HomeView, CatalogView, CartView, ProductView, ProfileView)
│   ├── hooks/              # Reusable hooklar (useCart, useWishlist, useProfile)
│   └── demoData.ts         # 7 ta neytral demo mahsulot (VITE_DEMO_MODE="true" da)
├── api-core.js             # Barcha backend API marshrutlari va biznes mantiq
├── server.js               # Node.js mustaqil serveri (port 3000)
├── bot.js                  # Yagona Telegram bot (admin menyusi, qadamma-qadam qo'shish, forum)
├── db.js                   # Neon PostgreSQL va JSON zaxira qatlami
├── scripts/
│   ├── init-db.js          # Ma'lumotlar bazasini bir buyruq bilan sozlash
│   └── schema.sql          # SQL sxemasi
├── README.md               # Loyiha tavsifi
├── INSTALL.md              # O'rnatish va ishga tushirish qo'llanmasi
└── CUSTOMIZE.md            # Yangi brendga moslashtirish yo'riqnomasi
```

---

## 🚀 Ishga Tushirish (Qisqa)

Batafsil ko'rsatmalar uchun [INSTALL.md](INSTALL.md) fayliga qarang.

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. Muhit o'zgaruvchilarini sozlash
cp .env.example .env

# 3. Baza jadvallarini yaratish
npm run db:init

# 4. Dasturlash rejimida ishga tushirish (Frontend + Backend + Bot)
npm run dev:all
```

---

## 🎨 Yangi Brendga Moslashtirish

Do'konni yangi brendga moslashtirish uchun faqat:
1. `brand.config.js` faylini oching va brend ma'lumotlarini kiriting.
2. `public/brand/logo.svg` va `public/brand/favicon.svg` fayllarini almashtiring.

Batafsil qo'llanma: [CUSTOMIZE.md](CUSTOMIZE.md).

---

## 📄 Litsenziya

Universal tijorat shabloni. Barcha huquqlar himoyalangan.
