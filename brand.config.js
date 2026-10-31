/**
 * BRAND CONFIGURATION (STANDART KIYIM-KECHAK SHABLONI SOZLAMALARI)
 * 
 * Ushbu bitta fayl orqali butun tizimni (Veb-sayt, Telegram Mini App, Telegram Bot, Admin panel)
 * yangi brendga moslashtirish mumkin. Kodga umuman tegish shart emas!
 */

export const brandConfig = {
  // --------------------------------------------------------------------------
  // 1. BREND ASOSIY MA'LUMOTLARI
  // --------------------------------------------------------------------------
  // Do'konning to'liq rasmiy nomi (Sayt sarlavhalari, bot, admin va cheklarda chiqadi)
  brandName: "Brand Name",

  // Qisqa nom (Kichik bo'limlar, SMS yoki bildirishnomalarda ishlatiladi)
  shortName: "Brand",

  // Shior yoki brend ta'rifi (Hero, meta teglar va ulashish havolalarida ko'rinadi)
  tagline: "Zamonaviy va sifatli kiyimlar to'plami",

  // --------------------------------------------------------------------------
  // 2. LOGOTIP VA FAVICON (brand/ papkasidagi fayllar)
  // --------------------------------------------------------------------------
  // Asosiy logotip fayli (public/brand/ ichida joylashadi, SVG yoki PNG)
  logo: "/brand/logo.svg",

  // Brauzer tabidagi kichik ikonka (public/brand/ ichida)
  favicon: "/brand/favicon.svg",

  // --------------------------------------------------------------------------
  // 3. DIZAYN VA RANGLAR (Butun sayt va mini app shu ranglarga moslashadi)
  // --------------------------------------------------------------------------
  colors: {
    // Asosiy brend rangi: Tugmalar, faol toifalar, asosiy urg'u elementlari
    primary: "#18181b",

    // Ikkilamchi rang: Quyi sarlavhalar, hover holatlari, yordamchi tugmalar
    secondary: "#27272a",

    // Urg'u rangi: Aksiya, chegirma nishonlari yoki maxsus to'plamlar nishoni
    accent: "#b5935b",

    // Saytning umumiy orqa foni
    background: "#fafafa",

    // Asosiy matn rangi (O'qish oson va yuqori kontrastli)
    text: "#18181b",

    // Mahsulot va kontent kartochkalari foni
    card: "#ffffff",

    // Chegara chiziqlari (border) rangi
    border: "rgba(0, 0, 0, 0.08)",
  },

  // --------------------------------------------------------------------------
  // 4. SHRIFT VA BURCHAK YUMALOQLIGI (RADIUS)
  // --------------------------------------------------------------------------
  font: {
    // Sarlavhalar shrifti (Google Fonts yoki tizim shriftlari)
    heading: "'Cinzel', -apple-system, BlinkMacSystemFont, serif",

    // Asosiy o'qish matnlari shrifti
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  // Burchak yumaloqligi (Masalan: "16px" - zamonaviy yumaloq, "8px" - klassik)
  radius: "16px",

  // Kartochka ko'rinish uslubi ("modern" - engil soya va nozik chiziq, "minimal" - tekis)
  cardStyle: "modern",

  // --------------------------------------------------------------------------
  // 5. HERO VA BOSH SAHIFA BANNERLARI
  // --------------------------------------------------------------------------
  hero: {
    // Bosh bannerdagi asosiy katta sarlavha
    title: "Yangi To'plam 2026",

    // Sarlavha ostidagi qisqa tushuntirish matni
    subtitle: "Eksklyuziv kiyimlar va betakror uslub",

    // Sarlavha ustidagi kichik brend nishoni
    eyebrow: "YANGI MAVSUM",

    // Asosiy harakat tugmasi matni
    buttonText: "Katalogni ko'rish",

    // Boshlang'ich banner rasmi (public/brand/ papkasida)
    banner: "/brand/banner.svg",
  },

  // --------------------------------------------------------------------------
  // 6. FOOTER VA HUQUQIY MA'LUMOTLAR
  // --------------------------------------------------------------------------
  footer: {
    // Footer ostidagi qisqa tavsif
    description: "Zamonaviy va didli kiyimlar online do'koni. Yuqori sifat va tezkor yetkazib berish.",

    // Mualliflik huquqi matni
    copyright: "Barcha huquqlar himoyalangan.",
  },

  // --------------------------------------------------------------------------
  // 7. ALOQA VA IJTIMOIY TARMOQLAR
  // --------------------------------------------------------------------------
  contacts: {
    // Mijozlar bog'lanishi uchun rasmiy telefon raqami
    phone: "+998 90 123 45 67",

    // Telefonning probellarsiz varianti (tel: havolalari uchun)
    phoneClean: "+998901234567",

    // Do'kon/ofisning jismoniy manzili
    address: "Toshkent shahri, Chilonzor tumani, Bunyodkor ko'chasi 1-uy",

    // Ish vaqti
    workHours: "Har kuni 09:00 dan 21:00 gacha",

    // Rasmiy elektron pochta
    email: "info@example.com",

    // Telegram profil yoki guruh havolasi
    telegram: "@brand_channel",
    telegramUrl: "https://t.me/brand_channel",

    // Instagram sahifasi
    instagram: "@brand_profile",
    instagramUrl: "https://instagram.com/brand_profile",
  },

  // --------------------------------------------------------------------------
  // 8. VALYUTA
  // --------------------------------------------------------------------------
  // Narxlar yonida ko'rsatiladigan valyuta belgisi yoki matni
  currency: "so'm",

  // --------------------------------------------------------------------------
  // 9. TELEGRAM BOT VA MINI APP SOZLAMALARI
  // --------------------------------------------------------------------------
  bot: {
    // Telegram bot username (boshida @ siz yoziladi)
    BOT_USERNAME: "brand_shop_bot",

    // Telegram BotFather dagi Web App (Short name) nomi
    APP_NAME: "app",

    // Kunlik avtomatik hisobot yuboriladigan vaqt ("22:00") va vaqt zonasi
    dailyReportTime: "22:00",
    timezone: "Asia/Tashkent",

    // Foydalanuvchi /start bosganda chiqadigan salomlashish matni
    welcomeMessage: "🌸 <b>Assalomu alaykum, xush kelibsiz!</b>\n\nBizning barcha yangi to'plamlarimizni ko'rish, o'lchamlarni tanlash va buyurtma berish uchun quyidagi tugmani bosing:",

    // Botdagi asosiy klaviatura tugmalari matnlari
    buttons: {
      launchApp: "🛍 Do'konni ochish",
      buyNow: "🛍 Buyurtma berish",
      add: "➕ Qo'shish",
      delete: "🗑 O'chirish",
      report: "📊 Hisobot",
      confirmDeploy: "✅ Tasdiqlash va chiqarish",
      cancelDeploy: "❌ Bekor qilish",
      onlySite: "🌐 Faqat saytga (Kanalga shart emas)",
      customSize: "✍️ Boshqa o'lcham",
      photosReady: "✅ Rasmlar tayyor",
    },
  },

  // --------------------------------------------------------------------------
  // 10. KATEGORIYALAR (Kiyim-kechak toifalari, ikonkasi va kalit so'zlari)
  // --------------------------------------------------------------------------
  // Yangi kiyim toifasi qo'shilsa yoki o'zgartirilsa, saytdagi ikonka va botdagi
  // avtomatik aniqlash (detectCategory) shu yerdan avtomatik ishlaydi.
  categories: [
    {
      id: "kurtka",
      name: "Kurtka",
      icon: "Layers",
      keywords: ["kurtka", "jacket", "palto", "plash", "bomber"],
    },
    {
      id: "sviter",
      name: "Sviter",
      icon: "Shirt",
      keywords: ["sviter", "sweater", "kardigan", "cardigan", "vodolazka", "jemfer", "jaket"],
    },
    {
      id: "chopon",
      name: "Choponlar",
      icon: "Feather",
      keywords: ["chopon", "chapan"],
    },
    {
      id: "koylak",
      name: "Ko'ylak",
      icon: "Crown",
      keywords: ["ko'ylak", "koylak", "dress", "yubka", "sarafan"],
    },
    {
      id: "sport",
      name: "Sport kiyimlari",
      icon: "Flame",
      keywords: ["sport", "hudi", "hoodie", "tolstovka", "leggins", "top"],
    },
    {
      id: "kostyum",
      name: "Kostyum",
      icon: "Shirt",
      keywords: ["kostyum", "suit", "dvoyka", "troika", "shim-kostyum"],
    },
    {
      id: "shim",
      name: "Shim",
      icon: "Tag",
      keywords: ["shim", "jean", "pants", "bryuk", "jinsi"],
    },
  ],

  // --------------------------------------------------------------------------
  // 11. O'LCHAMLAR (Standart kiyim o'lchamlari ro'yxati)
  // --------------------------------------------------------------------------
  // Mahsulot qo'shishda yoki filtrda chiqadigan o'lcham variantlari
  sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "Standard"],

  // --------------------------------------------------------------------------
  // 12. O'LCHAMLAR JADVALI (SIZE GUIDE)
  // --------------------------------------------------------------------------
  sizeGuide: {
    // O'lchamlar jadvali tugmasi va modali ko'rinsinmi (true / false)
    enabled: true,

    // Jadvaldagi o'lchamlar va santimetr ko'rsatkichlari
    table: [
      { size: "XS", bust: "80-84", waist: "60-64", hips: "86-90" },
      { size: "S", bust: "84-88", waist: "64-68", hips: "90-94" },
      { size: "M", bust: "88-92", waist: "68-72", hips: "94-98" },
      { size: "L", bust: "92-96", waist: "72-76", hips: "98-102" },
      { size: "XL", bust: "96-102", waist: "76-82", hips: "102-108" },
      { size: "2XL", bust: "102-108", waist: "82-88", hips: "108-114" },
      { size: "3XL", bust: "108-114", waist: "88-94", hips: "114-120" },
      { size: "Standard", bust: "84-98", waist: "64-78", hips: "90-104" },
    ],
  },

  // --------------------------------------------------------------------------
  // 13. QO'SHIMCHA FUNKSIYALAR (FEATURES)
  // --------------------------------------------------------------------------
  features: {
    // Mahsulotlarda "Mavsum" (Kuz, Bahor, Qish, Yoz) xususiyati yoqilganmi
    season: true,

    // Mahsulotlarda "Rang" xususiyati yoqilganmi
    color: true,

    // Saralanganlar (Wishlist) funksiyasi yoqilganmi
    wishlist: true,
  },
};

export default brandConfig;

