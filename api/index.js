import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  clearAllProducts,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getBotConfig,
  saveImage,
  getImage,
  getAdminUsers,
  updateAdminUserStatus,
  deleteAdminUser,
  getAdminKeys,
  addAdminKey,
  deleteAdminKey,
  getTelegramGroups,
  deleteTelegramGroup,
  setTargetTelegramGroup,
  getBanners,
  createBanner,
  deleteBanner,
  getContacts,
  setContacts,
} from "../db.js";

function sendJson(res, statusCode, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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
    } catch {
      return {};
    }
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
    req.on("error", () => resolve({}));
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
      console.warn(`[TELEGRAM ERROR]: Post o'chirishda xatolik (${msgId}):`, err.message);
    }
  }
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") return res.status(204).end();
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || "/", "http://localhost");
  let pathname = parsedUrl.pathname;

  const queryPath = parsedUrl.searchParams.get("path") || (req.query && req.query.path);
  if (pathname === "/api" || pathname === "/api/index.js" || pathname === "/api/") {
    if (queryPath) {
      pathname = "/api/" + queryPath.replace(/^\/+/, "");
    }
  }

  try {
    // 1. API: Clear all products and reset data to 0
    if (req.method === "POST" && (pathname === "/api/admin/clear-all" || pathname === "/api/products/clear-all")) {
      await clearAllProducts();
      return sendJson(res, 200, { success: true, message: "Barcha kartochkalar va buyurtmalar tozalandi (0 qilindi)" });
    }

    // 2. API: Images
    if (pathname === "/api/images") {
      let id = req.query?.id || parsedUrl.searchParams.get("id");
      if (!id) {
        return sendJson(res, 200, []);
      }
      const img = await getImage(id);
      if (!img || !img.data) {
        if (typeof res.status === "function") return res.status(404).send("Rasm topilmadi");
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Rasm topilmadi");
      }
      const buffer = Buffer.from(img.data, "base64");
      res.setHeader("Content-Type", img.content_type || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Length", buffer.length);
      if (typeof res.status === "function") return res.status(200).send(buffer);
      res.writeHead(200);
      return res.end(buffer);
    }

    // 3. API: Banners
    if (pathname === "/api/banners" && req.method === "GET") {
      const banners = await getBanners();
      res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=60");
      return sendJson(res, 200, banners);
    }

    if (pathname === "/api/banners" && req.method === "POST") {
      const data = await parseBody(req);
      const saved = await createBanner(data);
      return sendJson(res, 201, saved);
    }

    if (pathname.startsWith("/api/banners") && req.method === "DELETE") {
      let id = pathname.startsWith("/api/banners/")
        ? decodeURIComponent(pathname.replace("/api/banners/", "").split("?")[0])
        : req.query?.id || parsedUrl.searchParams.get("id");
      if (!id) {
        const body = await parseBody(req);
        id = body?.id;
      }
      if (!id) return sendJson(res, 400, { error: "Bannyer ID ko'rsatilmadi" });
      await deleteBanner(id);
      return sendJson(res, 200, { success: true, id });
    }

    // 4. API: Products
    if (pathname === "/api/products" && req.method === "GET") {
      const products = await getProducts();
      res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=60");
      return sendJson(res, 200, products);
    }

    if (pathname === "/api/products" && req.method === "POST") {
      const newProduct = await parseBody(req);
      if (!newProduct.name || newProduct.price === undefined) {
        return sendJson(res, 400, { error: "Nomi va narxi majburiy" });
      }
      let pNum = Number(newProduct.price) || 0;
      if (pNum > 0 && pNum < 1000) {
        pNum = pNum * 1000;
      }
      newProduct.price = pNum;
      newProduct.displayPrice = `${pNum.toLocaleString("ru-RU")} so'm`;
      const saved = await createProduct(newProduct);
      return sendJson(res, 201, saved);
    }

    if (pathname.startsWith("/api/products/") && req.method === "PUT") {
      const id = decodeURIComponent(pathname.replace("/api/products/", "").split("?")[0]);
      const updatedData = await parseBody(req);
      if (updatedData.price !== undefined) {
        let pNum = Number(updatedData.price) || 0;
        if (pNum > 0 && pNum < 1000) {
          pNum = pNum * 1000;
        }
        updatedData.price = pNum;
        updatedData.displayPrice = `${pNum.toLocaleString("ru-RU")} so'm`;
      }
      const updated = await updateProduct(id, updatedData);
      if (!updated) return sendJson(res, 404, { error: "Mahsulot topilmadi" });
      return sendJson(res, 200, updated);
    }

    if (pathname.startsWith("/api/products/") && req.method === "DELETE") {
      const id = decodeURIComponent(pathname.replace("/api/products/", "").split("?")[0]);
      const target = await getProductById(id);
      if (!target) return sendJson(res, 404, { error: "Mahsulot topilmadi" });
      if (target.telegram?.chatId && Array.isArray(target.telegram?.messageIds)) {
        await deleteTelegramMessages(target.telegram.chatId, target.telegram.messageIds);
      }
      await deleteProduct(id);
      return sendJson(res, 200, { success: true, id, message: "Mahsulot o'chirildi" });
    }

    // 5. API: Orders
    if (pathname === "/api/orders" && req.method === "GET") {
      const orders = await getOrders();
      return sendJson(res, 200, orders);
    }

    if (pathname === "/api/orders" && req.method === "POST") {
      const orderData = await parseBody(req);
      const saved = await createOrder(orderData);
      return sendJson(res, 201, saved);
    }

    if (pathname.startsWith("/api/orders/") && req.method === "PUT") {
      const id = decodeURIComponent(pathname.replace("/api/orders/", "").split("?")[0]);
      const updatedData = await parseBody(req);
      const updated = await updateOrder(id, updatedData);
      if (!updated) return sendJson(res, 404, { error: "Buyurtma topilmadi" });
      return sendJson(res, 200, updated);
    }

    if (pathname.startsWith("/api/orders/") && req.method === "DELETE") {
      const id = decodeURIComponent(pathname.replace("/api/orders/", "").split("?")[0]);
      await deleteOrder(id);
      return sendJson(res, 200, { success: true, id });
    }

    // 6. API: Admin Users
    if (pathname === "/api/admin/users" && req.method === "GET") {
      const users = await getAdminUsers();
      return sendJson(res, 200, users);
    }

    if (pathname.startsWith("/api/admin/users/") && pathname.endsWith("/status") && req.method === "PUT") {
      const id = decodeURIComponent(pathname.replace("/api/admin/users/", "").replace("/status", "").split("?")[0]);
      const body = await parseBody(req);
      await updateAdminUserStatus(id, body.status);
      return sendJson(res, 200, { success: true, id, status: body.status });
    }

    if (pathname.startsWith("/api/admin/users/") && req.method === "DELETE") {
      const id = decodeURIComponent(pathname.replace("/api/admin/users/", "").split("?")[0]);
      await deleteAdminUser(id);
      return sendJson(res, 200, { success: true, id });
    }

    // 7. API: Admin Keys
    if (pathname === "/api/admin/keys" && req.method === "GET") {
      const keys = await getAdminKeys();
      return sendJson(res, 200, keys);
    }

    if (pathname === "/api/admin/keys" && req.method === "POST") {
      const body = await parseBody(req);
      if (!body.key) return sendJson(res, 400, { error: "Kalit so'z kiritilmadi" });
      const created = await addAdminKey(body.key, body.label);
      return sendJson(res, 201, created);
    }

    if (pathname.startsWith("/api/admin/keys/") && req.method === "DELETE") {
      const key = decodeURIComponent(pathname.replace("/api/admin/keys/", "").split("?")[0]);
      await deleteAdminKey(key);
      return sendJson(res, 200, { success: true, key });
    }

    // 8. API: Telegram Groups
    if (pathname === "/api/admin/groups" && req.method === "GET") {
      const groups = await getTelegramGroups();
      return sendJson(res, 200, groups);
    }

    if (pathname === "/api/admin/groups/set-target" && req.method === "POST") {
      const body = await parseBody(req);
      await setTargetTelegramGroup(body.chatId);
      return sendJson(res, 200, { success: true, chatId: body.chatId });
    }

    if (pathname.startsWith("/api/admin/groups/") && req.method === "DELETE") {
      const id = decodeURIComponent(pathname.replace("/api/admin/groups/", "").split("?")[0]);
      await deleteTelegramGroup(id);
      return sendJson(res, 200, { success: true, id });
    }

    // 9. API: Contacts (GET & POST)
    if (pathname === "/api/contacts" && req.method === "GET") {
      const contacts = await getContacts();
      return sendJson(res, 200, contacts);
    }

    if (pathname === "/api/contacts" && (req.method === "POST" || req.method === "PUT")) {
      const body = await parseBody(req);
      const updated = await setContacts(body);
      return sendJson(res, 200, updated);
    }

    return sendJson(res, 404, { error: `Endpoint topilmadi: ${req.method} ${pathname}` });
  } catch (err) {
    console.error("[API ERROR]:", err.message);
    return sendJson(res, 500, { error: err.message });
  }
}

