import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {}

import {
  createProduct,
  getProducts,
  deleteProduct,
  saveImage,
  getAdminUsers,
  getAdminUser,
  saveAdminUser,
  saveTelegramGroup,
  getTelegramGroups,
  saveGroupTopics,
  getGroupTopics,
  getOrderById,
  updateOrder,
  onOrderStatusChange,
  getOrders,
  getSetting,
  setSetting,
  generateDailyReportText,
  sendDailyReport,
} from "./db.js";
import { brandConfig } from "./brand.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, "bot-config.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID ? String(process.env.OWNER_TELEGRAM_ID).trim() : "";

// ==========================================================================
// 1. BRAND CONFIGURATION (Hamma matn va tugmalar brand.config dan o'qiladi)
// ==========================================================================
function getBrandConfig() {
  return brandConfig;
}

function getMsg(key, params = {}) {
  const cfg = getBrandConfig();
  let text = cfg.bot?.messages?.[key] || "";
  if (!text) {
    // Default fallback xabarlar
    const fallbacks = {
      welcomeAdmin: `👋 <b>Assalomu alaykum, Hurmatli Admin ({name})!</b>\n\nSiz do'kon administratorisiz. Quyidagi menyu orqali yangi mahsulot qo'shishingiz, o'chirishingiz yoki do'kon hisobotini ko'rishingiz mumkin.\n\n📢 Ulangan kanal/guruh: <code>{channel}</code>`,
      welcomeUser: cfg.bot?.welcomeMessage || `🌸 <b>Assalomu alaykum, xush kelibsiz!</b>\n\nBizning barcha yangi to'plamlarimizni ko'rish, o'lchamlarni tanlash va buyurtma berish uchun quyidagi tugmani bosing:`,
      stepPhoto: `📸 <b>Mahsulot rasmlarini yuboring (1 tadan 4 tagacha):</b>\n\n💡 <i>1-rasm bosh asosiy rasm bo'ladi, qolganlari qo'shimcha rakurslar bo'ladi.\nRasmlarni yuborib bo'lgach, tagiga nom va narxini yozishingiz yoki keyingi qadamga o'tishingiz mumkin!</i>`,
      stepName: `📝 <b>1-qadam. Mahsulot nomini yozing:</b>\n<i>Masalan: <code>Dvoyka to'plam</code> yoki <code>Klassik kardigan</code></i>`,
      stepPrice: `💰 <b>2-qadam. Mahsulot narxini kiriting:</b>\n<i>Masalan: <code>350000</code> yoki <code>350 ming</code></i>`,
      stepSizes: `📏 <b>3-qadam. O'lchamini (variantini) tanlang:</b>`,
      stepChannel: `📢 <b>4-qadam. Ushbu mahsulotni qaysi kanal yoki guruhga joylaysiz?</b>`,
      stepConfirm: `📋 <b>5-qadam. Mahsulot ma'lumotlarini tekshiring va tasdiqlang:</b>\n\n👗 <b>Nomi:</b> {name}\n💰 <b>Narxi:</b> {price}\n📏 <b>O'lchamlari:</b> {sizes}\n📂 <b>Kategoriyasi:</b> {category}\n🖼 <b>Rasmlar soni:</b> {photoCount} ta\n📢 <b>Joylanadigan manzil:</b> {targetChannel}`,
      deploySuccess: `🎉 <b>Mahsulot muvaffaqiyatli saqlandi!</b>\n\n👗 <b>Nom:</b> {name}\n💰 <b>Narx:</b> {price}\n📏 <b>O'lcham:</b> {sizes}\n📂 <b>Kategoriya:</b> {category}\n\n{channelResult}🌐 <b>Veb-sayt va mini appda darhol ko'rish mumkin!</b>`,
      deployCanceled: `❌ Mahsulot qo'shish bekor qilindi. Hech qanday ma'lumot saqlanmadi.`,
      invalidPrice: `❌ <b>Noto'g'ri narx!</b> Faqat raqam kiriting (masalan: <code>350000</code>):`,
      accessDenied: `⛔ Kechirasiz, ushbu amal faqat do'kon administratorlari uchun.`,
      reportTitle: `📊 <b>Do'kon hisoboti:</b>`,
      noProductsToDelete: `ℹ️ Hozirda do'konda o'chirish uchun mahsulotlar yo'q.`,
      deleteSelect: `🗑 <b>O'chirmoqchi bo'lgan mahsulotingizni tanlang:</b>\n<i>(Saytdan ham, ulangan kanaldan ham o'chiriladi)</i>`,
      deleteSuccess: `✅ <b>"{name}" sayt va kanaldan muvaffaqiyatli o'chirildi!</b>`,
    };
    text = fallbacks[key] || "";
  }
  for (const [k, v] of Object.entries(params)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

function getBtn(key) {
  const cfg = getBrandConfig();
  const fallbacks = {
    add: "➕ Qo'shish",
    delete: "🗑 O'chirish",
    report: "📊 Hisobot",
    launchApp: "🛍 Do'konni ochish",
    buyNow: "🛍 Buyurtma berish",
    confirmDeploy: "✅ Tasdiqlash va chiqarish",
    cancelDeploy: "❌ Bekor qilish",
    onlySite: "🌐 Faqat saytga (Kanalga shart emas)",
    customSize: "✍️ Boshqa o'lcham",
    photosReady: "✅ Rasmlar tayyor",
  };
  return cfg.bot?.buttons?.[key] || fallbacks[key] || "";
}

function getSizePresets() {
  const cfg = getBrandConfig();
  return (
    cfg.bot?.sizePresets || [
      { id: "XS_S_M_L_XL", label: "✨ XS, S, M, L, XL", sizes: ["XS", "S", "M", "L", "XL"] },
      { id: "S_M_L", label: "S, M, L", sizes: ["S", "M", "L"] },
      { id: "Standart", label: "Standart (Universal)", sizes: ["Standart"] },
      { id: "L_XL_XXL", label: "L, XL, XXL", sizes: ["L", "XL", "XXL"] },
      { id: "ALL", label: "Barchasi (XS–XXL)", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
    ]
  );
}

function loadConfig() {
  let fileCfg = {};
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fileCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("bot-config.json xatosi:", err);
  }

  const botToken =
    process.env.BOT_TOKEN ||
    fileCfg.botToken ||
    "";

  return {
    botToken,
    botUsername: (process.env.BOT_USERNAME || fileCfg.botUsername || brandConfig.bot?.BOT_USERNAME || "").replace(/^@/, ""),
    targetChatId: process.env.TARGET_CHAT_ID ? Number(process.env.TARGET_CHAT_ID) : (fileCfg.targetChatId || ""),
    webAppUrl: process.env.WEB_APP_URL || fileCfg.webAppUrl || "https://your-brand.vercel.app",
    adminIds: fileCfg.adminIds || [],
  };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.error("bot-config.json saqlashda xatolik:", err);
  }
}

function readOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
    }
  } catch {
    return [];
  }
  return [];
}

