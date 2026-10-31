import { handleApiRequest } from "../api-core.js";

export default async function handler(req, res) {
  const handled = await handleApiRequest(req, res);
  if (!handled) {
    if (typeof res.status === "function") {
      return res.status(404).json({ error: "Endpoint topilmadi" });
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint topilmadi" }));
  }
}
