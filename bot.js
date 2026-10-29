import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {}

import { createProduct } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, "bot-config.json");
const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");
const IMAGES_DIR = path.join(__dirname, "public", "images");

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
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

  return {
    // 1. Admin Bot Token (@dreemroom_adm_bot)
    botToken: process.env.ADMIN_BOT_TOKEN || process.env.BOT_TOKEN || fileCfg.botToken || "8977841290:AAG4PpBjjq-sbHA_5NWiggjP0yqR6gMYF2A",
    adminBotUsername: process.env.ADMIN_BOT_USERNAME || fileCfg.adminBotUsername || "dreemroom_adm_bot",

    // 2. Mijozlar uchun Buyurtma Boti (@dreemroom_bot)
    orderBotToken: process.env.ORDER_BOT_TOKEN || fileCfg.orderBotToken || "",
    orderBotUsername: process.env.ORDER_BOT_USERNAME || fileCfg.orderBotUsername || "dreemroom_bot",

    // 3. Maqsadli Telegram Kanal yoki Guruh ID
    targetChatId: process.env.TARGET_CHAT_ID ? Number(process.env.TARGET_CHAT_ID) : (fileCfg.targetChatId || ""),

    // 4. Admin kalit so'zi
    adminSecret: process.env.ADMIN_SECRET || fileCfg.adminSecret || "dreemroom-adm",
    adminIds: fileCfg.adminIds || [],

    // 5. Web App URL (Vercel yoki lokal URL)
    webAppUrl: process.env.WEB_APP_URL || fileCfg.webAppUrl || "http://localhost:5173",
  };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.error("bot-config.json saqlashda xatolik:", err);
  }
}

function readProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
    }
  } catch {
    return [];
  }
  return [];
}

function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf-8");
  } catch (err) {
    console.error("products.json saqlashda xatolik:", err);
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

// In-memory states
const userStates = new Map();

// Album (media_group_id) accumulator
// key: media_group_id, value: { photos: [{fileId, order}], caption, timer, chatId, userId }
const albumBuffers = new Map();

// Standalone multi-photo buffer for photos sent without media_group_id
// key: userId, value: { photos: [], timer, caption, chatId }
const standalonePhotoBuffers = new Map();

// Helper: Call Telegram API
async function callTelegram(method, payload = {}) {
  const token = config.botToken?.trim();
  if (!token) return null;

  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API xatosi (${method}):`, err.message);
    return null;
  }
}

// Helper: Download a photo file from Telegram to public/images/
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

    const filename = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}.jpg`;
    const destPath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(destPath, buffer);

    return `/images/${filename}`;
  } catch (err) {
    console.error("Rasmni saqlashda xatolik:", err.message);
    return null;
  }
}

// Helper: Narxni faqat so'mda ko'rsatish (180 yoki 45 kiritilsa ham 180 000 yoki 45 000 so'm bo'ladi)
function formatPrice(price) {
  let num = typeof price === "number" ? price : parseInt(String(price).replace(/[^0-9]/g, ""), 10) || 0;
  if (num > 0 && num < 1000) {
    num = num * 1000;
  }
  return `${num.toLocaleString("ru-RU")} so'm`;
}

