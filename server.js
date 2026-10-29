import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {}

// Railway yoki serverda Telegram botni avtomatik ishga tushirish
if (!process.env.DEV_ALL) {
  try {
    const botProcess = spawn("node", ["bot.js"], {
      stdio: "inherit",
      env: process.env,
    });
    botProcess.on("error", (err) => {
      console.error("[BOT START ERROR]:", err.message);
    });
  } catch (err) {
    console.error("[BOT SPAWN ERROR]:", err.message);
  }
}

import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  clearAllProducts,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getBotConfig,
  saveImage,
  getImage,
  getAdminUsers,
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
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Server start bo'lganda lokal rasmlarni Neon DB ga sinxronlab qo'yish
async function syncLocalImagesToDb() {
  const imgDir = path.join(PUBLIC_DIR, "images");
  if (!fs.existsSync(imgDir)) return;
  try {
    const files = fs.readdirSync(imgDir).filter((f) => /^(main|side|img)-/i.test(f));
    for (const file of files) {
      const filePath = path.join(imgDir, file);
      const buffer = fs.readFileSync(filePath);
      await saveImage(file, buffer.toString("base64"), "image/jpeg");
      console.log(`[SYNC]: '${file}' rasmi Neon DB ga saqlandi.`);
    }
  } catch (err) {
    console.warn("[SYNC]: Rasmlarni sinxronlashda xatolik:", err.message);
  }
}
syncLocalImagesToDb();

