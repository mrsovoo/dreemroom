import { updateOrder, deleteOrder } from "../../db.js";

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

  // PUT /api/orders/:id
  if (req.method === "PUT") {
    try {
      const data = await parseBody(req);
      const updated = await updateOrder(id, data);
      if (!updated) return sendJson(res, 404, { error: "Buyurtma topilmadi" });
      return sendJson(res, 200, updated);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // DELETE /api/orders/:id
  if (req.method === "DELETE") {
    try {
      const result = await deleteOrder(id);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

