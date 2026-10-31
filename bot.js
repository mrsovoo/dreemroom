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
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, "bot-config.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID ? String(process.env.OWNER_TELEGRAM_ID).trim() : "";

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
    process.env.ADMIN_BOT_TOKEN ||
    process.env.ORDER_BOT_TOKEN ||
    fileCfg.botToken ||
    "";

  return {
    botToken,
    botUsername: process.env.BOT_USERNAME || process.env.ADMIN_BOT_USERNAME || fileCfg.botUsername || "",
    targetChatId: process.env.TARGET_CHAT_ID ? Number(process.env.TARGET_CHAT_ID) : (fileCfg.targetChatId || ""),
    webAppUrl: process.env.WEB_APP_URL || fileCfg.webAppUrl || "https://dreemroom.vercel.app",
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

// Album (media_group_id) accumulator
const albumBuffers = new Map();
// Standalone multi-photo buffer
const standalonePhotoBuffers = new Map();

// Session states for step-by-step product creation
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

// Helper: Download photo file from Telegram and save directly to DB product_images (diskka emas)
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

    // Sayt va bot uchun universal rasm havolasini qaytaramiz
    return `/api/images?id=${encodeURIComponent(filename)}`;
  } catch (err) {
    console.error("Rasmni saqlashda xatolik:", err.message);
    return null;
  }
}

// Helper: Narxni chiroyli formatlash
function formatPrice(price) {
  let num = parseInt(String(price).replace(/\D/g, ""), 10);
  if (isNaN(num)) return "0 so'm";
  if (num > 0 && num < 1000) {
    num = num * 1000;
  }
  return `${num.toLocaleString("ru-RU")} so'm`;
}

// Helper: Captiondan nom va narxni ajratish
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
  if (n.includes("kurtka") || n.includes("jaket") || n.includes("palto")) return "Kurtka";
  if (n.includes("chopon")) return "Choponlar";
  if (n.includes("sviter") || n.includes("kardigan") || n.includes("jemper")) return "Sviter";
  if (n.includes("sport") || n.includes("dvoyka") || n.includes("troyka")) return "Sport kiyimlari";
  if (n.includes("ko'ylak") || n.includes("dress")) return "Ko'ylaklar";
  if (n.includes("shim") || n.includes("jinsi") || n.includes("bryuk")) return "Shimlar";
  return "Katalog";
}

// Bosh klaviatura (Faqat Adminlar uchun ko'rinadi)
const ADMIN_MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "➕ Qo'shish" }, { text: "🗑 O'chirish" }],
    [{ text: "📊 Hisobot" }, { text: "🛍 Do'konni ochish" }],
  ],
  resize_keyboard: true,
};

