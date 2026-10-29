import http from "node:http";
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
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

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
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(products));
    return;
  }

  // 2. API: Get available images list
  if (req.method === "GET" && pathname === "/api/images") {
    const images = getAvailableImages();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(images));
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

  // 10. Serve static files from public/ (images, fonts, etc.)
  if (pathname.startsWith("/images/") || pathname.startsWith("/image-landing/")) {
    const filePath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
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

