import { getProducts, createProduct } from "../../db.js";

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

  // GET /api/products
  if (req.method === "GET") {
    try {
      const products = await getProducts();
      return sendJson(res, 200, products);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/products
  if (req.method === "POST") {
    try {
      const data = await parseBody(req);
      if (!data.name || data.price === undefined) {
        return sendJson(res, 400, { error: "Nomi va narxi majburiy" });
      }
      const created = await createProduct(data);
      return sendJson(res, 201, created);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