// Extract Name, Price and Sizes from caption/text intelligently
function parseNameAndPrice(text = "") {
  if (!text || !text.trim()) {
    return { name: "Yangi to'plam", price: 180000, extractedSize: null };
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let price = 0;
  let extractedSize = null;
  const nameLines = [];

  for (const line of lines) {
    // 1. O'lcham (Size) qatorini aniqlash
    const sizeMatch = line.match(/(?:размер|razmer|o['`]?lcham|size)s?\s*[:=-]?\s*(.+)/i);
    if (sizeMatch) {
      const val = sizeMatch[1].trim().toLowerCase();
      if (/стандарт|standart|universal|free/i.test(val)) {
        extractedSize = ["Standart"];
      } else {
        const found = val.toUpperCase().match(/(?:XXL|3XL|2XL|XL|XS|[SML]|[0-9]{2})/g);
        if (found && found.length) {
          extractedSize = [...new Set(found)];
        }
      }
      continue;
    }

    // 2. Buyurtma / aloqa / kontakt / link qatorlarini tashlab yuborish
    const isContactLine =
      /(?:для заказа|buyurtma|murojaat|aloqa|bog['`]?lanish|zakaz|админ|admin|tg:|тел:|tel:)/i.test(line) ||
      line.startsWith("@") ||
      line.startsWith("t.me/");
    if (isContactLine) {
      continue;
    }

    // 3. Narx (Price) qatorini aniqlash
    const hasPriceWord = /(?:цена|narx|narxi|price|baho)/i.test(line);
    const hasPriceSymbol = line.includes("$") || /so['`]?m|сум|🏷/i.test(line) || /[0-9]{1,3}[.,\s][0-9]{3}/.test(line);

    if (hasPriceWord || hasPriceSymbol) {
      const rawNum = line.match(/([0-9]{1,3}(?:[.,\s][0-9]{3})+|[0-9]{2,6})/);
      if (rawNum && !price) {
        price = parseInt(rawNum[1].replace(/[^0-9]/g, ""), 10);
      }
      // Agar qatorda narxdan tashqari nom ham bo'lsa (masalan: "Ziyo to'plam 250.000 so'm")
      const cleanedLine = line
        .replace(/(?:цена|narx|narxi|price|baho)\s*[:=-]?/gi, "")
        .replace(/([0-9]{1,3}(?:[.,\s][0-9]{3})+|[0-9]{2,6})\s*(?:\$|so['`]?m|сум|🏷)?/gi, "")
        .replace(/[:=–\-\s🏷]+$/g, "")
        .replace(/^[:=–\-\s🏷]+/g, "")
        .trim();
      if (cleanedLine.length >= 2) {
        nameLines.push(cleanedLine);
      }
    } else {
      nameLines.push(line);
    }
  }

  let name = nameLines.join(" ").replace(/^[•\-\*#]+\s*/, "").trim();
  if (!name || name.length < 2) {
    name = "Yangi to'plam";
  }
  if (!price) {
    price = 180000;
  } else if (price < 1000) {
    price = price * 1000;
  }

  return { name, price, extractedSize };
}

// Mahsulot nomidan toifani aqlli aniqlash (Dvoyka, Pijama, Kostyum va h.k.)
function detectCategory(name) {
  const n = (name || "").toLowerCase().trim();
  if (/dvoyka|dvoika|ikkitalik|2-talik/i.test(n)) return "Dvoyka";
  if (/troyka|troika|uchtalik|3-talik/i.test(n)) return "Troyka";
  if (/pijama|uy kiyim|tunika/i.test(n)) return "Pijama";
  if (/kostyum|kostum|suit/i.test(n)) return "Kostyum";
  if (/koylak|ko'ylak|platye|dress/i.test(n)) return "Ko'ylak";
  if (/xudi|hoodie|tolstovka|sviter/i.test(n)) return "Xudi";
  if (/shim|losina|leggins|leggings|bryuki/i.test(n)) return "Shim";
  if (/kurtka|vetrovka|nimcha|jilet/i.test(n)) return "Tashqi kiyim";
  if (/futbolka|futbolka|mayka|top/i.test(n)) return "Futbolka & Top";
  if (/sport|fitnes/i.test(n)) return "Sport kiyim";

  const firstWord = (name || "").split(/\s+/)[0]?.trim();
  if (firstWord && firstWord.length >= 2) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }
  return "Katalog";
}

// 2 main buttons keyboard
const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "➕ Qo'shish" }, { text: "📊 Hisobot" }],
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

  // ========================================================================
  // A. Guruh/Kanalni avtomatik tanib olish ("dreemroom-adm")
  // ========================================================================
  const secretKey = (config.adminSecret || "dreemroom-adm").toLowerCase().trim();
  const combinedText = `${text} ${caption}`.toLowerCase().trim();

  // 1. Agar xabar kanal, superguruh yoki guruhdan kelsa va matnida kalit so'z bo'lsa:
  if ((chatType === "channel" || chatType === "group" || chatType === "supergroup") && combinedText.includes(secretKey)) {
    config.targetChatId = chatId;
    saveConfig(config);

    const isChan = chatType === "channel";
    const typeLabel = isChan ? "Kanal" : "Guruh";
    const title = msg.chat?.title || msg.chat?.username || typeLabel;

    console.log(`[BOT]: ${typeLabel} muvaffaqiyatli ulandi: ${title} (${chatId})`);

    // Kanal/Guruhga tasdiq xabari
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `✅ <b>Ushbu ${typeLabel.toLowerCase()} DREEM ROOM do'koniga muvaffaqiyatli ulandi!</b>\n\n` +
        `📢 ${typeLabel}: <b>${title}</b>\n` +
        `🆔 ID: <code>${chatId}</code>\n\n` +
        `Endi bot orqali mahsulot qo'shilganda shu yerga avtomatik e'lon joylanadi! 🚀`,
      parse_mode: "HTML",
    });

    // Shaxsiy chatdagi adminlarga ham tasdiq xabari yuborish
    if (Array.isArray(config.adminIds)) {
      for (const admId of config.adminIds) {
        await callTelegram("sendMessage", {
          chat_id: admId,
          text:
            `📢 <b>${typeLabel} muvaffaqiyatli ulandi!</b>\n\n` +
            `🔹 Nomi: <b>${title}</b>\n` +
            `🔹 ID: <code>${chatId}</code>\n\n` +
            `Kanalga "<code>dreemroom-adm</code>" yozildi va ulanish tasdiqlandi. Endi mahsulotlar shu yerga chiqadi!`,
          parse_mode: "HTML",
          reply_markup: MAIN_KEYBOARD,
        });
      }
    }
    return;
  }

  // 2. Agar foydalanuvchi kanaldagi maxsus "dreemroom-adm" matnli xabarni botga FORWARD qilsa:
  if (msg.forward_from_chat && !photo && (text.toLowerCase().includes(secretKey) || caption.toLowerCase().includes(secretKey))) {
    const fChat = msg.forward_from_chat;
    config.targetChatId = fChat.id;
    saveConfig(config);

    const title = fChat.title || fChat.username || fChat.id;
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `✅ <b>Kanal muvaffaqiyatli ulandi!</b>\n\n` +
        `📢 Kanal: <b>${title}</b>\n` +
        `🆔 ID: <code>${fChat.id}</code>\n\n` +
        `Bot orqali qo'shilgan mahsulotlar avtomatik shu kanalga va veb-saytga joylanadi!`,
      parse_mode: "HTML",
      reply_markup: MAIN_KEYBOARD,
    });
    return;
  }

  // 3. Agar foydalanuvchi shaxsiy chatda "/setchannel" yoki "/setgroup" deb yozsa:
  if (text.startsWith("/setchannel") || text.startsWith("/setgroup")) {
    const target = text.replace("/setchannel", "").replace("/setgroup", "").trim();
    if (!target) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "Iltimos, kanal/guruh nomini yoki ID sini kiriting:\nMasalan: <code>/setchannel @dreemroom_uz</code>",
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
      reply_markup: MAIN_KEYBOARD,
    });
    return;
  }

  // ========================================================================
  // B. Shaxsiy chatda Admin Autentifikatsiyasi (Kalit so'z)
  // ========================================================================
  const isAuth = config.adminIds && config.adminIds.includes(userId);

  if (!isAuth) {
    if (text === "/start") {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text:
          `👋 <b>DREEM ROOM Admin Botiga xush kelibsiz!</b>\n\n` +
          `🔐 <i>Iltimos, adminlik kalit so'zini kiriting:</i>`,
        parse_mode: "HTML",
      });
      return;
    }

    if (text.toLowerCase() === secretKey) {
      if (!config.adminIds) config.adminIds = [];
      if (!config.adminIds.includes(userId)) config.adminIds.push(userId);
      saveConfig(config);

      await callTelegram("sendMessage", {
        chat_id: chatId,
        text:
          `✅ <b>Kalit so'z to'g'ri! Siz admin sifatida tasdiqlandingiz.</b>\n\n` +
          `Quyidagi menyudan kerakli bo'limni tanlang:`,
        parse_mode: "HTML",
        reply_markup: MAIN_KEYBOARD,
      });
      return;
    } else {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text:
          `❌ <b>Noto'g'ri kalit so'z!</b>\n\n` +
          `Iltimos, adminlik kalit so'zini kiriting (masalan: <code>dreemroom-adm</code>):`,
        parse_mode: "HTML",
      });
      return;
    }
  }

  // ========================================================================
  // C. Tasdiqlangan Admin Buyruqlari
  // ========================================================================

  // /start
  if (text === "/start") {
    userStates.delete(userId);
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `👋 <b>Assalomu alaykum, Admin!</b>\n\n` +
        `📢 Ulangan kanal/guruh: <code>${config.targetChatId || "Belgilanmagan (Guruhga dreemroom-adm deb yozing)"}</code>\n\n` +
        `Kerakli bo'limni tanlang:`,
      parse_mode: "HTML",
      reply_markup: MAIN_KEYBOARD,
    });
    return;
  }

  // 📊 Hisobot
  if (text === "📊 Hisobot") {
    userStates.delete(userId);
    const prods = readProducts();
    const orders = readOrders();
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const newOrders = orders.filter((o) => o.status === "Yangi").length;

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `📊 <b>DREEM ROOM — Do'kon hisoboti:</b>\n\n` +
        `📦 <b>Jami mahsulotlar:</b> ${prods.length} ta\n` +
        `🛍 <b>Jami buyurtmalar:</b> ${orders.length} ta\n` +
        `💰 <b>Jami tushum:</b> ${revenue} $\n` +
        `🆕 <b>Kutilayotgan yangi buyurtmalar:</b> ${newOrders} ta\n\n` +
        `🌐 <i>Admin panel: http://localhost:3000</i>`,
      parse_mode: "HTML",
      reply_markup: MAIN_KEYBOARD,
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
        `💡 <i>Birinchi yuborilgan rasm — saytda bosh asosiy rasm bo'ladi, 2, 3, 4-rasmlar qo'shimcha rakurslar bo'ladi.\n` +
        `Rasmlar tagiga narxi va nomini yozib (caption) yuborsangiz ham bo'ladi!</i>`,
      parse_mode: "HTML",
    });
    return;
  }

  // ========================================================================
  // D. Rasmlarni qabul qilish (Bir nechta rasm / Albom / MediaGroup)
  // ========================================================================
  if (photo && photo.length > 0) {
    const highestPhoto = photo[photo.length - 1];
    const fileId = highestPhoto.file_id;

    // 1. Agar bir nechta rasm birdaniga tanlanib ALBOM (media_group_id) bo'lib kelsa:
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
      }, 1200); // 1.2 soniya ichida albomdagi 4 ta rasm to'liq yig'iladi

      return;
    }

    // 2. Agar foydalanuvchi rasmlarni ketma-ket (bittalab) yuborayotgan bo'lsa:
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

  // ========================================================================
  // E. Matnli javoblarni qabul qilish (Step by Step: Nom -> Narx -> Razmer)
  // ========================================================================
  const state = userStates.get(userId);

  // 1-qadam: Faqat Nom qabul qilish
  if (state?.step === "WAIT_NAME") {
    const name = text.trim();
    if (!name || name.length < 2) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: "Iltimos, mahsulot nomini yozing (masalan: <code>Dvoyka to'plam</code>):",
        parse_mode: "HTML",
      });
      return;
    }

    state.name = name;
    state.step = "WAIT_PRICE";

    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        `✅ Mahsulot nomi: <b>${state.name}</b>\n\n` +
        `💰 <b>2-qadam. Endi mahsulot narxini kiriting (faqat so'mda):</b>\n` +
        `<i>Masalan: <code>180</code> (180 000 so'm) yoki <code>250.000</code></i>`,
      parse_mode: "HTML",
    });
    return;
  }

  // 2-qadam: Faqat Narx qabul qilish (180 yoki 45 kiritilsa ham oxiriga 000 qo'shiladi)
  if (state?.step === "WAIT_PRICE") {
    const rawNum = text.match(/([0-9]{1,3}(?:[.,\s][0-9]{3})+|[0-9]+)/);
    let price = rawNum ? parseInt(rawNum[1].replace(/[^0-9]/g, ""), 10) : 0;

    if (!price || price <= 0) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text:
          `❌ <b>Narx noto'g'ri kiritildi!</b>\n\n` +
          `Iltimos, narxni raqamda kiriting (masalan: <code>180</code> yoki <code>180 000</code>):`,
        parse_mode: "HTML",
      });
      return;
    }

    // 180 yoki 45 deb yozilsa ham 180 000 yoki 45 000 so'm qilamiz
    if (price < 1000) {
      price = price * 1000;
    }

    state.price = price;
    state.step = "WAIT_SIZE";

    await askForSizes(chatId, userId, state.name, state.price);
    return;
  }

  if (state?.step === "CUSTOM_SIZE_INPUT") {
    const customSizes = text
      .split(/[,/\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    state.sizes = customSizes.length ? customSizes : ["Standart"];
    await autoDeployProduct(chatId, userId, state);
    return;
  }

  // Default fallback
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: "Quyidagi tugmalardan birini tanlang:",
    reply_markup: MAIN_KEYBOARD,
  });
}