let config = loadConfig();

// Adminlikni server darajasida tekshirish (OWNER_TELEGRAM_ID yoki DB dagi faol adminlar)
async function isUserAdmin(userId) {
  if (!userId) return false;
  const uId = String(userId).trim();
  if (OWNER_TELEGRAM_ID && uId === OWNER_TELEGRAM_ID) return true;
  const dbAdmin = await getAdminUser(uId);
  return Boolean(dbAdmin && dbAdmin.status === "active");
}

// Media buffers & step-by-step sessions
const albumBuffers = new Map();
const standalonePhotoBuffers = new Map();
const userStates = new Map();

// Helper: Call Telegram Bot API
async function callTelegram(method, payload = {}) {
  const token = config.botToken?.trim();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    return data;
  } catch (err) {
    console.error(`Telegram API xatosi (${method}):`, err.message);
    return null;
  }
}

// Helper: Download photo file from Telegram and save directly to DB product_images
async function downloadTelegramPhoto(fileId, prefix = "img") {
  const token = config.botToken?.trim();
  if (!token) return null;

  try {
    const fileRes = await callTelegram("getFile", { file_id: fileId });
    if (!fileRes?.ok || !fileRes?.result?.file_path) return null;

    const filePath = fileRes.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    const res = await fetch(downloadUrl);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const filename = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}.jpg`;

    // Diskka emas, bazaga (product_images) saqlaymiz
    await saveImage(filename, base64Data, "image/jpeg");

    // Sayt va bot uchun universal rasm URL manzili
    return `/api/images?id=${encodeURIComponent(filename)}`;
  } catch (err) {
    console.error("Rasmni saqlashda xatolik:", err.message);
    return null;
  }
}

// Helper: Narxni formatlash
function formatPrice(price) {
  let num = parseInt(String(price).replace(/\D/g, ""), 10);
  if (isNaN(num)) return `0 ${brandConfig.currency || "so'm"}`;
  if (num > 0 && num < 1000) {
    num = num * 1000;
  }
  return `${num.toLocaleString("ru-RU")} ${brandConfig.currency || "so'm"}`;
}

// Helper: Captiondan nom va narxni ajratish (Tezkor usul uchun)
function parseNameAndPrice(text = "") {
  if (!text) return { name: "", price: 0 };

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let detectedPrice = 0;
  let detectedName = "";

  const priceRegex =
    /(?:narxi|narx|price|цена)?\s*[:=-]?\s*(\d[\d\s.,]{0,12}\d|\d+)\s*(?:ming|k|so['`]?m|sum|сум|usd|\$)?/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      /(?:dastavka|yetkazish|razmer|o['`]?lcham|matosi|sifat|batafsil|bog['`]?lanish)/i.test(line) &&
      !priceRegex.test(line)
    ) {
      continue;
    }

    const priceMatch = line.match(priceRegex);
    if (priceMatch && !detectedPrice) {
      let rawVal = priceMatch[1].replace(/[\s.,]/g, "");
      let val = parseInt(rawVal, 10);

      if (!isNaN(val) && val > 0) {
        if (/ming|k/i.test(line) && val < 10000) {
          val = val * 1000;
        } else if (val < 1000) {
          val = val * 1000;
        }
        detectedPrice = val;
      }
    }

    if (!detectedName && line.length > 2 && line.length < 50 && !/^(narxi|narx|цена)/i.test(line)) {
      const cleanLine = line
        .replace(/^[•\-\*⚡️✨🔥👉📍✅]+\s*/, "")
        .replace(priceRegex, "")
        .trim();

      if (cleanLine.length > 2 && !/^(dastavka|yetkazish|aloqa)/i.test(cleanLine)) {
        detectedName = cleanLine;
      }
    }
  }

  if (detectedName) {
    detectedName = detectedName.charAt(0).toUpperCase() + detectedName.slice(1);
  }

  return { name: detectedName, price: detectedPrice };
}

function detectCategory(name) {
  const n = (name || "").toLowerCase();
  for (const cat of brandConfig.categories || []) {
    if (cat.keywords && cat.keywords.some((kw) => n.includes(kw.toLowerCase()))) {
      return cat.name;
    }
  }
  return brandConfig.categories?.[0]?.name || "Katalog";
}

// Bosh klaviatura (Faqat Adminlar uchun ko'rinadi)
function getAdminMainKeyboard() {
  return {
    keyboard: [
      [{ text: getBtn("add") || "➕ Qo'shish" }, { text: getBtn("delete") || "🗑 O'chirish" }],
      [{ text: getBtn("report") || "📊 Hisobot" }, { text: getBtn("launchApp") || "🛍 Do'konni ochish" }],
    ],
    resize_keyboard: true,
  };
}

// ==========================================================================
// FORUM TOPIKLARI VA BUYURTMALAR BOSHQARUVI (Requirements 1, 2, 3, 4, 5)
// ==========================================================================

// Guruh Forum topiklarni avtomatik sozlash (/setupgroup - Faqat OWNER uchun)
async function handleSetupGroup(msg) {
  const chatId = msg.chat?.id;
  const chatType = msg.chat?.type;
  const from = msg.from || {};
  const fromId = String(from.id || "");
  const text = (msg.text || "").trim();

  // 1. Huquq tekshiruvi (Faqat OWNER)
  if (OWNER_TELEGRAM_ID && fromId !== OWNER_TELEGRAM_ID) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "⛔ Ushbu buyruq faqat loyiha egasi (Owner) uchun!",
    });
    return;
  }

  // 2. Qaysi guruh sozlanishini aniqlash
  let targetChat = chatId;
  const parts = text.split(/\s+/);
  if (parts.length > 1 && parts[1].startsWith("-")) {
    targetChat = parts[1].trim();
  } else if (chatType === "private") {
    const cfg = loadConfig();
    if (cfg.targetChatId) {
      targetChat = cfg.targetChatId;
    } else {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "ℹ️ <b>Guruh ID sini ko'rsating yoki buyruqni bevosita guruh ichida yozing:</b>\n\n<code>/setupgroup -100xxxxxxxxxx</code>",
        parse_mode: "HTML",
      });
      return;
    }
  }

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `⏳ Guruh tekshirilmoqda va topiklar sozlanmoqda (Chat ID: <code>${targetChat}</code>)...`,
    parse_mode: "HTML",
  });

  // 3. Guruh ma'lumotlarini tekshirish
  const chatInfo = await callTelegram("getChat", { chat_id: targetChat });
  if (!chatInfo?.ok) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `❌ <b>Guruhga ulanib bo'lmadi!</b>\nSabab: <code>${chatInfo?.description || "Noma'lum xatolik"}</code>\n\nIltimos, botni guruhga a'zo qilganingizni va to'g'ri guruh ID kiritilganini tekshiring.`,
      parse_mode: "HTML",
    });
    return;
  }

  // 4. Forum (Topics) rejimi yoqilganligini tekshirish
  if (!chatInfo.result.is_forum) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `❌ <b>Guruhda "Topics" (Mavzular / Forum) rejimi yoqilmagan!</b>\n\n` +
        `📌 <b>Nima qilish kerak:</b>\n` +
        `1. Telegramda <b>${chatInfo.result.title || "Guruh"}</b> profiliga kiring.\n` +
        `2. <b>Tahrirlash (Edit / ✏️)</b> tugmasini bosing.\n` +
        `3. <b>"Topics" (Mavzular)</b> sozlamasini topib, uni yoqing (ON qiling).\n` +
        `4. O'zgarishlarni saqlang va qaytadan <code>/setupgroup</code> buyrug'ini yuboring.`,
      parse_mode: "HTML",
    });
    return;
  }

  // 5. Bot huquqlarini tekshirish (Manage Topics)
  const me = await callTelegram("getMe");
  if (!me?.ok) {
    await callTelegram("sendMessage", { chat_id: chatId, text: "❌ Bot ma'lumotlarini olib bo'lmadi." });
    return;
  }

  const member = await callTelegram("getChatMember", { chat_id: targetChat, user_id: me.result.id });
  if (!member?.ok || member.result.status !== "administrator" || !member.result.can_manage_topics) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `❌ <b>Botda guruhda "Manage Topics" (Mavzularni boshqarish) huquqi yo'q!</b>\n\n` +
        `📌 <b>Nima qilish kerak:</b>\n` +
        `1. Guruh Administratorlar (Administrators) ro'yxatiga kiring.\n` +
        `2. <b>@${me.result.username}</b> botini administrator qiling (yoki mavjud huquqlarini oching).\n` +
        `3. <b>"Manage Topics" (Mavzularni boshqarish / yaratish)</b> ruxsatini yoqing.\n` +
        `4. O'zgarishlarni saqlang va qaytadan <code>/setupgroup</code> buyrug'ini yuboring.`,
      parse_mode: "HTML",
    });
    return;
  }

  // 6. 4 ta topikni yaratish
  const tOrders = await callTelegram("createForumTopic", {
    chat_id: targetChat,
    name: "🛍 Buyurtmalar",
    icon_color: 7322096, // Moviy
  });

  const tDelivered = await callTelegram("createForumTopic", {
    chat_id: targetChat,
    name: "🚚 Yetkazilganlar",
    icon_color: 9367192, // Yashil
  });

  const tReports = await callTelegram("createForumTopic", {
    chat_id: targetChat,
    name: "📊 Hisobotlar",
    icon_color: 16766590, // Sariq
  });

  const tSystem = await callTelegram("createForumTopic", {
    chat_id: targetChat,
    name: "⚙️ Tizim",
    icon_color: 16478047, // Qizil
  });

  if (!tOrders?.ok || !tDelivered?.ok || !tReports?.ok || !tSystem?.ok) {
    const errMsg = [tOrders?.description, tDelivered?.description, tReports?.description, tSystem?.description]
      .filter(Boolean)
      .join("; ");
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `❌ <b>Topiklarni yaratishda xatolik yuz berdi:</b>\n<code>${errMsg}</code>`,
      parse_mode: "HTML",
    });
    return;
  }

  const topicsData = {
    groupChatId: String(targetChat),
    ordersThreadId: tOrders.result.message_thread_id,
    deliveredThreadId: tDelivered.result.message_thread_id,
    reportsThreadId: tReports.result.message_thread_id,
    systemThreadId: tSystem.result.message_thread_id,
    updatedAt: new Date().toISOString(),
  };

  await saveGroupTopics(topicsData);

  // Tizim topikiga tabrik xabari
  await callTelegram("sendMessage", {
    chat_id: targetChat,
    message_thread_id: topicsData.systemThreadId,
    text:
      `⚙️ <b>Tizim topiki muvaffaqiyatli ishga tushdi!</b>\n\n` +
      `Barcha tizim ogohlantirishlari, sozlashlar va xatoliklar shu yerda xabar qilinadi.\n` +
      `🕒 ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
    parse_mode: "HTML",
  });

  // Ownerga hisobot
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text:
      `🎉 <b>Guruh forum rejimi va barcha topiklar muvaffaqiyatli sozlandi!</b>\n\n` +
      `📢 <b>Guruh:</b> <code>${chatInfo.result.title || targetChat}</code>\n\n` +
      `📌 <b>🛍 Buyurtmalar:</b> thread <code>#${topicsData.ordersThreadId}</code>\n` +
      `📌 <b>🚚 Yetkazilganlar:</b> thread <code>#${topicsData.deliveredThreadId}</code>\n` +
      `📌 <b>📊 Hisobotlar:</b> thread <code>#${topicsData.reportsThreadId}</code>\n` +
      `📌 <b>⚙️ Tizim:</b> thread <code>#${topicsData.systemThreadId}</code>\n\n` +
      `<i>Endi tushgan barcha yangi buyurtmalar "Buyurtmalar" topikiga inline tugmalar bilan yuboriladi!</i>`,
    parse_mode: "HTML",
  });
}

