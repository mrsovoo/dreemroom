import { getBanners, createBanner, deleteBanner } from "../../db.js";

function sendJson(res, statusCode, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

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
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") return res.status(204).end();
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/banners
  if (req.method === "GET") {
    try {
      const banners = await getBanners();
      return sendJson(res, 200, banners);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/banners
  if (req.method === "POST") {
    try {
      const body = await parseBody(req);
      const saved = await createBanner(body);
      return sendJson(res, 201, saved);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // DELETE /api/banners
  if (req.method === "DELETE") {
    try {
      let id = req.query?.id;
      if (!id && req.url) {
        const u = new URL(req.url, "http://localhost");
        id = u.searchParams.get("id");
      }
      if (!id) {
        const body = await parseBody(req);
        id = body?.id;
      }
      if (!id) {
        return sendJson(res, 400, { error: "Bannyer ID ko'rsatilmadi" });
      }
      await deleteBanner(id);
      return sendJson(res, 200, { success: true, id });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

