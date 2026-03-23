import { Router, type IRouter } from "express";
import { db, tradesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { sendDailySummary } from "../lib/telegram";
import { optionalAuth } from "../lib/jwt";

const router: IRouter = Router();

router.post("/telegram/summary", optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId ?? null;

    let trades;
    if (userId) {
      trades = await db.select().from(tradesTable).where(eq(tradesTable.user_id, userId));
    } else {
      trades = await db.select().from(tradesTable).where(isNull(tradesTable.user_id));
    }

    const coerced = trades.map((t) => {
      const result: Record<string, unknown> = { ...t };
      const numericFields = [
        "entry_price", "exit_price", "quantity",
        "gross_pnl", "charges", "net_pnl",
      ];
      for (const field of numericFields) {
        if ((result as any)[field] != null) {
          (result as any)[field] = parseFloat((result as any)[field] as string);
        }
      }
      return result;
    });

    const sent = await sendDailySummary(coerced);
    if (sent) {
      res.json({ success: true, message: "Daily summary sent to Telegram" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send summary — check Telegram credentials" });
    }
  } catch (err) {
    console.error("Telegram summary error:", err);
    res.status(500).json({ error: "Failed to send Telegram summary" });
  }
});

export default router;