// Buyurtma tugmalari callback query mantiqi (Requirements 3 & 4)
async function handleOrderCallback(cb) {
  const cbId = cb.id;
  const data = cb.data || "";
  const from = cb.from || {};
  const fromId = String(from.id);
  const msg = cb.message;
  const chatId = msg?.chat?.id;

  // 1. Ruxsat tekshiruvi (Requirement 4)
  const isAdmin = await isUserAdmin(fromId);
  if (!isAdmin) {
    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: "⛔ Sizda ushbu amalni bajarish uchun ruxsat yo'q!",
      show_alert: true,
    });
    return;
  }

  // 2. Callback parsing: ord:<action>:<orderId>
  const parts = data.split(":");
  const action = parts[1]; // 'accept', 'deliver', 'cancel'
  const orderId = parts.slice(2).join(":");

  const order = await getOrderById(orderId);
  if (!order) {
    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: "❌ Buyurtma topilmadi!",
      show_alert: true,
    });
    return;
  }

  // 3. Concurrency va noto'g'ri o'tishlar tekshiruvi (Requirement 3)
  if (order.status === "Bekor qilindi") {
    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: "⛔ Ushbu buyurtma bekor qilingan va qayta o'zgartirib bo'lmaydi!",
      show_alert: true,
    });
    return;
  }

  if (order.status === "Yetkazildi") {
    if (action === "accept") {
      await callTelegram("answerCallbackQuery", {
        callback_query_id: cbId,
        text: "⛔ Yetkazilgan buyurtmani qayta 'Qabul qilindi'ga o'tkazib bo'lmaydi!",
        show_alert: true,
      });
      return;
    }
    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: "ℹ️ Bu buyurtma allaqachon yetkazilgan!",
      show_alert: true,
    });
    return;
  }

  if (order.status === "Qabul qilindi" && action === "accept") {
    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: "ℹ️ Bu buyurtma allaqachon yangilangan (Qabul qilingan)!",
      show_alert: true,
    });
    return;
  }

  // 4. Yangi statusni belgilash
  let newStatus = "";
  if (action === "accept") newStatus = "Qabul qilindi";
  else if (action === "deliver") newStatus = "Yetkazildi";
  else if (action === "cancel") newStatus = "Bekor qilindi";

  const updaterName = from.username
    ? `@${from.username}`
    : [from.first_name, from.last_name].filter(Boolean).join(" ") || `ID: ${fromId}`;
  const timeStr = new Date().toLocaleTimeString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
  });

  await updateOrder(orderId, {
    status: newStatus,
    updatedBy: updaterName,
    updatedAt: new Date().toISOString(),
  });

  const topics = await getGroupTopics();

  function buildOrderCaption(ord, st, upInfo) {
    const statusEmojis = {
      "Yangi": "🟡 Yangi",
      "Qabul qilindi": "🔵 Qabul qilindi",
      "Yetkazildi": "🟢 Yetkazildi",
      "Bekor qilindi": "🔴 Bekor qilindi",
    };
    const itemsList = (ord.items || [])
      .map((it) => `• <b>${it.name}</b> (O'lcham: ${it.size}) × ${it.quantity} ta — ${(Number(it.price || 0) * it.quantity).toLocaleString("ru-RU")} so'm`)
      .join("\n");

    let t =
      `🛍 <b>BUYURTMA #${ord.id}</b>\n\n` +
      `👤 <b>Mijoz:</b> ${ord.customer?.name || "Noma'lum"}\n` +
      `📞 <b>Telefon:</b> ${ord.customer?.phone || "Kiritilmagan"}\n` +
      `🏪 <b>Manzil / Usul:</b> ${ord.customer?.address || "Do'kondan olib ketish"}\n` +
      `💳 <b>To'lov turi:</b> ${ord.paymentMethod || "Naqd / Karta"}\n\n` +
      `📦 <b>Buyurtma tarkibi:</b>\n${itemsList || "—"}\n\n` +
      `💰 <b>JAMI:</b> <b>${Number(ord.total || 0).toLocaleString("ru-RU")} so'm</b>\n` +
      `🕒 <b>Vaqt:</b> ${ord.createdAt ? new Date(ord.createdAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }) : "—"}\n\n` +
      `📊 <b>Holat:</b> ${statusEmojis[st] || st}`;

    if (upInfo) {
      t += `\n👤 <b>Kim tomonidan:</b> ${upInfo.by}\n🕒 <b>Yangilangan:</b> ${upInfo.time}`;
    }
    return t;
  }

  const isPhoto = Boolean(msg?.photo && msg.photo.length > 0);
  const upInfo = { by: updaterName, time: timeStr };
  const newText = buildOrderCaption(order, newStatus, upInfo);

  if (action === "accept") {
    const keyboard = {
      inline_keyboard: [
        [
          { text: "🚚 Yetkazildi", callback_data: `ord:deliver:${order.id}` },
          { text: "❌ Bekor qilindi", callback_data: `ord:cancel:${order.id}` },
        ],
      ],
    };

    if (isPhoto) {
      await callTelegram("editMessageCaption", {
        chat_id: chatId,
        message_id: msg.message_id,
        caption: newText,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      await callTelegram("editMessageText", {
        chat_id: chatId,
        message_id: msg.message_id,
        text: newText,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }

    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: "✅ Buyurtma qabul qilindi deb belgilandi!",
    });
    return;
  }

  if (action === "cancel") {
    if (isPhoto) {
      await callTelegram("editMessageCaption", {
        chat_id: chatId,
        message_id: msg.message_id,
        caption: newText,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] },
      });
    } else {
      await callTelegram("editMessageText", {
        chat_id: chatId,
        message_id: msg.message_id,
        text: newText,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] },
      });
    }

    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: "❌ Buyurtma bekor qilindi deb belgilandi!",
    });
    return;
  }

  if (action === "deliver") {
    // "Yetkazildi" bosilsa buyurtma xabari "Yetkazilganlar" topikiga ko'chirilsin
    const deliveredThreadId = topics?.deliveredThreadId ? Number(topics.deliveredThreadId) : null;
    const targetGroup = topics?.groupChatId || chatId;

    if (isPhoto && msg.photo?.[0]?.file_id) {
      const bestPhoto = msg.photo[msg.photo.length - 1].file_id;
      const sendPayload = {
        chat_id: targetGroup,
        photo: bestPhoto,
        caption: newText,
        parse_mode: "HTML",
      };
      if (deliveredThreadId) sendPayload.message_thread_id = deliveredThreadId;
      await callTelegram("sendPhoto", sendPayload);
    } else {
      const sendPayload = {
        chat_id: targetGroup,
        text: newText,
        parse_mode: "HTML",
      };
      if (deliveredThreadId) sendPayload.message_thread_id = deliveredThreadId;
      await callTelegram("sendMessage", sendPayload);
    }

    // Eskisi o'chiriladi
    const delRes = await callTelegram("deleteMessage", {
      chat_id: chatId,
      message_id: msg.message_id,
    });
    if (!delRes?.ok) {
      if (isPhoto) {
        await callTelegram("editMessageCaption", {
          chat_id: chatId,
          message_id: msg.message_id,
          caption: `${newText}\n\n<i>(Yetkazilganlar topikiga ko'chirildi)</i>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        });
      } else {
        await callTelegram("editMessageText", {
          chat_id: chatId,
          message_id: msg.message_id,
          text: `${newText}\n\n<i>(Yetkazilganlar topikiga ko'chirildi)</i>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        });
      }
    }

    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: "🚚 Buyurtma 'Yetkazilganlar' topikiga ko'chirildi!",
    });
    return;
  }
}