// Handle incoming messages
async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const chatType = msg.chat?.type; // 'private', 'group', 'supergroup', 'channel'
  const userId = msg.from?.id || chatId;
  const text = msg.text?.trim() || "";
  const caption = msg.caption?.trim() || "";
  const photo = msg.photo;

  config = loadConfig();

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

  // Faqat shaxsiy chatdagi xabarlar
  const isAdmin = await isUserAdmin(userId);
  const webAppUrl = config.webAppUrl || process.env.WEB_APP_URL || "https://dreemroom.vercel.app";

  const LAUNCH_BUTTON = {
    inline_keyboard: [
      [
        {
          text: "🛍 Do'konni ochish (Launch App)",
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
        text:
          `👋 <b>Assalomu alaykum, Hurmatli Admin (${msg.from?.first_name || ""})!</b>\n\n` +
          `Siz do'kon boshqaruvchisiz. Quyidagi menyu orqali yangi mahsulot qo'shishingiz, o'chirishingiz yoki do'kon hisobotini ko'rishingiz mumkin.\n\n` +
          `📢 Ulangan kanal/guruh: <code>${config.targetChatId || "Belgilanmagan"}</code>`,
        parse_mode: "HTML",
        reply_markup: ADMIN_MAIN_KEYBOARD,
      });

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `Mijozlar ko'rinishidagi do'konni ochish:`,
        reply_markup: LAUNCH_BUTTON,
      });
      return;
    }

    // Oddiy xaridor (mijoz) uchun
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `🌸 <b>Assalomu alaykum, xush kelibsiz!</b>\n\n` +
        `Bizning barcha yangi to'plamlarimizni ko'rish, o'lchamlarni tanlash va buyurtma berish uchun quyidagi tugmani bosing:`,
      parse_mode: "HTML",
      reply_markup: LAUNCH_BUTTON,
    });
    return;
  }

  // Agar oddiy foydalanuvchi "Do'konni ochish" deb yozsa
  if (text === "🛍 Do'konni ochish") {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Do'konimiz katalogini ochish uchun quyidagi tugmani bosing:`,
      reply_markup: LAUNCH_BUTTON,
    });
    return;
  }

  // ========================================================================
  // SERVER DARAJASIDAGI ADMIN HUQUQI TEKSHIRUVI
  // (Quyidagi barcha amallar faqat adminlar uchungina ruxsat etiladi)
  // ========================================================================
  if (!isAdmin) {
    if (text === "➕ Qo'shish" || text === "🗑 O'chirish" || text === "📊 Hisobot" || (photo && photo.length > 0)) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `🌸 <b>Assalomu alaykum!</b> Do'konimizni ko'rish va xarid qilish uchun quyidagi tugmani bosing:`,
        parse_mode: "HTML",
        reply_markup: LAUNCH_BUTTON,
      });
      return;
    }
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
      reply_markup: ADMIN_MAIN_KEYBOARD,
    });
    return;
  }

  // 📊 Hisobot
  if (text === "📊 Hisobot") {
    userStates.delete(userId);
    const prods = await getProducts();
    const orders = readOrders();
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const newOrders = orders.filter((o) => o.status === "Yangi").length;

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `📊 <b>Do'kon hisoboti:</b>\n\n` +
        `📦 <b>Jami mahsulotlar:</b> ${prods.length} ta\n` +
        `🛍 <b>Jami buyurtmalar:</b> ${orders.length} ta\n` +
        `💰 <b>Jami tushum:</b> ${revenue.toLocaleString("ru-RU")} so'm\n` +
        `🆕 <b>Kutilayotgan yangi buyurtmalar:</b> ${newOrders} ta\n\n` +
        `📢 <b>Ulangan kanal:</b> <code>${config.targetChatId || "Belgilanmagan"}</code>`,
      parse_mode: "HTML",
      reply_markup: ADMIN_MAIN_KEYBOARD,
    });
    return;
  }

  // 🗑 O'chirish
  if (text === "🗑 O'chirish") {
    userStates.delete(userId);
    const prods = await getProducts();
    if (!prods || prods.length === 0) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "ℹ️ Hozirda do'konda o'chirish uchun mahsulotlar yo'q.",
        reply_markup: ADMIN_MAIN_KEYBOARD,
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
      text: "🗑 <b>O'chirmoqchi bo'lgan mahsulotingizni tanlang:</b>\n<i>(Saytdan ham, ulangan kanaldan ham o'chiriladi)</i>",
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
    return;
  }

  // ➕ Qo'shish
  if (text === "➕ Qo'shish") {
    userStates.set(userId, { step: "WAIT_PHOTO" });
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `📸 <b>Mahsulot rasmlarini yuboring (1 tadan 4 tagacha):</b>\n\n` +
        `💡 <i>1-rasm bosh asosiy rasm bo'ladi, qolganlari qo'shimcha rakurslar bo'ladi.\n` +
        `Rasmlar tagiga narxi va nomini yozib (caption) yuborsangiz ham bo'ladi!</i>`,
      parse_mode: "HTML",
    });
    return;
  }

  // Rasmlarni qabul qilish
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
      text:
        `✅ Nom saqlandi: <b>${state.name}</b>\n\n` +
        `💰 <b>2-qadam. Mahsulot narxini kiriting:</b>\n` +
        `<i>Masalan: <code>350000</code> yoki <code>350 ming</code></i>`,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
    return;
  }

  if (state && state.step === "WAIT_PRICE") {
    let cleanVal = text.replace(/[\s.,so'm]/gi, "").trim();
    let priceNum = parseInt(cleanVal, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "❌ <b>Noto'g'ri narx!</b> Faqat raqam kiriting (masalan: <code>350000</code>):",
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

    await askForSizes(chatId, userId, state.name, state.price);
    return;
  }

  if (state && state.step === "WAIT_CUSTOM_SIZE") {
    const rawSizes = text
      .split(/[,/;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    state.sizes = rawSizes.length > 0 ? rawSizes : ["Standart"];
    userStates.delete(userId);

    await autoDeployProduct(chatId, userId, state);
    return;
  }
}

// Rasmlarni qabul qilib saqlash
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
      reply_markup: ADMIN_MAIN_KEYBOARD,
    });
    return;
  }

  const { name: dName, price: dPrice } = parseNameAndPrice(rawCaption);

  userStates.set(userId, {
    step: "WAIT_NAME",
    images: downloadedImages,
    detectedName: dName,
    detectedPrice: dPrice,
  });

  const keyboard = dName
    ? {
        inline_keyboard: [[{ text: `⚡️ ${dName}`, callback_data: `pick_name_${userId}` }]],
      }
    : undefined;

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text:
      `✅ <b>${downloadedImages.length} ta rasm qabul qilindi va bazaga saqlandi!</b>\n\n` +
      `📝 <b>1-qadam. Mahsulot nomini yozing:</b>\n` +
      `<i>Masalan: <code>Dvoyka to'plam</code> yoki <code>Klassik kardigan</code></i>`,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// O'lchamlarni tanlash klaviaturasi
async function askForSizes(chatId, userId, name, price) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✨ XS, S, M, L, XL", callback_data: `sz_XS_S_M_L_XL_${userId}` },
        { text: "S, M, L", callback_data: `sz_S_M_L_${userId}` },
      ],
      [
        { text: "Standart (Universal)", callback_data: `sz_Standart_${userId}` },
        { text: "L, XL, XXL", callback_data: `sz_L_XL_XXL_${userId}` },
      ],
      [
        { text: "Barchasi (XS–XXL)", callback_data: `sz_ALL_${userId}` },
        { text: "✍️ Boshqa razmer yozish", callback_data: `sz_custom_${userId}` },
      ],
    ],
  };

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text:
      `📦 <b>Mahsulot:</b> ${name}\n` +
      `💰 <b>Narxi:</b> ${formatPrice(price)}\n\n` +
      `📏 <b>O'lchamini (razmerini) tanlang:</b>`,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

