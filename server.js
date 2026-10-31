import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest, getAdminCredentials } from "./api-core.js";
import { saveImage } from "./db.js";
import { startBot, stopBot, getBotStatus } from "./bot.js";
import { brandConfig } from "./brand.config.js";

// .env faylini yuklash
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Portni Railway yoki .env muhitidan olish
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DIST_DIR = path.join(__dirname, "dist");

// 2. Admin hisob ma'lumotlarini tekshirish va birinchi marta xavfsiz parol generatsiya qilish
const { username: adminUser, password: adminPass, isGenerated } = getAdminCredentials();
if (isGenerated) {
  console.log("\n" + "=".repeat(64));
  console.log("🔐 DIQQAT: ADMIN PANEL UCHUN XAVFSIZ BIR MARTALIK PAROL YARATILDI:");
  console.log(`👤 Login:  ${adminUser}`);
  console.log(`🔑 Parol:  ${adminPass}`);
  console.log("ℹ️  Ushbu parolni saqlab qo'ying yoki .env faylida ADMIN_PASSWORD belgilang.");
  console.log("=".repeat(64) + "\n");
}

// 3. Telegram botni bitta jarayonda (in-process) ishga tushirish
startBot().catch((err) => {
  console.error("\x1b[31m[BOT START ERROR]:\x1b[0m", err.message);
});

// 4. Server start bo'lganda mavjud lokal rasmlarni Neon DB ga sinxronlab qo'yish
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
    console.warn("[SYNC]: Rasmlarni sinxronlashda ogohlantirish:", err.message);
  }
}
syncLocalImagesToDb();

// MIME turlari xaritasi
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

// Yagona HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost:" + PORT}`);
  const pathname = parsedUrl.pathname;

  // --------------------------------------------------------------------------
  // A. SOG'LIQ TEKSHIRUVI (Railway & Monitoring Health Check)
  // --------------------------------------------------------------------------
  if (req.method === "GET" && (pathname === "/health" || pathname === "/api/health")) {
    const botStatus = getBotStatus();
    const isDbConfigured = Boolean(process.env.DATABASE_URL?.trim());
    const healthData = {
      ok: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      port: PORT,
      process: {
        pid: process.pid,
        node: process.version,
        memoryUsageMB: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
      },
      bot: botStatus,
      database: {
        configured: isDbConfigured,
        type: isDbConfigured ? "Neon PostgreSQL" : "Local JSON",
      },
    };
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end(JSON.stringify(healthData, null, 2));
    return;
  }

  // --------------------------------------------------------------------------
  // B. REST API SO'ROVLARI (/api/*)
  // --------------------------------------------------------------------------
  const apiHandled = await handleApiRequest(req, res);
  if (apiHandled) return;

  // --------------------------------------------------------------------------
  // C. ADMIN PANEL (/admin va /admin.html)
  // --------------------------------------------------------------------------
  if (pathname === "/admin" || pathname === "/admin.html") {
    const adminPath = path.join(PUBLIC_DIR, "admin.html");
    const rootAdminPath = path.join(__dirname, "admin.html");
    const targetFile = fs.existsSync(adminPath) ? adminPath : rootAdminPath;
    if (fs.existsSync(targetFile)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      fs.createReadStream(targetFile).pipe(res);
      return;
    }
  }

  // --------------------------------------------------------------------------
  // D. STATIK FAYLLARNI QIDIRISH (dist/ va public/)
  // --------------------------------------------------------------------------
  if (req.method === "GET" || req.method === "HEAD") {
    // 1. dist/ ichidan qidirish (build qilingan aktivlar: JS, CSS, SVG, rasm)
    const normalizedPath = pathname.replace(/^\/+/, "");
    const distCandidate = path.join(DIST_DIR, normalizedPath);
    if (normalizedPath && fs.existsSync(distCandidate) && fs.statSync(distCandidate).isFile()) {
      return serveStaticFile(res, distCandidate);
    }

    // 2. public/ ichidan qidirish (brand/, images/, image-landing/, favicon.svg)
    const publicCandidate = path.join(PUBLIC_DIR, normalizedPath);
    if (normalizedPath && fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
      return serveStaticFile(res, publicCandidate);
    }

    // ------------------------------------------------------------------------
    // E. SPA ROUTING FALLBACK (/catalog, /cart, /product/*, /profile, /)
    // ------------------------------------------------------------------------
    // Har qanday boshqa GET so'roviga asosiy index.html uzatiladi
    const distIndex = path.join(DIST_DIR, "index.html");
    const publicIndex = path.join(PUBLIC_DIR, "index.html");
    const fallbackIndex = fs.existsSync(distIndex) ? distIndex : (fs.existsSync(publicIndex) ? publicIndex : null);

    if (fallbackIndex) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      fs.createReadStream(fallbackIndex).pipe(res);
      return;
    }
  }

  // --------------------------------------------------------------------------
  // F. 404 NOT FOUND
  // --------------------------------------------------------------------------
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Sahifa topilmadi");
});

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || "application/octet-stream";
  const isHtml = ext === ".html";
  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": isHtml
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
}

// 5. Serverni ishga tushirish (0.0.0.0 Railway uchun shart)
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\x1b[32m🚀 ${brandConfig.brandName} Server Railway rejimida ishga tushdi: http://0.0.0.0:${PORT}\x1b[0m`);
  console.log(`📦 REST API:    http://localhost:${PORT}/api/products`);
  console.log(`🩺 Healthcheck: http://localhost:${PORT}/health`);
  console.log(`🛠 Admin panel: http://localhost:${PORT}/admin`);
});

// 6. Graceful Shutdown (Railway qayta ishga tushganda yoki yangilanganda 409 conflict oldini olish)
async function handleShutdown(signal) {
  console.log(`\n\x1b[33m[SERVER]: ${signal} qabul qilindi. Xavfsiz to'xtatilmoqda...\x1b[0m`);
  try {
    await stopBot();
  } catch (err) {
    console.error("[SHUTDOWN BOT ERROR]:", err.message);
  }

  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }

  server.close(() => {
    console.log("\x1b[32m[SERVER]: HTTP server to'liq yopildi. Xayr!\x1b[0m");
    process.exit(0);
  });

  setTimeout(() => {
    console.warn("[SERVER]: Majburiy to'xtatildi (timeout).");
    process.exit(0);
  }, 4000);
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