// ==========================================================================
// F. Rasmlarni tartib bilan yuklab olish (1-rasm bosh asosiy, 2,3,4 qolganlari)
// ==========================================================================
async function processIncomingPhotos(chatId, userId, photoFileIds, rawCaption) {
  await callTelegram("sendChatAction", { chat_id: chatId, action: "upload_photo" });

  const count = photoFileIds.length;
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: `📸 <b>${count} ta rasm qabul qilindi.</b> Yuklab olinmoqda...\n<i>(1-rasm saytda bosh asosiy rasm qilinadi)</i>`,
    parse_mode: "HTML",
  });

  // Download all photos maintaining strict order (1st is main)
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
      reply_markup: MAIN_KEYBOARD,
    });
    return;
  }

  userStates.set(userId, {
    step: "WAIT_NAME",
    images: downloadedImages,
  });

  // 1-qadam: Faqat Nomini so'rash (alohida)
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text:
      `✅ <b>${downloadedImages.length} ta rasm muvaffaqiyatli saqlandi!</b>\n\n` +
      `📝 <b>1-qadam. Mahsulot nomini yozing:</b>\n` +
      `<i>Masalan: <code>Dvoyka to'plam</code> yoki <code>Sport kiyim</code></i>`,
    parse_mode: "HTML",
  });
}

