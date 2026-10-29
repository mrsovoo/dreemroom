import { getImage } from "../../db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    if (typeof res.status === "function") return res.status(204).end();
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    if (typeof res.status === "function") return res.status(405).end();
    res.writeHead(405);
    res.end();
    return;
  }

  let id = req.query?.id;
  if (!id && req.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      id = url.searchParams.get("id");
    } catch {}
  }

  if (!id) {
    if (typeof res.status === "function") return res.status(400).send("Rasm ID ko'rsatilmadi");
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Rasm ID ko'rsatilmadi");
    return;
  }

  try {
    const img = await getImage(id);
    if (!img || !img.data) {
      if (typeof res.status === "function") return res.status(404).send("Rasm topilmadi");
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Rasm topilmadi");
      return;
    }

    const buffer = Buffer.from(img.data, "base64");
    res.setHeader("Content-Type", img.content_type || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Length", buffer.length);

    if (typeof res.status === "function") {
      return res.status(200).send(buffer);
    }
    res.writeHead(200);
    res.end(buffer);
  } catch (err) {
    console.error("[API/IMAGES ERROR]:", err.message);
    if (typeof res.status === "function") return res.status(500).send("Server xatosi");
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server xatosi");
  }
}

