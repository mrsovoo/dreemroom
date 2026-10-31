import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getBotConfig,
  saveImage,
  getImage,
  getAdminUsers,
  saveAdminUser,
  updateAdminUserStatus,
  deleteAdminUser,
  getAdminKeys,
  addAdminKey,
  deleteAdminKey,
  getTelegramGroups,
  deleteTelegramGroup,
  setTargetTelegramGroup,
  getBanners,
  createBanner,
  deleteBanner,
  getContacts,
  setContacts,
  getStoreSettings,
  setStoreSettings,
  getCustomersWithStats,
  sendDailyReport,
  getSetting,
  setSetting,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FILE = path.join(__dirname, ".auth_credentials.json");

// --------------------------------------------------------------------------
// 1. ADMIN PAROLLARI VA JWT XAVFSIZLIGI
// --------------------------------------------------------------------------
let cachedPassword = null;
let cachedJwtSecret = null;
let passwordGeneratedOnStartup = false;

export function getAdminCredentials() {
  const username = (process.env.ADMIN_USERNAME || "admin").trim();
  let password = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD).trim() : "";
  let jwtSecret = process.env.JWT_SECRET ? String(process.env.JWT_SECRET).trim() : "";
  let isGenerated = false;

  // Agar .env da ADMIN_PASSWORD berilmagan bo'lsa, xavfsiz tasodifiy parol hosil qilamiz
  if (!password) {
    if (!cachedPassword) {
      try {
        if (fs.existsSync(AUTH_FILE)) {
          const saved = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
          if (saved.password) cachedPassword = saved.password;
          if (saved.jwtSecret) cachedJwtSecret = saved.jwtSecret;
        }
      } catch {}
    }

    if (!cachedPassword) {
      // 16 belgili kuchli tasodifiy parol
      cachedPassword = crypto.randomBytes(8).toString("hex");
      isGenerated = true;
      passwordGeneratedOnStartup = true;
    }
    password = cachedPassword;
  }

  if (!jwtSecret) {
    if (!cachedJwtSecret) {
      cachedJwtSecret = crypto.randomBytes(32).toString("hex");
    }
    jwtSecret = cachedJwtSecret;
  }

  // Faylga saqlab qo'yish (server qayta yonganda sessiyalar o'chib ketmasligi uchun)
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ password, jwtSecret }, null, 2), "utf-8");
  } catch {}

  return { username, password, jwtSecret, isGenerated: isGenerated || passwordGeneratedOnStartup };
}

export function generateToken(payload, secret, expiresInSeconds = 86400 * 7) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyAdminAuth(req) {
  const { jwtSecret } = getAdminCredentials();
  const authHeader = req.headers["authorization"] || req.headers["Authorization"] || "";
  let token = "";

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.headers["cookie"]) {
    const match = req.headers["cookie"].match(/(?:brand_token|admin_token)=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return null;
  const payload = verifyToken(token, jwtSecret);
  if (payload && payload.role === "admin") {
    return payload;
  }
  return null;
}

// --------------------------------------------------------------------------
// 2. RATE LIMIT VA BUYURTMA VALIDATSIYASI
// --------------------------------------------------------------------------
const orderRateLimits = new Map(); // ip -> [timestamps]

export function checkOrderRateLimit(ip) {
  const cleanIp = String(ip || "unknown").trim();
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 daqiqa
  const maxOrders = 5; // 10 daqiqa ichida bitta IP dan ko'pi bilan 5 ta buyurtma

  let timestamps = orderRateLimits.get(cleanIp) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= maxOrders) {
    return false;
  }

  timestamps.push(now);
  orderRateLimits.set(cleanIp, timestamps);
  return true;
}