// Ask for Sizes with inline keyboard
async function askForSizes(chatId, userId, name, price) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "Standart (Universal)", callback_data: `sz_Standart_${userId}` },
      ],
      [
        { text: "XS, S, M, L, XL", callback_data: `sz_XS_S_M_L_XL_${userId}` },
        { text: "S, M, L", callback_data: `sz_S_M_L_${userId}` },
      ],
      [
        { text: "L, XL, XXL", callback_data: `sz_L_XL_XXL_${userId}` },
        { text: "Barchasi (XS–XXL)", callback_data: `sz_ALL_${userId}` },
      ],
      [
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

// Handle Callback Queries (Size Click)
async function handleCallbackQuery(cb) {
  const cbId = cb.id;
  const data = cb.data || "";
  const chatId = cb.message?.chat?.id;
  const userId = cb.from?.id;

  const state = userStates.get(userId);

  // Nom tanlash (Captiondagi taklif qilingan nom)
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
          `✅ Mahsulot nomi: <b>${state.name}</b>\n\n` +
          `💰 <b>2-qadam. Mahsulot narxini kiriting:</b>\n` +
          `<i>Masalan: <code>180 000</code> yoki <code>250.000</code> yoki <code>45</code></i>`,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
    return;
  }

  // Narx tanlash (Captiondagi taklif qilingan narx)
  if (data.startsWith("pick_price_")) {
    if (state && state.detectedPrice) {
      state.price = state.detectedPrice;
      state.step = "WAIT_SIZE";
      await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "Narx saqlandi!" });
      await askForSizes(chatId, userId, state.name, state.price);
    }
    return;
  }

  if (data.startsWith("sz_custom_")) {
    if (state) {
      state.step = "CUSTOM_SIZE_INPUT";
      await callTelegram("answerCallbackQuery", { callback_query_id: cbId });
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `✍️ O'lchamlarni yozib yuboring (masalan: <code>40, 42, 44</code> yoki <code>2XL, 3XL</code>):`,
        parse_mode: "HTML",
      });
    }
    return;
  }

  if (data.startsWith("sz_")) {
    if (!state) {
      await callTelegram("answerCallbackQuery", {
        callback_query_id: cbId,
        text: "Vaqt tugagan, qaytadan boshlang.",
      });
      return;
    }

    let sizes = ["Standart"];
    if (data.includes("Standart")) sizes = ["Standart"];
    else if (data.includes("XS_S_M_L_XL")) sizes = ["XS", "S", "M", "L", "XL"];
    else if (data.includes("S_M_L")) sizes = ["S", "M", "L"];
    else if (data.includes("L_XL_XXL")) sizes = ["L", "XL", "XXL"];
    else if (data.includes("ALL")) sizes = ["XS", "S", "M", "L", "XL", "XXL"];

    state.sizes = sizes;
    await callTelegram("answerCallbackQuery", { callback_query_id: cbId, text: "O'lcham tanlandi!" });
    await autoDeployProduct(chatId, userId, state);
  }
}