// Handle incoming messages
async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const chatType = msg.chat?.type; // 'private', 'group', 'supergroup', 'channel'
  const userId = msg.from?.id || chatId;
  const text = msg.text?.trim() || "";
  const caption = msg.caption?.trim() || "";
  const photo = msg.photo;

  config = loadConfig();

  // 1. /setupgroup buyrug'i (Guruhda yoki shaxsiy chatda Forum topiklarni sozlash - Faqat OWNER uchun)
  if (text.startsWith("/setupgroup")) {
    await handleSetupGroup(msg);
    return;
  }

  // Guruh yoki kanaldan kelgan faollikni ro'yxatga olamiz
  if (chatType === "channel" || chatType === "group" || chatType === "supergroup") {
    await saveTelegramGroup({
      chatId,
      title: msg.chat?.title || msg.chat?.username || (chatType === "channel" ? "Kanal" : "Guruh"),
      type: chatType,
      username: msg.chat?.username || "",
      isTarget: String(chatId) === String(config.targetChatId),
    });
    return;
  }

  // Shaxsiy chat tekshiruvlari
  const isAdmin = await isUserAdmin(userId);
  const webAppUrl = config.webAppUrl || process.env.WEB_APP_URL || "https://your-brand.vercel.app";

  const LAUNCH_BUTTON = {
    inline_keyboard: [
      [
        {
          text: getBtn("launchApp") || "🛍 Do'konni ochish (Launch App)",
          web_app: { url: webAppUrl },
        },
      ],
    ],
  };

  // /start buyrug'i: Hamma uchun salom + "Launch App" tugmasi
  if (text === "/start") {
    userStates.delete(userId);

    if (isAdmin) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: getMsg("welcomeAdmin", {
          name: msg.from?.first_name || "Admin",
          channel: config.targetChatId || "Belgilanmagan",
        }),
        parse_mode: "HTML",
        reply_markup: getAdminMainKeyboard(),
      });

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `Do'konning mijozlar interfeysi:`,
        reply_markup: LAUNCH_BUTTON,
      });
      return;
    }

    // Oddiy xaridor (mijoz) uchun
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: getMsg("welcomeUser"),
      parse_mode: "HTML",
      reply_markup: LAUNCH_BUTTON,
    });
    return;
  }

  if (text === getBtn("launchApp") || text === "🛍 Do'konni ochish") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Do'konimiz katalogini ochish uchun quyidagi tugmani bosing:`,
      reply_markup: LAUNCH_BUTTON,
    });
    return;
  }

  // Admin huquqi tekshiruvi
  if (!isAdmin) {
    if (
      text === getBtn("add") ||
      text === "➕ Qo'shish" ||
      text === getBtn("delete") ||
      text === "🗑 O'chirish" ||
      text === getBtn("report") ||
      text === "📊 Hisobot" ||
      (photo && photo.length > 0)
    ) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: getMsg("accessDenied"),
        parse_mode: "HTML",
        reply_markup: LAUNCH_BUTTON,
      });
      return;
    }
    return;
  }

  // Kanalni ulash buyrug'i: /setchannel yoki /setgroup
  if (text.startsWith("/setchannel") || text.startsWith("/setgroup") || text.startsWith("/settarget")) {
    const target = text.replace(/\/set(channel|group|target)/i, "").trim();
    if (!target) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "Iltimos, kanal/guruh nomini yoki ID sini kiriting:\nMasalan: <code>/setchannel @kanal_nomi</code> yoki <code>/setchannel -1004367729128</code>",
        parse_mode: "HTML",
      });
      return;
    }
    config.targetChatId = target;
    saveConfig(config);
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✅ Guruh/Kanal ulandi: <code>${target}</code>`,
      parse_mode: "HTML",
      reply_markup: getAdminMainKeyboard(),
    });
    return;
  }

  // 📊 Hisobot (Requirement 5)
  if (text === getBtn("report") || text === "📊 Hisobot" || text === "/report") {
    userStates.delete(userId);
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "⏳ Bugungi hisobot tayyorlanmoqda...",
    });
    await sendDailyReport(true, chatId);
    return;
  }

  // 🗑 O'chirish
  if (text === getBtn("delete") || text === "🗑 O'chirish") {
    userStates.delete(userId);
    const prods = await getProducts();
    if (!prods || prods.length === 0) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: getMsg("noProductsToDelete"),
        reply_markup: getAdminMainKeyboard(),
      });
      return;
    }

    const inlineKeyboard = prods.slice(0, 15).map((p) => [
      {
        text: `❌ ${p.name} (${formatPrice(p.price)})`,
        callback_data: `del_prod_${p.id}`,
      },
    ]);

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: getMsg("deleteSelect"),
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
    return;
  }

  // ➕ Qo'shish (Yangi qadamma-qadam oqimning boshlanishi)
  if (text === getBtn("add") || text === "➕ Qo'shish") {
    userStates.set(userId, { step: "WAIT_PHOTO", images: [] });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: getMsg("stepPhoto"),
      parse_mode: "HTML",
    });
    return;
  }

  // Rasmlarni qabul qilish (Albom yoki yakka rasm)
  if (photo && photo.length > 0) {
    const highestPhoto = photo[photo.length - 1];
    const fileId = highestPhoto.file_id;

    if (msg.media_group_id) {
      const mgId = msg.media_group_id;
      if (!albumBuffers.has(mgId)) {
        albumBuffers.set(mgId, {
          photos: [fileId],
          caption: caption || "",
          chatId,
          userId,
          timer: null,
        });
      } else {
        const item = albumBuffers.get(mgId);
        item.photos.push(fileId);
        if (caption && !item.caption) item.caption = caption;
      }

      const item = albumBuffers.get(mgId);
      clearTimeout(item.timer);
      item.timer = setTimeout(async () => {
        albumBuffers.delete(mgId);
        await processIncomingPhotos(chatId, userId, item.photos, item.caption);
      }, 1200);

      return;
    }

    if (!standalonePhotoBuffers.has(userId)) {
      standalonePhotoBuffers.set(userId, {
        photos: [fileId],
        caption: caption || "",
        chatId,
        timer: null,
      });
    } else {
      const item = standalonePhotoBuffers.get(userId);
      item.photos.push(fileId);
      if (caption && !item.caption) item.caption = caption;
    }

    const item = standalonePhotoBuffers.get(userId);
    clearTimeout(item.timer);
    item.timer = setTimeout(async () => {
      standalonePhotoBuffers.delete(userId);
      await processIncomingPhotos(chatId, userId, item.photos, item.caption);
    }, 1500);

    return;
  }

  // Step-by-step ma'lumot kiritish
  const state = userStates.get(userId);

  // 1-qadam: Nom qabul qilish
  if (state && state.step === "WAIT_NAME") {
    state.name = text;
    state.step = "WAIT_PRICE";

    const keyboard = state.detectedPrice
      ? {
          inline_keyboard: [
            [{ text: `⚡️ ${formatPrice(state.detectedPrice)}`, callback_data: `pick_price_${userId}` }],
          ],
        }
      : undefined;

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✅ Nom saqlandi: <b>${state.name}</b>\n\n${getMsg("stepPrice")}`,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
    return;
  }

  // 2-qadam: Narx qabul qilish
  if (state && state.step === "WAIT_PRICE") {
    let cleanVal = text.replace(/[\s.,so'm]/gi, "").trim();
    let priceNum = parseInt(cleanVal, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: getMsg("invalidPrice"),
        parse_mode: "HTML",
      });
      return;
    }

    if (/ming|k/i.test(text) && priceNum < 10000) {
      priceNum = priceNum * 1000;
    } else if (priceNum < 1000) {
      priceNum = priceNum * 1000;
    }

    state.price = priceNum;
    state.step = "WAIT_SIZES";

    await askForSizes(chatId, userId, state);
    return;
  }

  // 3-qadam: Ixtiyoriy o'lchamlarni matn orqali kiritish
  if (state && state.step === "WAIT_CUSTOM_SIZE") {
    const rawSizes = text
      .split(/[,/;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    state.sizes = rawSizes.length > 0 ? rawSizes : ["Standart"];
    state.step = "WAIT_CHANNEL";

    await askForChannel(chatId, userId, state);
    return;
  }
}

// Rasmlarni yuklab olish va navbatdagi qadamga o'tkazish
async function processIncomingPhotos(chatId, userId, photoFileIds, rawCaption) {
  await callTelegram("sendChatAction", { chat_id: chatId, action: "upload_photo" });

  const downloadedImages = [];
  for (let i = 0; i < photoFileIds.length; i++) {
    const fileId = photoFileIds[i];
    const prefix = i === 0 ? "main" : `side${i}`;
    const localSrc = await downloadTelegramPhoto(fileId, prefix);
    if (localSrc) {
      downloadedImages.push({
        src: localSrc,
        fileId: fileId,
        alt: i === 0 ? "Asosiy old rakurs" : `Rakurs ${i + 1}`,
      });
    }
  }

  if (downloadedImages.length === 0) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "❌ Rasmlarni saqlashda xatolik yuz berdi. Qaytadan urinib ko'ring.",
      reply_markup: getAdminMainKeyboard(),
    });
    return;
  }

  // Tezkor usul: agar captiondan nom va narx topilsa
  const { name: dName, price: dPrice } = parseNameAndPrice(rawCaption);

  let state = userStates.get(userId) || {};
  state = {
    ...state,
    images: downloadedImages,
    detectedName: dName,
    detectedPrice: dPrice,
    name: dName || state.name || "",
    price: dPrice || state.price || 0,
  };
  userStates.set(userId, state);

  // A. Tezkor usul: agar rasm tagida nom va narx to'liq yozilgan bo'lsa darhol O'lchamga o'tamiz
  if (dName && dPrice) {
    state.step = "WAIT_SIZES";
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `📸 <b>${downloadedImages.length} ta rasm yuklandi!</b>\n` +
        `📝 Nom: <b>${dName}</b>\n` +
        `💰 Narx: <b>${formatPrice(dPrice)}</b>\n\n` +
        getMsg("stepSizes"),
      parse_mode: "HTML",
    });
    await askForSizes(chatId, userId, state);
    return;
  }

  // B. Agar faqat nom topilgan bo'lsa, narxga o'tamiz
  if (dName) {
    state.step = "WAIT_PRICE";
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `✅ <b>${downloadedImages.length} ta rasm qabul qilindi!</b>\n📝 Nom: <b>${dName}</b>\n\n${getMsg("stepPrice")}`,
      parse_mode: "HTML",
    });
    return;
  }

  // C. Yangi qadamma-qadam oqim: 1-qadam (Nom so'rash)
  state.step = "WAIT_NAME";
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `✅ <b>${downloadedImages.length} ta rasm qabul qilindi va bazaga saqlandi!</b>\n\n${getMsg("stepName")}`,
    parse_mode: "HTML",
  });
}

