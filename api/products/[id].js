import { getProductById, updateProduct, deleteProduct, getBotConfig } from "../../db.js";

function sendJson(res, statusCode, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {}
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
  });
}

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
    } catch (err) {
      console.warn(`[TELEGRAM]: Post o'chirishda xatolik (${msgId}):`, err.message);
    }
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") return res.status(204).end();
    res.writeHead(204);
    res.end();
    return;
  }

  const id = req.query?.id || (req.url && req.url.split("/").pop().split("?")[0]);
  if (!id) {
    return sendJson(res, 400, { error: "ID kiritilmagan" });
  }

  // GET /api/products/:id
  if (req.method === "GET") {
    try {
      const prod = await getProductById(id);
      if (!prod) return sendJson(res, 404, { error: "Mahsulot topilmadi" });
      return sendJson(res, 200, prod);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // PUT /api/products/:id
  if (req.method === "PUT") {
    try {
      const data = await parseBody(req);
      const updated = await updateProduct(id, data);
      if (!updated) return sendJson(res, 404, { error: "Mahsulot topilmadi" });
      return sendJson(res, 200, updated);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // DELETE /api/products/:id
  if (req.method === "DELETE") {
    try {
      const target = await getProductById(id);
      if (!target) return sendJson(res, 404, { error: "Mahsulot topilmadi" });

      if (target.telegram?.chatId && Array.isArray(target.telegram?.messageIds)) {
        await deleteTelegramMessages(target.telegram.chatId, target.telegram.messageIds);
      }

      await deleteProduct(id);
      return sendJson(res, 200, { success: true, id, message: "Barcha tarmoqlardan tozalandi" });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

