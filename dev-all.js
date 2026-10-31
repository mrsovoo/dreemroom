import { spawn } from "node:child_process";
import process from "node:process";

console.log("\x1b[1m\x1b[35m=========================================\x1b[0m");
console.log("\x1b[1m\x1b[36m🚀 Do'kon tizimi: Barcha xizmatlar ishga tushmoqda...\x1b[0m");
console.log("\x1b[90m📦 Vitrina (Vite Dev): http://localhost:5173\x1b[0m");
console.log("\x1b[90m⚙️  Server & API:     http://localhost:3000\x1b[0m");
console.log("\x1b[90m🛠 Admin panel:       http://localhost:3000/admin\x1b[0m");
console.log("\x1b[90m🩺 Health check:      http://localhost:3000/health\x1b[0m");
console.log("\x1b[90m🤖 Telegram bot:      Server ichida (in-process)\x1b[0m");
console.log("\x1b[1m\x1b[35m=========================================\x1b[0m\n");

process.env.DEV_ALL = "true";

// 1. Asosiy Node.js Server (API, Statik fayllar, Admin va Telegram Bot)
const serverProcess = spawn("node", ["server.js"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

// 2. Vite Web Vitrina (port 5173 - Hot Reload)
const viteProcess = spawn("npx", ["vite"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

function cleanup() {
  try {
    serverProcess.kill();
  } catch {}
  try {
    viteProcess.kill();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

serverProcess.on("error", (err) => {
  console.error("\x1b[31m[SERVER ERROR]:\x1b[0m", err.message);
});

viteProcess.on("error", (err) => {
  console.error("\x1b[31m[VITE ERROR]:\x1b[0m", err.message);
});
