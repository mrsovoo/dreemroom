import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { handleApiRequest, getAdminCredentials } from "./api-core.js";
import { saveImage } from "./db.js";

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {}

import { brandConfig } from "./brand.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// 1. Admin hisob ma'lumotlarini tekshirish va tasodifiy parol generatsiya qilish
const { username: adminUser, password: adminPass, isGenerated } = getAdminCredentials();
if (isGenerated) {
  console.log("\n" + "=".repeat(64));
  console.log("🔐 DIQQAT: ADMIN PANEL UCHUN XAVFSIZ BIR MARTALIK PAROL YARATILDI:");
  console.log(`👤 Login:  ${adminUser}`);
  console.log(`🔑 Parol:  ${adminPass}`);
  console.log("ℹ️  Ushbu parolni saqlab qo'ying yoki .env faylida ADMIN_PASSWORD belgilang.");
  console.log("=".repeat(64) + "\n");
}

// 2. Railway yoki serverda Telegram botni avtomatik ishga tushirish
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

// 3. Server start bo'lganda mavjud lokal rasmlarni Neon DB ga sinxronlab qo'yish
async function syncLocalImagesToDb() {
  const imgDir = path.join(PUBLIC_DIR, "images");
  if (!fs.existsSync(imgDir)) return;
  try {
    const files = fs.readdirSync(imgDir).filter((f) => /^(main|side|img)-/i.test(f));
    for (const file of files) {
      const filePath = path.join(imgDir, file);
      const buffer = fs.readFileSync(filePath);
      await saveImage(file, buffer.toString("base64"), "image/jpeg");
    }
  } catch (err) {
    console.warn("[SYNC]: Rasmlarni sinxronlashda xatolik:", err.message);
  }
}
syncLocalImagesToDb();

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
  // A. Barcha /api/* so'rovlarini umumiy api-core moduliga uzatish
  const apiHandled = await handleApiRequest(req, res);
  if (apiHandled) return;

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost:3000"}`);
  const pathname = parsedUrl.pathname;

  // B. Statik fayllarni public/ papkadan berish (/images, /image-landing)
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

  // C. Admin Panel yoki Asosiy sahifa
  if (pathname === "/admin" || pathname === "/admin.html") {
    const adminPath = path.join(PUBLIC_DIR, "admin.html");
    const rootAdminPath = path.join(__dirname, "admin.html");
    const targetFile = fs.existsSync(adminPath) ? adminPath : rootAdminPath;
    if (fs.existsSync(targetFile)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(targetFile).pipe(res);
      return;
    }
  }

  if (pathname === "/" || pathname === "/index.html") {
    // Agar build qilingan dist bo'lsa
    const distHtml = path.join(__dirname, "dist", "index.html");
    const publicHtml = path.join(PUBLIC_DIR, "index.html");
    const adminPath = path.join(PUBLIC_DIR, "admin.html");
    const target = fs.existsSync(distHtml) ? distHtml : (fs.existsSync(publicHtml) ? publicHtml : adminPath);
    if (fs.existsSync(target)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(target).pipe(res);
      return;
    }
  }

  // D. 404
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Sahifa topilmadi");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 ${brandConfig.brandName} Server running on http://localhost:${PORT}`);
  console.log(`📦 REST API available at http://localhost:${PORT}/api/products`);
  console.log(`🛠 Admin panel at http://localhost:${PORT}/admin`);
});