// ==========================================================================
// G. Avto-Deploy: Web-saytga va Telegram Kanalga (Albom ko'rinishida)
// ==========================================================================
async function autoDeployProduct(chatId, userId, state) {
  config = loadConfig();

  const slug = state.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

  const productId = `${slug}-${Date.now().toString(36)}`;

  // Product images: 1st is main, 2nd, 3rd, 4th are details
  const formattedImages = state.images.map((img, idx) => ({
    src: img.src,
    alt: idx === 0 ? `${state.name} - asosiy ko'rinish` : `${state.name} - rakurs ${idx + 1}`,
  }));

  // 1. Publish to Telegram Channel / Group as Media Group (Album)
  let channelPublished = false;
  let telegramInfo = null;
  const targetChat = config.targetChatId;
  const orderBot = config.orderBotUsername || "dreemroom_bot";

  if (targetChat && state.images.length > 0) {
    const postCaption =
      `✨ <b>${state.name}</b> ✨\n\n` +
      `📏 <b>O'lchami:</b> ${state.sizes.join(", ")}\n` +
      `💰 <b>Narxi:</b> ${formatPrice(state.price)} 🏷\n\n` +
      `🛍 <b>Buyurtma berish:</b> @${orderBot}`;

    try {
      if (state.images.length === 1) {
        // 1 ta rasm bo'lsa
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
        // 4 ta rasm (albom) bo'lsa: 1-rasm boshida tavsifi bilan, qolganlari uning davomida albom bo'ladi
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
      console.error("Kanalga post chiqarishda xatolik:", err.message);
    }
  }

  // 2. Save into products.json (Live immediately on Web Store & Admin Panel)
  const category = detectCategory(state.name);

  const newProduct = {
    id: productId,
    name: state.name,
    price: state.price,
    images: formattedImages,
    category: category,
    season: "Barchasi",
    isNew: true,
    color: "Asosiy",
    sizes: state.sizes || ["Standart"],
    description: `${state.name}. Yuqori sifatli mato va qulay bichim.`,
    telegram: telegramInfo,
  };

  await createProduct(newProduct);

  // Clear state
  userStates.delete(userId);

  // 3. Confirm to Admin
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text:
      `🎉 <b>Mahsulot muvaffaqiyatli saqlandi va deploy qilindi!</b>\n\n` +
      `📦 <b>Nomi:</b> ${state.name}\n` +
      `🏷 <b>Toifasi:</b> ${category}\n` +
      `💰 <b>Narxi:</b> ${formatPrice(state.price)}\n` +
      `📏 <b>O'lchami:</b> ${state.sizes.join(", ")}\n` +
      `🖼 <b>Rasmlar soni:</b> ${state.images.length} ta (1-rasm asosiy)\n` +
      `🤖 <b>Buyurtma boti:</b> @${orderBot}\n\n` +
      `✅ <b>Web-saytga joylandi:</b> ${config.webAppUrl}\n` +
      `✅ <b>Admin panelda chiqdi:</b> http://localhost:3000\n` +
      (channelPublished
        ? `✅ <b>Telegram kanalga albom qilib post qilindi:</b> ${targetChat}\n`
        : targetChat
        ? `⚠️ <i>Kanalga yuborilmadi (bot kanalda admin ekanligini va post chiqarish ruxsati borligini tekshiring)</i>\n`
        : `ℹ️ <i>Guruh belgilanmagan. Kanal/guruhga botni qo'shib "dreemroom-adm" deb yozing</i>\n`),
    parse_mode: "HTML",
    reply_markup: MAIN_KEYBOARD,
  });
}