// 3-qadam: O'lchamlarni so'rash klaviaturasi
async function askForSizes(chatId, userId, state) {
  const presets = getSizePresets();
  const inlineRows = [];

  for (let i = 0; i < presets.length; i += 2) {
    const row = [
      { text: presets[i].label, callback_data: `sz_${presets[i].id}_${userId}` },
    ];
    if (presets[i + 1]) {
      row.push({ text: presets[i + 1].label, callback_data: `sz_${presets[i + 1].id}_${userId}` });
    }
    inlineRows.push(row);
  }

  inlineRows.push([
    { text: getBtn("customSize") || "✍️ Boshqa o'lcham", callback_data: `sz_custom_${userId}` },
  ]);

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text:
      `📦 <b>Mahsulot:</b> ${state.name}\n` +
      `💰 <b>Narxi:</b> ${formatPrice(state.price)}\n\n` +
      getMsg("stepSizes"),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: inlineRows },
  });
}

// 4-qadam: Qaysi kanalga joylashni so'rash
async function askForChannel(chatId, userId, state) {
  state.step = "WAIT_CHANNEL";
  const groups = await getTelegramGroups();
  const inline_keyboard = [];

  // Asosiy kanal
  if (config.targetChatId) {
    inline_keyboard.push([
      {
        text: `📢 Asosiy kanal (${config.targetChatId})`,
        callback_data: `chan_${config.targetChatId}_${userId}`,
      },
    ]);
  }

  // Boshqa ulangan kanallar
  if (Array.isArray(groups)) {
    for (const g of groups) {
      if (String(g.chatId) !== String(config.targetChatId)) {
        inline_keyboard.push([
          {
            text: `📢 ${g.title || g.chatId}`,
            callback_data: `chan_${g.chatId}_${userId}`,
          },
        ]);
      }
    }
  }

  // Faqat saytga (kanalga shart emas)
  inline_keyboard.push([
    {
      text: getBtn("onlySite") || "🌐 Faqat saytga (Kanalga shart emas)",
      callback_data: `chan_none_${userId}`,
    },
  ]);

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: getMsg("stepChannel"),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard },
  });
}

