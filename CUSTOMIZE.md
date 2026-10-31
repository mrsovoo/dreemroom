# 🛍️ Yangi Brend Uchun Do'konni Sozlash Qo'llanmasi (CUSTOMIZE.md)

Ushbu loyiha **kiyim-kechak brendlari va internet do'konlari uchun yagona universal shablon (White-label Template)** sifatida yaratilgan. Yangi mijoz yoki yangi kiyim do'koni uchun tizimni ishga tushirishda **dastur kodiga umuman tegish shart emas!**

Barcha o'zgarishlar faqat **2 ta joyda** amalga oshiriladi:
1. `brand.config.js` — barcha sozlamalar, matnlar, toifalar, ranglar va bot parametrlari.
2. `public/brand/` — brend logotipi, brauzer ikonkachasi va bosh sahifa banneri.

---

## 🚀 1. Tezkor Boshlash (3 Qadam)

### 1-qadam: Rasmlarni joylashtiring
Do'konning logotipi va bannerini `public/brand/` papkasiga yuklang:
* `public/brand/logo.svg` (yoki `.png`) — Asosiy logotip.
* `public/brand/favicon.svg` (yoki `.ico`, `.png`) — Brauzer tabidagi ikonka.
* `public/brand/banner.jpg` (yoki `.png`) — Bosh sahifadagi asosiy katta banner (1920x1080 yoki 1200x800 tavsiya etiladi).

### 2-qadam: `brand.config.js` faylini to'ldiring
Loyiha ildizidagi `brand.config.js` faylini oching va brend ma'lumotlarini kiriting.

### 3-qadam: Saytni yig'ing va ishga tushiring
```bash
# Frontendni yig'ish (build)
npm run build

# Server va Botni ishga tushirish
npm start
```

---

## 🎨 2. Ranglar va Dizaynni Tanlash (Maslahatlar)

`brand.config.js` ichidagi `colors` bo'limi butun sayt, mobil interfeys va Telegram Mini App ranglarini avtomatik boshqaradi:

```javascript
colors: {
  primary: "#18181b",      // Asosiy brend rangi (Tugmalar, faol toifalar)
  secondary: "#27272a",    // Hover va ikkilamchi elementlar
  accent: "#b5935b",       // Oltin/aksent urg'u rangi (Chegirma, VIP nishonlar)
  background: "#fafafa",   // Umumiy fon rangi
  text: "#18181b",         // Asosiy matn rangi
  card: "#ffffff",         // Mahsulot kartochkasi foni
  border: "rgba(0,0,0,0.08)", // Nozik chiziqlar
}
```

### Tavsiya etilgan rang palitralari:

#### A. Premium / Klassik Ayollar Kiyimlari (Default)
Nafis, qimmatbaho va toza ko'rinish beradi:
* `primary`: `#18181b` (Chuqur qora-grafit)
* `secondary`: `#27272a`
* `accent`: `#b5935b` (Nafis oltin rang)
* `background`: `#fafafa`
* `radius`: `"16px"`