// Handle bot being added to channel/group as admin (my_chat_member)
async function handleMyChatMember(memberUpdate) {
  const chat = memberUpdate.chat;
  const newStatus = memberUpdate.new_chat_member?.status;

  if (chat && (chat.type === "channel" || chat.type === "supergroup" || chat.type === "group")) {
    if (newStatus === "administrator") {
      config = loadConfig();
      config.targetChatId = chat.id;
      saveConfig(config);

      const isChan = chat.type === "channel";
      const typeLabel = isChan ? "Kanal" : "Guruh";
      const title = chat.title || chat.username || typeLabel;

      console.log(`[BOT]: Bot ${typeLabel.toLowerCase()}ga admin qilib qo'shildi: ${title} (${chat.id})`);

      // Kanalga tasdiq xabari
      await callTelegram("sendMessage", {
        chat_id: chat.id,
        text:
          `✅ <b>DREEM ROOM boti ushbu ${typeLabel.toLowerCase()}ga muvaffaqiyatli ulandi!</b>\n\n` +
          `📢 ${typeLabel}: <b>${title}</b>\n` +
          `🆔 ID: <code>${chat.id}</code>\n\n` +
          `Endi bot orqali qo'shilgan mahsulotlar shu yerga avtomatik joylanadi! 🚀`,
        parse_mode: "HTML",
      });

      // Shaxsiy chatdagi adminlarga ham tasdiq xabari
      if (Array.isArray(config.adminIds)) {
        for (const admId of config.adminIds) {
          await callTelegram("sendMessage", {
            chat_id: admId,
            text:
              `🎉 <b>${typeLabel} muvaffaqiyatli ulandi!</b>\n\n` +
              `Bot <b>"${title}"</b> ${typeLabel.toLowerCase()}iga administrator qilib qo'shildi va avtomatik ulandi!\n\n` +
              `🆔 ID: <code>${chat.id}</code>\n` +
              `Endi mahsulotlarni bot orqali bemalol joylashingiz mumkin.`,
            parse_mode: "HTML",
            reply_markup: MAIN_KEYBOARD,
          });
        }
      }
    }
  }
}