// 5-qadam: Tasdiq (Confirmation) ko'rsatish
async function askForConfirmation(chatId, userId, state) {
  state.step = "WAIT_CONFIRM";
  const category = detectCategory(state.name);
  state.category = category;

  const targetLabel = state.chosenChatId ? `📢 ${state.chosenChatTitle || state.chosenChatId}` : "🌐 Faqat saytga";

  const confirmText = getMsg("stepConfirm", {
    name: state.name,
    price: formatPrice(state.price),
    sizes: state.sizes?.join(", ") || "Standart",
    category,
    photoCount: state.images?.length || 0,
    targetChannel: targetLabel,
  });

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: getBtn("confirmDeploy") || "✅ Tasdiqlash va chiqarish",
          callback_data: `confirm_deploy_${userId}`,
        },
      ],
      [
        {
          text: getBtn("cancelDeploy") || "❌ Bekor qilish",
          callback_data: `cancel_deploy_${userId}`,
        },
      ],
    ],
  };

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: confirmText,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Callback queries
async function handleCallbackQuery(cb) {
  const cbId = cb.id;
  const data = cb.data || "";
  const chatId = cb.message?.chat?.id;
  const userId = cb.from?.id;

  // Har bir callbackda admin huquqini serverda tekshirish
  const isAdmin = await isUserAdmin(userId);
  if (!isAdmin) {
    await callTelegram("answerCallbackQuery", {
      callback_query_id: cbId,
      text: getMsg("accessDenied"),
      show_alert: true,
    });
    return;
  }

  // Buyurtma tugmalari callback query mantiqi (Requirements 3 & 4)
  if (data.startsWith("ord:")) {
    await handleOrderCallback(cb);
    return;
  }

  // Mahsulotni o'chirish
  if (data.startsWith("del_prod_")) {
    const prodId = data.replace("del_prod_", "");
    const prods = await getProducts();
    const targetProd = prods.find((p) => p.id === prodId);

    if (targetProd?.telegram?.chatId && Array.isArray(targetProd.telegram?.messageIds)) {
      const token = config.botToken?.trim();
      for (const msgId of targetProd.telegram.messageIds) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: targetProd.telegram.chatId, message_id: msgId }),
          });
        } catch {}
      }
    }

    await deleteProduct(prodId);
    await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "O'chirildi!" });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: getMsg("deleteSuccess", { name: targetProd?.name || "Mahsulot" }),
      parse_mode: "HTML",
      reply_markup: getAdminMainKeyboard(),
    });
    return;
  }

  const state = userStates.get(userId);

  if (data.startsWith("pick_name_")) {
    if (state && state.detectedName) {
      state.name = state.detectedName;
      state.step = "WAIT_PRICE";
      await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Nom saqlandi!" });

      const keyboard = state.detectedPrice
        ? {
            inline_keyboard: [
              [{ text: `⚡️ ${formatPrice(state.detectedPrice)}`, callback_data: `pick_price_${userId}` }],
            ],
          }
        : undefined;

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✅ Nom: <b>${state.name}</b>\n\n${getMsg("stepPrice")}`,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
    return;
  }

  if (data.startsWith("pick_price_")) {
    if (state && state.detectedPrice) {
      state.price = state.detectedPrice;
      state.step = "WAIT_SIZES";
      await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Narx saqlandi!" });
      await askForSizes(chatId, userId, state);
    }
    return;
  }

  // O'lchamlarni tanlash
  if (data.startsWith("sz_")) {
    if (!state) {
      await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Sessiya tugagan." });
      return;
    }

    if (data.includes("custom")) {
      state.step = "WAIT_CUSTOM_SIZE";
      await callTelegram("answerCallbackQuery", { callback_query_id: cbId });
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "✍️ <b>Kerakli o'lchamlarni vergul bilan yozing:</b>\n<i>Masalan: 42, 44, 46, 48</i>",
        parse_mode: "HTML",
      });
      return;
    }

    const presets = getSizePresets();
    const cleanTag = data.replace(`sz_`, "").replace(`_${userId}`, "");
    const foundPreset = presets.find((p) => p.id === cleanTag);
    state.sizes = foundPreset ? foundPreset.sizes : ["Standart"];

    await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "O'lcham saqlandi!" });
    // Navbatdagi qadam: Kanal tanlash
    await askForChannel(chatId, userId, state);
    return;
  }

  // Kanal tanlash
  if (data.startsWith("chan_")) {
    if (!state) {
      await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Sessiya tugagan." });
      return;
    }

    const rawId = data.replace("chan_", "").replace(`_${userId}`, "");
    if (rawId === "none") {
      state.chosenChatId = null;
      state.chosenChatTitle = "Faqat saytga";
    } else {
      state.chosenChatId = rawId;
      state.chosenChatTitle = rawId;
    }

    await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Kanal tanlandi!" });
    // Navbatdagi qadam: Tasdiqlash
    await askForConfirmation(chatId, userId, state);
    return;
  }

  // Tasdiqlash va chiqarish
  if (data === `confirm_deploy_${userId}`) {
    if (!state) {
      await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Sessiya topilmadi." });
      return;
    }
    await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Chiqarilmoqda..." });
    await autoDeployProduct(chatId, userId, state);
    userStates.delete(userId);
    return;
  }

  // Bekor qilish
  if (data === `cancel_deploy_${userId}`) {
    userStates.delete(userId);
    await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Bekor qilindi" });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: getMsg("deployCanceled"),
      parse_mode: "HTML",
      reply_markup: getAdminMainKeyboard(),
    });
    return;
  }
}

// 6. Avto-Deploy: Web-saytga va Telegram Kanalga (URL tugma bilan)
async function autoDeployProduct(chatId, userId, state) {
  config = loadConfig();

  const slug =
    state.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";

  const productId = `${slug}-${Date.now().toString(36)}`;

  const formattedImages = state.images.map((img, idx) => ({
    src: img.src,
    fileId: img.fileId,
    alt: idx === 0 ? `${state.name} - asosiy ko'rinish` : `${state.name} - rakurs ${idx + 1}`,
  }));

  let channelPublished = false;
  let telegramInfo = null;

  // Qaysi kanal tanlangan bo'lsa (yoki config.targetChatId)
  const targetChat = state.chosenChatId !== undefined ? state.chosenChatId : config.targetChatId;

  // Mini App va Bot havolasi
  const appName = process.env.TELEGRAM_APP_NAME || brandConfig.bot?.APP_NAME || "app";
  const botUsername = (config.botUsername || process.env.BOT_USERNAME || brandConfig.bot?.BOT_USERNAME || "bot").replace(/^@/, "");

  // Talab bo'yicha: https://t.me/{BOT_USERNAME}/{APP_NAME}?startapp=product_{id}
  const buyUrl = `https://t.me/${botUsername}/${appName}?startapp=product_${productId}`;

  if (targetChat && state.images.length > 0) {
    const postCaption =
      `✨ <b>${state.name}</b> ✨\n\n` +
      `📏 <b>O'lchami:</b> ${state.sizes.join(", ")}\n` +
      `💰 <b>Narxi:</b> ${formatPrice(state.price)} 🏷\n\n` +
      `🛍 <b>${getBtn("buyNow") || "Buyurtma berish"}:</b> <a href="${buyUrl}">Xarid qilish</a> (yoki quyidagi tugma orqali)`;

    // Talab bo'yicha: web_app emas, oddiy URL tugma
    const channelInlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: getBtn("buyNow") || "🛍 Buyurtma berish",
            url: buyUrl,
          },
        ],
      ],
    };

    try {
      if (state.images.length === 1) {
        const res = await callTelegram("sendPhoto", {
          chat_id: targetChat,
          photo: state.images[0].fileId,
          caption: postCaption,
          parse_mode: "HTML",
          reply_markup: channelInlineKeyboard,
        });
        if (res?.ok && res.result?.message_id) {
          channelPublished = true;
          telegramInfo = {
            chatId: targetChat,
            messageIds: [res.result.message_id],
          };
        }
      } else {
        const media = state.images.slice(0, 10).map((img, idx) => ({
          type: "photo",
          media: img.fileId,
          caption: idx === 0 ? postCaption : undefined,
          parse_mode: "HTML",
        }));

        const res = await callTelegram("sendMediaGroup", {
          chat_id: targetChat,
          media,
        });

        if (res?.ok && Array.isArray(res.result)) {
          channelPublished = true;
          const msgIds = res.result.map((m) => m.message_id).filter(Boolean);
          telegramInfo = {
            chatId: targetChat,
            messageIds: msgIds,
          };

          // Albom ostiga buyurtma berish URL tugmasini alohida xabar qilib biriktirish
          await callTelegram("sendMessage", {
            chat_id: targetChat,
            text: `👆 <b>${state.name}</b> uchun to'g'ridan-to'g'ri buyurtma berish:`,
            parse_mode: "HTML",
            reply_to_message_id: msgIds[0],
            reply_markup: channelInlineKeyboard,
          });
        }
      }
    } catch (err) {
      console.error("[DEPLOY]: Kanalga joylashda xatolik:", err.message);
    }
  }

  const category = state.category || detectCategory(state.name);

  const productData = {
    id: productId,
    name: state.name,
    price: state.price,
    images: formattedImages,
    category,
    isNew: true,
    isPopular: false,
    salesCount: 0,
    sizes: state.sizes,
    description: `${state.name}. Sifatli mato va zamonaviy bichim.`,
    telegram: telegramInfo,
  };

  try {
    await createProduct(productData);
    console.log(`[DEPLOY]: '${state.name}' muvaffaqiyatli saqlandi!`);
  } catch (err) {
    console.error("[DEPLOY]: DB ga yozishda xatolik:", err.message);
  }

  const channelResult = channelPublished
    ? `📢 <b>Telegram kanalga post qilindi!</b>\n`
    : (targetChat ? `⚠️ <i>Kanalga joylashda xatolik yoki kanal belgilanmagan. Saytga joylandi.</i>\n` : `🌐 <i>Faqat saytga joylandi (Kanalga joylanmadi).</i>\n`);

  const resultMsg = getMsg("deploySuccess", {
    name: state.name,
    price: formatPrice(state.price),
    sizes: state.sizes?.join(", "),
    category,
    channelResult,
  });

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: resultMsg,
    parse_mode: "HTML",
    reply_markup: getAdminMainKeyboard(),
  });
}

