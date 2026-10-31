import { spawn } from "node:child_process";
import process from "node:process";

console.log("\x1b[1m\x1b[35m=========================================\x1b[0m");
console.log("\x1b[1m\x1b[36m🚀 Do'kon tizimi: Barcha xizmatlar ishga tushmoqda...\x1b[0m");
console.log("\x1b[90m📦 Do'kon:       http://localhost:5173\x1b[0m");
console.log("\x1b[90m⚙️  Admin panel:  http://localhost:3000\x1b[0m");
console.log("\x1b[90m🤖 Telegram bot: node bot.js\x1b[0m");
console.log("\x1b[1m\x1b[35m=========================================\x1b[0m\n");

process.env.DEV_ALL = "true";

// 1. Admin server (port 3000)
const admin = spawn("node", ["server.js"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

// 2. Vite web do'kon (port 5173)
const vite = spawn("npx", ["vite"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

// 3. Telegram Admin Bot
const bot = spawn("node", ["bot.js"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

function cleanup() {
  try {
    admin.kill();
  } catch {}
  try {
    vite.kill();
  } catch {}
  try {
    bot.kill();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

admin.on("error", (err) => {
  console.error("\x1b[31m[ADMIN ERROR]:\x1b[0m", err.message);
});

vite.on("error", (err) => {
  console.error("\x1b[31m[VITE ERROR]:\x1b[0m", err.message);
});

bot.on("error", (err) => {
  console.error("\x1b[31m[BOT ERROR]:\x1b[0m", err.message);
});

