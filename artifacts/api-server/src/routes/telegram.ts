import { Router, type IRouter } from "express";
import { db, tradesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { sendDailySummary, sendWeeklySummary, sendMonthlySummary } from "../lib/telegram";
import { optionalAuth } from "../lib/jwt";

const router: IRouter = Router();

function coerceTrades(trades: any[]): Record<string, unknown>[] {
  const numericFields = [
    "entry_price", "exit_price", "quantity",
    "gross_pnl", "charges", "net_pnl",
  ];
  return trades.map((t) => {
    const result: Record<string, unknown> = { ...t };
    for (const field of numericFields) {
      if (result[field] != null) {
        result[field] = parseFloat(result[field] as string);
      }
    }
    return result;
  });
}

async function fetchTrades(userId: string | null) {
  const rows = userId
    ? await db.select().from(tradesTable).where(eq(tradesTable.user_id, userId))
    : await db.select().from(tradesTable).where(isNull(tradesTable.user_id));
  return coerceTrades(rows);
}

router.post("/telegram/summary", optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId ?? null;
    const trades = await fetchTrades(userId);
    const sent = await sendDailySummary(trades);
    if (sent) {
      res.json({ success: true, message: "Daily summary sent to Telegram" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send — check Telegram credentials" });
    }
  } catch (err) {
    console.error("Telegram daily summary error:", err);
    res.status(500).json({ error: "Failed to send daily Telegram summary" });
  }
});

router.post("/telegram/weekly-summary", optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId ?? null;
    const trades = await fetchTrades(userId);
    const sent = await sendWeeklySummary(trades);
    if (sent) {
      res.json({ success: true, message: "Weekly summary sent to Telegram" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send — check Telegram credentials" });
    }
  } catch (err) {
    console.error("Telegram weekly summary error:", err);
    res.status(500).json({ error: "Failed to send weekly Telegram summary" });
  }
});

router.post("/telegram/monthly-summary", optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId ?? null;
    const trades = await fetchTrades(userId);
    const sent = await sendMonthlySummary(trades);
    if (sent) {
      res.json({ success: true, message: "Monthly summary sent to Telegram" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send — check Telegram credentials" });
    }
  } catch (err) {
    console.error("Telegram monthly summary error:", err);
    res.status(500).json({ error: "Failed to send monthly Telegram summary" });
  }
});

export default router;