// Callback queries (Tugmalar bosilishi)
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
      text: "⛔ Kechirasiz, ushbu amal faqat do'kon administratorlari uchun.",
      show_alert: true,
    });
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
      text: `✅ <b>"${targetProd?.name || "Mahsulot"}" sayt va kanaldan muvaffaqiyatli o'chirildi!</b>`,
      parse_mode: "HTML",
      reply_markup: ADMIN_MAIN_KEYBOARD,
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
        text:
          `✅ Nom: <b>${state.name}</b>\n\n` +
          `💰 <b>2-qadam. Mahsulot narxini kiriting:</b>\n` +
          `<i>Masalan: <code>350000</code> yoki <code>350 ming</code></i>`,
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
      await askForSizes(chatId, userId, state.name, state.price);
    }
    return;
  }

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

    let sizes = ["Standart"];
    if (data.includes("XS_S_M_L_XL")) sizes = ["XS", "S", "M", "L", "XL"];
    else if (data.includes("S_M_L")) sizes = ["S", "M", "L"];
    else if (data.includes("L_XL_XXL")) sizes = ["L", "XL", "XXL"];
    else if (data.includes("ALL")) sizes = ["XS", "S", "M", "L", "XL", "XXL"];
    else if (data.includes("Standart")) sizes = ["Standart"];

    state.sizes = sizes;
    userStates.delete(userId);
    await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Tayyor!" });

    await autoDeployProduct(chatId, userId, state);
    return;
  }
}

// Avto-Deploy: Mahsulotni DB ga va Telegram Kanalga joylash
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
  const targetChat = config.targetChatId;
  const botUser = config.botUsername || "";

  if (targetChat && state.images.length > 0) {
    const postCaption =
      `✨ <b>${state.name}</b> ✨\n\n` +
      `📏 <b>O'lchami:</b> ${state.sizes.join(", ")}\n` +
      `💰 <b>Narxi:</b> ${formatPrice(state.price)} 🏷\n\n` +
      `🛍 <b>Buyurtma berish:</b> ${botUser ? `@${botUser}` : "Do'kon boti orqali"}`;

    try {
      if (state.images.length === 1) {
        const res = await callTelegram("sendPhoto", {
          chat_id: targetChat,
          photo: state.images[0].fileId,
          caption: postCaption,
          parse_mode: "HTML",
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
        }
      }
    } catch (err) {
      console.error("[DEPLOY]: Kanalga joylashda xatolik:", err.message);
    }
  }

  const category = detectCategory(state.name);

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

  const resultMsg =
    `🎉 <b>Mahsulot muvaffaqiyatli joylandi!</b>\n\n` +
    `👗 <b>Nom:</b> ${state.name}\n` +
    `💰 <b>Narx:</b> ${formatPrice(state.price)}\n` +
    `📏 <b>O'lcham:</b> ${state.sizes.join(", ")}\n` +
    `📂 <b>Kategoriya:</b> ${category}\n` +
    `🖼 <b>Rasmlar:</b> ${state.images.length} ta (bazaga saqlandi)\n\n` +
    (channelPublished
      ? `📢 <b>Telegram kanalga post qilindi!</b>\n`
      : `⚠️ <i>Kanal belgilanmagan yoki xatolik. Saytga joylandi.</i>\n`) +
    `🌐 <b>Veb-saytda darhol ko'rish mumkin!</b>`;

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: resultMsg,
    parse_mode: "HTML",
    reply_markup: ADMIN_MAIN_KEYBOARD,
  });
}

// Bot yangi kanal/guruhga qo'shilganda
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
    console.log("\x1b[33m[TELEGRAM BOT]: BOT_TOKEN kiritilmagan. Bot hozircha kutish rejimida.\x1b[0m");
    setTimeout(startPolling, 10000);
    return;
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
            text: "🛍 Do'kon",
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

startPolling();