// Long Polling Loop
let lastUpdateId = 0;
// ==========================================================================
// H. Mijozlar uchun Buyurtma Boti (@dreemroom_bot)
// ==========================================================================
async function startOrderBotPolling() {
  const token = config.orderBotToken;
  if (!token) return;

  console.log(`[ORDER BOT]: @${config.orderBotUsername} mijozlar boti ishga tushirildi!`);
  let lastUpdateId = 0;

  async function callOrderBot(method, payload = {}) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json().catch(() => null);
    } catch {
      return null;
    }
  }

  // Set chat menu button to Web App
  if (config.webAppUrl) {
    try {
      await callOrderBot("setChatMenuButton", {
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
      const res = await callOrderBot("getUpdates", {
        offset: lastUpdateId + 1,
        timeout: 25,
      });

      if (res?.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateId = update.update_id;
          const msg = update.message;
          if (msg && msg.chat?.id) {
            const chatId = msg.chat.id;
            const webAppUrl = config.webAppUrl || "https://dreemroom.vercel.app";

            await callOrderBot("sendMessage", {
              chat_id: chatId,
              text:
                `🌸 <b>Assalomu alaykum, DREEM ROOM do'koniga xush kelibsiz!</b>\n\n` +
                `Bizning barcha yangi to'plamlarimizni ko'rish, o'lchamlarni tanlash va tezkor xarid qilish uchun quyidagi tugmani bosing:`,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🛍 Do'konni ochish (Katalog)",
                      web_app: { url: webAppUrl },
                    },
                  ],
                ],
              },
            });
          }
        }
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

async function startPolling() {
  config = loadConfig();
  const token = config.botToken?.trim();

  if (!token) {
    console.log("\x1b[33m[TELEGRAM BOT]: bot-config.json fayliga botToken kiritilmagan.\x1b[0m");
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

    console.log(`\x1b[32m[TELEGRAM BOT]: @${me.result.username} faol ishga tushdi!\x1b[0m`);
    console.log(`\x1b[90m👉 Kanalni ulash uchun kanalga botni admin qilib qo'shing va kanalda 'dreemroom-adm' deb yozing.\x1b[0m\n`);

    if (config.orderBotToken) {
      startOrderBotPolling();
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
              // Direct post in channel where bot is admin
              await handleMessage(update.channel_post);
            } else if (update.edited_channel_post) {
              await handleMessage(update.edited_channel_post);
            } else if (update.callback_query) {
              await handleCallbackQuery(update.callback_query);
            } else if (update.my_chat_member) {
              // When bot is added as admin to channel/group
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
