# DREEM ROOM

Ayollar uchun sport kiyimlari do'koni. React, TypeScript, Vite, Tailwind CSS v4, Motion va Lucide asosida qurilgan. Rang sxemasi: `#403D4F` va `#FFFFFF`.

## Ishga tushirish

```sh
npm install
npm run dev
```

## Tekshirish

```sh
npx tsc --noEmit
npm run build
npx playwright install --with-deps chromium
npx playwright test
```

## Tuzilma

- `src/App.tsx` — sahifalar (bosh sahifa, katalog) va xarid oqimi.
- `src/data.ts` — mahsulotlar va mavzuiy katalog bo'limlari.
- `src/components/Logo.tsx` — DREEM ROOM logotipi (vektor SVG, rangi CSS `color` orqali boshqariladi).
- `src/components/ProductCard.tsx` — mahsulot kartasi.
- `src/components/Sheet.tsx` — oyna: kompyuterda markazda, telefonda pastdan chiqadi.
- `src/index.css` — rang tizimi va moslashuvchan uslublar.
- `public/favicon.svg` — brauzer belgisi (DR monogrammasi).
- `public/images/` — mahsulot suratlari.
- `tests/storefront.spec.ts` — brauzer testlari (kompyuter va mobil).

## Bo'limlar

Menyu ikkita bandan iborat: **Yangi mavsumiy** va **Katalog**. Bosh sahifada hero, yangi mavsumiy modellar, mavzuiy katalog (top va mayka, sport bra, tashqi kiyim) hamda chaqiriq bloki bor. Telefonda pastki tab menyu: Yangi mavsumiy, Katalog, Savat, Profil. Katalog aynan o'rtada turadi, Savat va Profil o'ng tomonda yonma-yon turadi; bosh sahifaga logo orqali qaytiladi.

## Mahsulot rasmlari

Har bir mahsulot kartasida 3 ta rakurs bo'ladi. Kompyuterda karta ustiga kursorni olib borganda ba'zilari almashadi, mobil yoki klik bilan oldingi va keyingi rakurslar ko'rinadi. Mahsulot oynasida rasmlar tugmalari va nuqtalari orqali tanlanadi.

## Telegram Mini App

Sahifa botning «Launch App» tugmasi orqali ochilganda avtomatik Telegram rejimiga o‘tadi: to‘liq ekranga kengayadi, pastga tortib yopish o‘chadi, Telegram «Orqaga» tugmasi (oyna → katalog → bosh sahifa) va pastdagi asosiy tugma (mahsulotda «Savatga qo‘shish», savatda «Buyurtma berish • summa») ishlaydi, bosilganda yengil tebranish (haptic) beriladi. Telegram safe-area va barqaror balandligi hisobga olinadi. Brauzerda ochilganda oddiy sayt sifatida ishlaydi.

## Namoyish rejimi

Savat va profil brauzer xotirasida (`localStorage`) saqlanadi. Saqlangan ism va telefon raqami buyurtma formasiga avtomatik qo'yiladi. Buyurtma formasi namoyish uchun: to'lov olinmaydi, server yoki SMS xizmati ulanmagan va mahsulot yuborilmaydi.

Inter shrifti Google Fonts orqali, hero slayder suratlari esa Pexels orqali (bepul litsenziya) yuklanadi.