#### B. Zamonaviy / Streetwear / Yoshlarbop Kiyimlar
Yorqin, dinamik va zamonaviy uslub:
* `primary`: `#0f172a` (Tungi ko'k)
* `secondary`: `#1e293b`
* `accent`: `#3b82f6` (Elektr ko'k) yoki `#f97316` (Yorqin to'q sariq)
* `background`: `#f8fafc`
* `radius`: `"12px"`

#### C. Eko / Tabiiy / Zig'ir va Paxta Kiyimlari (Eco & Linen)
Tinchlantiruvchi, iliq va organik tuyg'u:
* `primary`: `#2d3b2d` (O'rmon yashili)
* `secondary`: `#3e4f3e`
* `accent`: `#c29b62` (Iliq terrakota / bug'doy rangi)
* `background`: `#fbfaf8`
* `radius`: `"8px"`

---

## ⚙️ 3. `brand.config.js` Parametrlari Bo'yicha Yo'riqnoma

| Maydon | Tavsif | Misol |
| :--- | :--- | :--- |
| `brandName` | Do'konning to'liq nomi | `"VELVORN"` |
| `shortName` | Qisqa brend nomi | `"VELVORN"` |
| `tagline` | Do'kon shiori | `"Zamonaviy va nafis ayollar kiyimlari"` |
| `logo` | Logotip fayl yo'li | `"/brand/logo.svg"` |
| `favicon` | Brauzer tabidagi ikonka | `"/brand/favicon.svg"` |
| `currency` | Valyuta belgisi | `"so'm"` |
| `radius` | Burchaklar yumaloqligi | `"16px"` yoki `"8px"` |
| `contacts.phone` | Mijozlar uchun telefon raqam | `"+998 90 123 45 67"` |
| `contacts.telegram` | Telegram kanal yoki profil useri | `"@brend_uz"` |
| `contacts.instagram`| Instagram sahifa havolasi | `"https://instagram.com/brend_uz"` |
| `bot.BOT_USERNAME` | Telegram botingiz username'i | `"brend_bot"` |
| `bot.APP_NAME` | BotFather dagi Mini App nomi | `"app"` |

---

## 🏷️ 4. Toifalar (Kategoriyalar) va Botda Avtomatik Aniqlash

Kiyim do'konida qanday toifalar sotilishini `categories` bo'limiga yozing:

```javascript
categories: [
  {
    id: "kurtka",
    name: "Kurtkalar",
    icon: "Layers",
    keywords: ["kurtka", "jacket", "palto", "plash", "bomber"],
  },
  {
    id: "sviter",
    name: "Sviterlar",
    icon: "Shirt",
    keywords: ["sviter", "sweater", "kardigan", "vodolazka"],
  },
  {
    id: "koylak",
    name: "Ko'ylaklar",
    icon: "Crown",
    keywords: ["ko'ylak", "koylak", "dress", "yubka"],
  },
]
```
> **Eslatma:** `keywords` ro'yxati orqali Telegram botga rasm yoki post tashlanganda, bot sarlavhadagi so'zlar bo'yicha mahsulot toifasini **avtomatik tarzda 100% aniqlaydi**.

---

## 📏 5. O'lchamlar va O'lchamlar Jadvali (Size Guide)

`sizes` va `sizeGuide` bo'limi orqali o'lchamlarni sozlashingiz mumkin:
```javascript
sizes: ["XS", "S", "M", "L", "XL", "2XL", "Standart"],

sizeGuide: {
  enabled: true,
  table: [
    { size: "S", bust: "84–88 sm", waist: "64–68 sm", hips: "90–94 sm", height: "158–165 sm", weight: "48–55 kg" },
    { size: "M", bust: "88–92 sm", waist: "68–72 sm", hips: "94–98 sm", height: "165–172 sm", weight: "55–62 kg" },
    // boshqa o'lchamlar...
  ]
}
```

---

## 🖥️ 6. Admin Paneldan Sozlash

Sayt ishga tushgandan keyin ham ba'zi sozlamalarni to'g'ridan-to'g'ri brauzer orqali o'zgartirish mumkin:
1. Brauzerda `/admin` manziliga kiring (yoki bot orqali oching).
2. Login va parolingiz bilan kiring.
3. **"⚙️ Sozlamalar"** bo'limiga o'ting.
4. U yerda:
   * Do'kon nomi va shiori
   * Asosiy brend rangi (`#HEX` tanlagich)
   * Logotip URL manzili
   * Telefon va kontaktlar
   * Bosh sahifa hero sarlavhasi
5. **"Saqlash"** tugmasini bosing — barcha o'zgarishlar darhol bazada saqlanadi va saytda qayta yuklanmasdan ko'rinadi!

---

## 🧪 7. Sinov va Tekshirish (Checklist)

Yangi brendga o'tkazgandan so'ng quyidagilarni tekshiring:
- [ ] Bosh sahifada brend nomi va to'g'ri logotip chiqayotgani.
- [ ] Brauzer tabida sarlavha va favicon yangilangani.
- [ ] Kategoriyalar bo'yicha mahsulotlar to'g'ri filtrlanayotgani.
- [ ] O'lcham yo'riqnomasi (Size guide) ochilishi va qiymatlar to'g'riligi.
- [ ] Savatga mahsulot qo'shish va buyurtma berish jarayoni.
- [ ] Telegram botda `/start` bosilganda brend salomlashish matni va Mini App tugmasi chiqishi.
- [ ] Admin panelda yangi brend rangi va nomi aks etayotgani.