// Bot kanal/guruhga qo'shilganda
async function handleMyChatMember(memberUpdate) {
  const chat = memberUpdate.chat;
  const newStatus = memberUpdate.new_chat_member?.status;

  if (chat && (chat.type === "channel" || chat.type === "supergroup" || chat.type === "group")) {
    const isChan = chat.type === "channel";
    const typeLabel = isChan ? "Kanal" : "Guruh";
    const title = chat.title || chat.username || typeLabel;

    await saveTelegramGroup({
      chatId: chat.id,
      title,
      type: chat.type,
      username: chat.username || "",
      isTarget: newStatus === "administrator",
    });

    if (newStatus === "administrator") {
      config = loadConfig();
      config.targetChatId = chat.id;
      saveConfig(config);

      console.log(`[BOT]: Bot ${typeLabel.toLowerCase()}ga admin bo'ldi: ${title} (${chat.id})`);

      await callTelegram("sendMessage", {
        chat_id: chat.id,
        text:
          `✅ <b>Do'kon boti ushbu ${typeLabel.toLowerCase()}ga muvaffaqiyatli ulandi!</b>\n\n` +
          `📢 ${typeLabel}: <b>${title}</b>\n` +
          `🆔 ID: <code>${chat.id}</code>\n\n` +
          `Endi bot orqali qo'shilgan mahsulotlar shu yerga avtomatik joylanadi! 🚀`,
        parse_mode: "HTML",
      });
    }
  }
}