export function validateOrderData(orderData) {
  if (!orderData || typeof orderData !== "object") {
    return "Buyurtma ma'lumoti topilmadi";
  }

  const customer = orderData.customer;
  if (!customer || typeof customer !== "object") {
    return "Mijoz ma'lumotlari kiritilmadi";
  }

  const name = String(customer.name || "").trim();
  if (name.length < 2 || name.length > 100) {
    return "Iltimos, ismingizni to'liq kiriting (kamida 2 ta belgi)";
  }

  const rawPhone = String(customer.phone || "").trim();
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    return "Iltimos, to'g'ri telefon raqamini kiriting (masalan: +998 90 123 45 67)";
  }

  const items = orderData.items;
  if (!Array.isArray(items) || items.length === 0) {
    return "Savat bo'sh. Iltimos, kamida bitta mahsulot tanlang";
  }

  for (const it of items) {
    if (!it.name || typeof it.name !== "string") {
      return "Mahsulot nomi noto'g'ri";
    }
    const price = Number(it.price);
    if (isNaN(price) || price < 0) {
      return "Mahsulot narxi noto'g'ri";
    }
  }

  return null;
}

// --------------------------------------------------------------------------
// 3. YORDAMCHI FUNKSIYALAR
// --------------------------------------------------------------------------
export function sendJson(res, statusCode, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

export async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

export async function deleteTelegramMessages(chatId, messageIds) {
  const cfg = await getBotConfig();
  const token = cfg?.botToken?.trim() || process.env.BOT_TOKEN?.trim();
  if (!token || !chatId || !Array.isArray(messageIds) || messageIds.length === 0) return;

  for (const msgId of messageIds) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: msgId }),
      });
    } catch (err) {
      console.warn(`[TELEGRAM ERROR]: Post o'chirishda xatolik (${msgId}):`, err.message);
    }
  }
}

