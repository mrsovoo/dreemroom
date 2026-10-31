import { sendDailyReport, getSetting, setSetting } from "../db.js";

/**
 * Vercel Cron Job: Har kuni 22:00 da (Asia/Tashkent = 17:00 UTC) "Hisobotlar" topikiga kunlik hisobot yuborish
 */
export default async function handler(req, res) {
  try {
    const now = new Date();
    const todayDate = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Tashkent",
    });

    // Bir kunda ikki marta yuborilmasligi uchun tekshirish
    const lastSent = await getSetting("daily_report_last_sent");
    if (lastSent === todayDate) {
      if (typeof res.status === "function") {
        return res.status(200).json({ ok: true, message: "Bugun hisobot allaqachon yuborilgan", date: todayDate });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, message: "Bugun hisobot allaqachon yuborilgan", date: todayDate }));
    }

    const result = await sendDailyReport(false);
    if (result.ok) {
      await setSetting("daily_report_last_sent", todayDate);
    }

    if (typeof res.status === "function") {
      return res.status(200).json({ ok: true, result, date: todayDate });
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, result, date: todayDate }));
  } catch (err) {
    console.error("[CRON ERROR]:", err.message);
    if (typeof res.status === "function") {
      return res.status(500).json({ ok: false, error: err.message });
    }
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
}