// Asosiy polling tsikli
let lastUpdateId = 0;

async function startPolling() {
  config = loadConfig();
  const token = config.botToken?.trim();

  if (!token) {
    console.error("\x1b[31m[XATOLIK]: BOT_TOKEN topilmadi, .env faylini to'ldiring!\x1b[0m");
    process.exit(1);
  }

  try {
    const me = await callTelegram("getMe");
    if (!me?.ok) {
      console.error("\x1b[31m[TELEGRAM BOT]: Bot token noto'g'ri yoki Telegramga ulanib bo'lmadi.\x1b[0m");
      setTimeout(startPolling, 10000);
      return;
    }

    console.log(`\x1b[32m[TELEGRAM BOT]: @${me.result.username} (yagona bot) faol ishga tushdi!\x1b[0m`);

    // WebApp do'kon tugmasini har bir chat menyusiga qo'yish
    if (config.webAppUrl) {
      try {
        await callTelegram("setChatMenuButton", {
          menu_button: {
            type: "web_app",
            text: getBtn("launchApp") || "🛍 Do'kon",
            web_app: { url: config.webAppUrl },
          },
        });
      } catch {}
    }

    while (true) {
      try {
        const res = await callTelegram("getUpdates", {
          offset: lastUpdateId + 1,
          timeout: 25,
          allowed_updates: [
            "message",
            "edited_message",
            "channel_post",
            "edited_channel_post",
            "callback_query",
            "my_chat_member",
          ],
        });

        if (res?.ok && Array.isArray(res.result)) {
          for (const update of res.result) {
            lastUpdateId = update.update_id;
            if (update.message) {
              await handleMessage(update.message);
            } else if (update.channel_post) {
              await handleMessage(update.channel_post);
            } else if (update.edited_channel_post) {
              await handleMessage(update.edited_channel_post);
            } else if (update.callback_query) {
              await handleCallbackQuery(update.callback_query);
            } else if (update.my_chat_member) {
              await handleMyChatMember(update.my_chat_member);
            }
          }
        }
      } catch (err) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  } catch (err) {
    console.error("[BOT ERROR]:", err.message);
    setTimeout(startPolling, 10000);
  }
}

// Har kuni 22:00 da (Asia/Tashkent) "Hisobotlar" topikiga avtomatik hisobot yuborish (Requirement 5)
setInterval(async () => {
  try {
    const now = new Date();
    const timeTashkent = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Tashkent",
      hour12: false,
    });
    const [hh, mm] = timeTashkent.split(":");
    const targetTime = brandConfig.dailyReportTime || "22:00";
    const [targetH, targetM] = targetTime.split(":");

    if (hh === targetH && mm === targetM) {
      const todayDate = now.toLocaleDateString("en-CA", {
        timeZone: "Asia/Tashkent",
      });
      const lastSent = await getSetting("daily_report_last_sent");
      if (lastSent !== todayDate) {
        await setSetting("daily_report_last_sent", todayDate);
        console.log(`[DAILY REPORT]: ${todayDate} sana uchun 22:00 hisoboti yuborilmoqda...`);
        await sendDailyReport(false);
      }
    }
  } catch (err) {
    console.warn("[DAILY REPORT SCHEDULER WARN]:", err.message);
  }
}, 30000);

startPolling();