// --------------------------------------------------------------------------
// 4. UNIFIED API ROUTER (server.js va api/index.js UCHUN YAGONA MARSHRUTIZATOR)
// --------------------------------------------------------------------------
export async function handleApiRequest(req, res) {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") {
      res.status(204).end();
      return true;
    }
    res.writeHead(204);
    res.end();
    return true;
  }

  const parsedUrl = new URL(req.url || "/", "http://localhost");
  let pathname = parsedUrl.pathname;

  // Vercel serverless query path fallback
  const queryPath = parsedUrl.searchParams.get("path") || (req.query && req.query.path);
  if (queryPath) {
    pathname = queryPath.startsWith("/") ? queryPath : `/${queryPath}`;
  }

  // Agar so'rov /api/ bilan boshlanmasa, bu API so'rovi emas
  if (!pathname.startsWith("/api/")) {
    return false;
  }

  // ------------------------------------------------------------------------
  // A. AUTHENTICATION ENDPOINTS
  // ------------------------------------------------------------------------
  // POST /api/auth/login yoki POST /api/admin/login
  if (req.method === "POST" && (pathname === "/api/auth/login" || pathname === "/api/admin/login")) {
    const body = await parseBody(req);
    const { username: validUser, password: validPass, jwtSecret } = getAdminCredentials();
    const inputUser = String(body.username || "").trim();
    const inputPass = String(body.password || "").trim();

    if (inputUser === validUser && inputPass === validPass) {
      const token = generateToken({ user: validUser, role: "admin" }, jwtSecret);
      sendJson(res, 200, {
        ok: true,
        token,
        user: { username: validUser, role: "admin" },
      });
      return true;
    }

    sendJson(res, 401, { error: "Login yoki parol noto'g'ri" });
    return true;
  }

  // GET /api/auth/me
  if (req.method === "GET" && pathname === "/api/auth/me") {
    const admin = verifyAdminAuth(req);
    if (!admin) {
      sendJson(res, 401, { error: "Ruxsat berilmagan. Iltimos, admin panelga kiring." });
      return true;
    }
    sendJson(res, 200, { ok: true, user: admin });
    return true;
  }

  // ------------------------------------------------------------------------
  // B. PRODUCTS API
  // ------------------------------------------------------------------------
  // GET /api/products (Ommaviy - Xaridorlar uchun)
  if (req.method === "GET" && pathname === "/api/products") {
    const products = await getProducts();
    sendJson(res, 200, products);
    return true;
  }

  // POST /api/products (Himoyalangan - Faqat Admin)
  if (req.method === "POST" && pathname === "/api/products") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Ushbu amalni bajarish uchun admin sifatida kirish talab qilinadi" });
      return true;
    }
    const body = await parseBody(req);
    const saved = await createProduct(body);
    sendJson(res, 201, saved);
    return true;
  }

  // PUT /api/products/:id (Himoyalangan - Faqat Admin)
  if (req.method === "PUT" && pathname.startsWith("/api/products/")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Ushbu amalni bajarish uchun admin sifatida kirish talab qilinadi" });
      return true;
    }
    const id = decodeURIComponent(pathname.replace("/api/products/", ""));
    const body = await parseBody(req);
    const updated = await updateProduct(id, body);
    if (!updated) {
      sendJson(res, 404, { error: "Mahsulot topilmadi" });
      return true;
    }
    sendJson(res, 200, updated);
    return true;
  }

  // DELETE /api/products/:id (Himoyalangan - Faqat Admin)
  if (req.method === "DELETE" && pathname.startsWith("/api/products/")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Ushbu amalni bajarish uchun admin sifatida kirish talab qilinadi" });
      return true;
    }
    const id = decodeURIComponent(pathname.replace("/api/products/", ""));
    const all = await getProducts();
    const targetProduct = all.find((p) => String(p.id) === String(id));

    const deleted = await deleteProduct(id);
    if (!deleted) {
      sendJson(res, 404, { error: "Mahsulot topilmadi" });
      return true;
    }

    if (targetProduct?.telegram?.chatId && Array.isArray(targetProduct.telegram?.messageIds)) {
      await deleteTelegramMessages(targetProduct.telegram.chatId, targetProduct.telegram.messageIds);
    }

    sendJson(res, 200, { success: true, id });
    return true;
  }

  // ------------------------------------------------------------------------
  // C. IMAGES API (Ommaviy)
  // ------------------------------------------------------------------------
  if (req.method === "GET" && pathname === "/api/images") {
    const id = parsedUrl.searchParams.get("id");
    if (!id) {
      sendJson(res, 400, { error: "Rasm id si kiritilmadi" });
      return true;
    }

    const imgData = await getImage(id);
    if (!imgData || !imgData.data) {
      sendJson(res, 404, { error: "Rasm topilmadi" });
      return true;
    }

    const buf = Buffer.from(imgData.data, "base64");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", imgData.content_type || "image/jpeg");
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    if (typeof res.status === "function") {
      res.status(200).send(buf);
      return true;
    }
    res.writeHead(200);
    res.end(buf);
    return true;
  }

  // ------------------------------------------------------------------------
  // D. ORDERS API
  // ------------------------------------------------------------------------
  // GET /api/orders (Himoyalangan - Faqat Admin)
  if (req.method === "GET" && pathname === "/api/orders") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Buyurtmalarni ko'rish uchun admin ruxsati zarur" });
      return true;
    }
    const orders = await getOrders();
    sendJson(res, 200, orders);
    return true;
  }

  // POST /api/orders (Ommaviy, lekin IP bo'yicha Rate Limit va Ism/Telefon validatsiyasi bilan)
  if (req.method === "POST" && pathname === "/api/orders") {
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      "unknown";

    if (!checkOrderRateLimit(clientIp)) {
      sendJson(res, 429, {
        error: "Juda ko'p buyurtma yuborildi. Iltimos, birozdan keyin qayta urinib ko'ring.",
      });
      return true;
    }

    const body = await parseBody(req);
    const validationError = validateOrderData(body);
    if (validationError) {
      sendJson(res, 400, { error: validationError });
      return true;
    }

    const saved = await createOrder(body);
    sendJson(res, 201, saved);
    return true;
  }

  // PUT /api/orders/:id (Himoyalangan - Faqat Admin)
  if (req.method === "PUT" && pathname.startsWith("/api/orders/")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Buyurtma statusini o'zgartirish uchun admin ruxsati zarur" });
      return true;
    }
    const id = decodeURIComponent(pathname.replace("/api/orders/", ""));
    const body = await parseBody(req);
    const updated = await updateOrder(id, body);
    if (!updated) {
      sendJson(res, 404, { error: "Buyurtma topilmadi" });
      return true;
    }
    sendJson(res, 200, updated);
    return true;
  }

  // DELETE /api/orders/:id (Himoyalangan - Faqat Admin)
  if (req.method === "DELETE" && pathname.startsWith("/api/orders/")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Buyurtmani o'chirish uchun admin ruxsati zarur" });
      return true;
    }
    const id = decodeURIComponent(pathname.replace("/api/orders/", ""));
    const deleted = await deleteOrder(id);
    if (!deleted) {
      sendJson(res, 404, { error: "Buyurtma topilmadi" });
      return true;
    }
    sendJson(res, 200, { success: true, id });
    return true;
  }

  // ------------------------------------------------------------------------
  // D. MIJOZLAR (CUSTOMERS - Requirement 6)
  // ------------------------------------------------------------------------
  // GET /api/admin/customers (Himoyalangan - Sodiqlik / Statistikasi bilan)
  if (req.method === "GET" && pathname === "/api/admin/customers") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const customers = await getCustomersWithStats();
    sendJson(res, 200, customers);
    return true;
  }

  // ------------------------------------------------------------------------
  // E. ADMIN FOYDALANUVCHILAR (ADMIN USERS)
  // ------------------------------------------------------------------------
  // GET /api/admin/users (Himoyalangan)
  if (req.method === "GET" && pathname === "/api/admin/users") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const users = await getAdminUsers();
    sendJson(res, 200, users);
    return true;
  }

  // POST /api/admin/users (Himoyalangan - Telegram ID kiritib admin qo'shish)
  if (req.method === "POST" && pathname === "/api/admin/users") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const body = await parseBody(req);
    const rawUserId = String(body.userId || "").trim();
    if (!rawUserId) {
      sendJson(res, 400, { error: "Telegram User ID kiritilishi shart" });
      return true;
    }

    const saved = await saveAdminUser({
      userId: rawUserId,
      username: body.username || "",
      firstName: body.firstName || body.fullName || "Admin",
      lastName: body.lastName || "",
      usedKey: "admin-panel",
    });

    sendJson(res, 201, { success: true, user: saved });
    return true;
  }

  // PUT /api/admin/users/:id/status (Himoyalangan)
  if (req.method === "PUT" && pathname.startsWith("/api/admin/users/") && pathname.endsWith("/status")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const userId = decodeURIComponent(pathname.replace("/api/admin/users/", "").replace("/status", ""));
    const body = await parseBody(req);
    const status = body.status === "blocked" ? "blocked" : "active";
    const ok = await updateAdminUserStatus(userId, status);
    if (!ok) {
      sendJson(res, 404, { error: "Foydalanuvchi topilmadi" });
      return true;
    }
    sendJson(res, 200, { success: true, userId, status });
    return true;
  }

  // DELETE /api/admin/users/:id (Himoyalangan)
  if (req.method === "DELETE" && pathname.startsWith("/api/admin/users/")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const userId = decodeURIComponent(pathname.replace("/api/admin/users/", ""));
    const ok = await deleteAdminUser(userId);
    if (!ok) {
      sendJson(res, 404, { error: "Foydalanuvchi topilmadi" });
      return true;
    }
    sendJson(res, 200, { success: true, userId });
    return true;
  }

  // ------------------------------------------------------------------------
  // F. ADMIN KEYS
  // ------------------------------------------------------------------------
  if (req.method === "GET" && pathname === "/api/admin/keys") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const keys = await getAdminKeys();
    sendJson(res, 200, keys);
    return true;
  }

  if (req.method === "POST" && pathname === "/api/admin/keys") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const body = await parseBody(req);
    const key = String(body.key || "").trim();
    const label = String(body.label || "").trim();
    if (!key) {
      sendJson(res, 400, { error: "Kalit so'z kiritilmadi" });
      return true;
    }
    const saved = await addAdminKey(key, label);
    sendJson(res, 201, saved);
    return true;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/admin/keys/")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const key = decodeURIComponent(pathname.replace("/api/admin/keys/", ""));
    const ok = await deleteAdminKey(key);
    if (!ok) {
      sendJson(res, 404, { error: "Kalit so'z topilmadi" });
      return true;
    }
    sendJson(res, 200, { success: true, key });
    return true;
  }

  // ------------------------------------------------------------------------
  // G. TELEGRAM GROUPS & CHANNELS
  // ------------------------------------------------------------------------
  if (req.method === "GET" && pathname === "/api/admin/groups") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const groups = await getTelegramGroups();
    sendJson(res, 200, groups);
    return true;
  }

  if (req.method === "POST" && pathname === "/api/admin/groups/set-target") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const body = await parseBody(req);
    const chatId = body.chatId;
    if (!chatId) {
      sendJson(res, 400, { error: "chatId kiritilmadi" });
      return true;
    }
    const ok = await setTargetTelegramGroup(chatId);
    if (!ok) {
      sendJson(res, 404, { error: "Guruh topilmadi" });
      return true;
    }
    sendJson(res, 200, { success: true, chatId });
    return true;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/admin/groups/")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const id = decodeURIComponent(pathname.replace("/api/admin/groups/", ""));
    const ok = await deleteTelegramGroup(id);
    if (!ok) {
      sendJson(res, 404, { error: "Guruh topilmadi" });
      return true;
    }
    sendJson(res, 200, { success: true, id });
    return true;
  }

  // ------------------------------------------------------------------------
  // H. BANNERS API
  // ------------------------------------------------------------------------
  if (req.method === "GET" && pathname === "/api/banners") {
    const banners = await getBanners();
    sendJson(res, 200, banners);
    return true;
  }

  if (req.method === "POST" && pathname === "/api/banners") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const body = await parseBody(req);
    const saved = await createBanner(body);
    sendJson(res, 201, saved);
    return true;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/banners")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const id = parsedUrl.searchParams.get("id") || pathname.replace("/api/banners/", "").replace("/api/banners", "");
    const ok = await deleteBanner(id);
    if (!ok) {
      sendJson(res, 404, { error: "Banner topilmadi" });
      return true;
    }
    sendJson(res, 200, { success: true, id });
    return true;
  }

  // ------------------------------------------------------------------------
  // I. CONTACTS API
  // ------------------------------------------------------------------------
  if (req.method === "GET" && pathname === "/api/contacts") {
    const contacts = await getContacts();
    sendJson(res, 200, contacts);
    return true;
  }

  if ((req.method === "POST" || req.method === "PUT") && pathname === "/api/contacts") {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const body = await parseBody(req);
    const saved = await setContacts(body);
    sendJson(res, 200, saved);
    return true;
  }

  // ------------------------------------------------------------------------
  // J. STORE SETTINGS API (BREND VA SAYT SOZLAMALARI)
  // ------------------------------------------------------------------------
  if (req.method === "GET" && (pathname === "/api/settings" || pathname === "/api/admin/settings")) {
    const settings = await getStoreSettings();
    sendJson(res, 200, settings);
    return true;
  }

  if ((req.method === "POST" || req.method === "PUT") && (pathname === "/api/settings" || pathname === "/api/admin/settings")) {
    if (!verifyAdminAuth(req)) {
      sendJson(res, 401, { error: "Admin ruxsati zarur" });
      return true;
    }
    const body = await parseBody(req);
    const saved = await setStoreSettings(body);
    sendJson(res, 200, { success: true, settings: saved });
    return true;
  }

  // ------------------------------------------------------------------------
  // K. KUNLIK HISOBOT CRON (Requirement 5)
  // ------------------------------------------------------------------------
  if (pathname === "/api/cron-daily-report" || pathname === "/api/cron/daily-report") {
    const now = new Date();
    const todayDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
    const lastSent = await getSetting("daily_report_last_sent");
    if (lastSent === todayDate) {
      sendJson(res, 200, { ok: true, message: "Bugun hisobot allaqachon yuborilgan", date: todayDate });
      return true;
    }
    const result = await sendDailyReport(false);
    if (result.ok) {
      await setSetting("daily_report_last_sent", todayDate);
    }
    sendJson(res, 200, { ok: true, result, date: todayDate });
    return true;
  }

  // Agar mavjud bo'lmagan /api/* yo'l bo'lsa
  sendJson(res, 404, { error: "API endpoint topilmadi" });
  return true;
}

