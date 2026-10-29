import { clearAllProducts } from "../../db.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    if (typeof res.status === "function") return res.status(204).end();
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST") {
    try {
      await clearAllProducts();
      const payload = { success: true, message: "Barcha kartochkalar va buyurtmalar tozalandi (0 qilindi)" };
      if (typeof res.status === "function") return res.status(200).json(payload);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(payload));
      return;
    } catch (err) {
      if (typeof res.status === "function") return res.status(500).json({ error: err.message });
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  if (typeof res.status === "function") return res.status(405).end();
  res.writeHead(405);
  res.end();
}