function getAvailableImages() {
  const imgDir = path.join(PUBLIC_DIR, "images");
  if (!fs.existsSync(imgDir)) return [];
  try {
    return fs.readdirSync(imgDir).filter((f) => /\.(jpe?g|png|webp|svg)$/i.test(f)).map((f) => `/images/${f}`);
  } catch {
    return [];
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost:3000"}`);
  const pathname = parsedUrl.pathname;

  // 1. API: Get all products
  if (req.method === "GET" && pathname === "/api/products") {
    const products = await getProducts();
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
    });
    res.end(JSON.stringify(products));
    return;
  }

  // 2. API: Get image or available images list
  if (req.method === "GET" && pathname === "/api/images") {
    const id = parsedUrl.searchParams.get("id");
    if (!id) {
      const images = getAvailableImages();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(images));
      return;
    }

    const img = await getImage(id);
    if (!img || !img.data) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Rasm topilmadi");
      return;
    }

    const buffer = Buffer.from(img.data, "base64");
    res.writeHead(200, {
      "Content-Type": img.content_type || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
    return;
  }

  // 3. API: Add new product
  if (req.method === "POST" && pathname === "/api/products") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const newProduct = JSON.parse(body);
        if (!newProduct.name || newProduct.price === undefined) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Nomi va narxi majburiy" }));
          return;
        }

        let pNum = Number(newProduct.price) || 0;
        if (pNum > 0 && pNum < 1000) {
          pNum = pNum * 1000;
        }
        newProduct.price = pNum;
        newProduct.displayPrice = `${pNum.toLocaleString("ru-RU")} so'm`;

        const saved = await createProduct(newProduct);
        res.writeHead(201, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(saved));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Noto'g'ri JSON ma'lumot" }));
      }
    });
    return;
  }

  // 4. API: Update product (PUT /api/products/:id)
  if (req.method === "PUT" && pathname.startsWith("/api/products/")) {
    const id = decodeURIComponent(pathname.replace("/api/products/", ""));
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const updatedData = JSON.parse(body);
        if (updatedData.price !== undefined) {
          let pNum = Number(updatedData.price) || 0;
          if (pNum > 0 && pNum < 1000) {
            pNum = pNum * 1000;
          }
          updatedData.price = pNum;
          updatedData.displayPrice = `${pNum.toLocaleString("ru-RU")} so'm`;
        }
        const updated = await updateProduct(id, updatedData);
        if (!updated) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Mahsulot topilmadi" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(updated));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Noto'g'ri JSON ma'lumot" }));
      }
    });
    return;
  }

  // Helper: Telegram xabarlarini o'chirish
  async function deleteTelegramMessages(chatId, messageIds) {
    const cfg = await getBotConfig();
    const token = cfg?.botToken?.trim();
    if (!token || !chatId || !Array.isArray(messageIds) || messageIds.length === 0) return;

    for (const msgId of messageIds) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: msgId }),
        });
        console.log(`[SERVER]: Telegram post o'chirildi (chat: ${chatId}, msg: ${msgId})`);
      } catch (err) {
        console.warn(`[SERVER]: Telegram postini o'chirishda xatolik (${msgId}):`, err.message);
      }
    }
  }

  // 5. API: Delete product (DELETE /api/products/:id)
  if (req.method === "DELETE" && pathname.startsWith("/api/products/")) {
    const id = decodeURIComponent(pathname.replace("/api/products/", ""));
    const targetProduct = await getProductById(id);

    if (!targetProduct) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Mahsulot topilmadi" }));
      return;
    }

    // Telegram kanal / guruhdan ham o'chirish
    if (targetProduct.telegram?.chatId && Array.isArray(targetProduct.telegram?.messageIds)) {
      await deleteTelegramMessages(targetProduct.telegram.chatId, targetProduct.telegram.messageIds);
    }

    await deleteProduct(id);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, id, message: "Barcha tarmoqlardan tozalandi" }));
    return;
  }

  // 5.1 API: Clear all products and reset data to 0 (POST /api/admin/clear-all)
  if (req.method === "POST" && (pathname === "/api/admin/clear-all" || pathname === "/api/products/clear-all")) {
    await clearAllProducts();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, message: "Barcha kartochkalar va buyurtmalar tozalandi (0 qilindi)" }));
    return;
  }

  // 6. API: Get all orders (GET /api/orders)
  if (req.method === "GET" && pathname === "/api/orders") {
    const orders = await getOrders();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(orders));
    return;
  }

  // 7. API: Create order (POST /api/orders)
  if (req.method === "POST" && pathname === "/api/orders") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const orderData = JSON.parse(body);
        const saved = await createOrder(orderData);
        res.writeHead(201, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(saved));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Noto'g'ri JSON buyurtma ma'lumoti" }));
      }
    });
    return;
  }

  // 8. API: Update order status (PUT /api/orders/:id)
  if (req.method === "PUT" && pathname.startsWith("/api/orders/")) {
    const id = decodeURIComponent(pathname.replace("/api/orders/", ""));
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const updatedData = JSON.parse(body);
        const updated = await updateOrder(id, updatedData);
        if (!updated) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Buyurtma topilmadi" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(updated));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Noto'g'ri JSON ma'lumot" }));
      }
    });
    return;
  }

  // 9. API: Delete order (DELETE /api/orders/:id)
  if (req.method === "DELETE" && pathname.startsWith("/api/orders/")) {
    const id = decodeURIComponent(pathname.replace("/api/orders/", ""));
    await deleteOrder(id);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, id }));
    return;
  }

  // 10. API: Admin Users (GET /api/admin/users)
  if (req.method === "GET" && pathname === "/api/admin/users") {
    const users = await getAdminUsers();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(users));
    return;
  }

  // 11. API: Update Admin User Status (PUT /api/admin/users/:id/status)
  if (req.method === "PUT" && pathname.startsWith("/api/admin/users/") && pathname.endsWith("/status")) {
    const id = decodeURIComponent(pathname.replace("/api/admin/users/", "").replace("/status", ""));
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { status } = JSON.parse(body);
        await updateAdminUserStatus(id, status);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, id, status }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Xatolik yuz berdi" }));
      }
    });
    return;
  }

  // 12. API: Delete Admin User (DELETE /api/admin/users/:id)
  if (req.method === "DELETE" && pathname.startsWith("/api/admin/users/")) {
    const id = decodeURIComponent(pathname.replace("/api/admin/users/", ""));
    await deleteAdminUser(id);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, id }));
    return;
  }

  // 13. API: Admin Secret Keys (GET /api/admin/keys)
  if (req.method === "GET" && pathname === "/api/admin/keys") {
    const keys = await getAdminKeys();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(keys));
    return;
  }

  // 14. API: Add Admin Secret Key (POST /api/admin/keys)
  if (req.method === "POST" && pathname === "/api/admin/keys") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { key, label } = JSON.parse(body);
        if (!key) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Kalit so'z kiritilmadi" }));
          return;
        }
        const created = await addAdminKey(key, label);
        res.writeHead(201, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(created));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Xatolik yuz berdi" }));
      }
    });
    return;
  }

  // 15. API: Delete Admin Secret Key (DELETE /api/admin/keys/:key)
  if (req.method === "DELETE" && pathname.startsWith("/api/admin/keys/")) {
    const key = decodeURIComponent(pathname.replace("/api/admin/keys/", ""));
    await deleteAdminKey(key);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, key }));
    return;
  }

  // 16. API: Telegram Groups & Channels (GET /api/admin/groups)
  if (req.method === "GET" && pathname === "/api/admin/groups") {
    const groups = await getTelegramGroups();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(groups));
    return;
  }

  // 17. API: Set Target Telegram Group (POST /api/admin/groups/set-target)
  if (req.method === "POST" && pathname === "/api/admin/groups/set-target") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { chatId } = JSON.parse(body);
        await setTargetTelegramGroup(chatId);
        // bot-config.json ga ham saqlash
        const cfgPath = path.join(__dirname, "bot-config.json");
        if (fs.existsSync(cfgPath)) {
          try {
            const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
            cfg.targetChatId = chatId;
            fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), "utf-8");
          } catch {}
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, chatId }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Xatolik yuz berdi" }));
      }
    });
    return;
  }

  // 18. API: Delete Telegram Group (DELETE /api/admin/groups/:id)
  if (req.method === "DELETE" && pathname.startsWith("/api/admin/groups/")) {
    const id = decodeURIComponent(pathname.replace("/api/admin/groups/", ""));
    await deleteTelegramGroup(id);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, id }));
    return;
  }

  // 19. API: Get all hero banners (GET /api/banners)
  if (req.method === "GET" && pathname === "/api/banners") {
    const banners = await getBanners();
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end(JSON.stringify(banners));
    return;
  }

  // 20. API: Create or update hero banner (POST /api/banners)
  if (req.method === "POST" && pathname === "/api/banners") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const saved = await createBanner(data);
        res.writeHead(201, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(saved));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 21. API: Delete hero banner (DELETE /api/banners)
  if (req.method === "DELETE" && pathname.startsWith("/api/banners")) {
    const id = parsedUrl.searchParams.get("id") || decodeURIComponent(pathname.replace("/api/banners/", "").replace("/api/banners", ""));
    await deleteBanner(id);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, id }));
    return;
  }

  // 22. API: Get site contacts (GET /api/contacts)
  if (req.method === "GET" && pathname === "/api/contacts") {
    const contacts = await getContacts();
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end(JSON.stringify(contacts));
    return;
  }

  // 23. API: Update site contacts (POST /api/contacts)
  if ((req.method === "POST" || req.method === "PUT") && pathname === "/api/contacts") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        const updated = await setContacts(data);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(updated));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 22. Serve static files from public/ (images, fonts, etc.)
  if (pathname.startsWith("/images/") || pathname.startsWith("/image-landing/")) {
    const filePath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=0, must-revalidate",
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // 7. Serve Admin Panel HTML on root or /admin
  if (pathname === "/" || pathname === "/admin" || pathname === "/index.html") {
    const adminHtmlPath = path.join(__dirname, "admin.html");
    if (fs.existsSync(adminHtmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(adminHtmlPath).pipe(res);
      return;
    }
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Sahifa topilmadi");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 DREEM ROOM Admin Panel running on http://localhost:${PORT}`);
  console.log(`📦 REST API available at http://localhost:${PORT}/api/products`);
});

