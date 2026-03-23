import { Router, type IRouter } from "express";
import { db, tradesTable } from "@workspace/db";
import { desc, eq, isNull } from "drizzle-orm";
import { syncTradesToSheet } from "../lib/googleSheets";
import { optionalAuth } from "../lib/jwt";

const router: IRouter = Router();

router.post("/sheets/sync", optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;

    let trades;
    if (userId) {
      trades = await db.select().from(tradesTable).where(eq(tradesTable.user_id, userId)).orderBy(desc(tradesTable.trade_date));
    } else {
      trades = await db.select().from(tradesTable).where(isNull(tradesTable.user_id)).orderBy(desc(tradesTable.trade_date));
    }

    const coerced = trades.map((t) => {
      const result: Record<string, unknown> = { ...t };
      const numericFields = [
        "entry_price", "exit_price", "quantity", "strike_price",
        "gross_pnl", "charges", "net_pnl", "stop_loss", "target",
        "risk_amount", "risk_reward_ratio", "position_size_percent", "capital_at_entry"
      ];
      for (const field of numericFields) {
        if ((result as any)[field] != null) {
          (result as any)[field] = parseFloat((result as any)[field] as string);
        }
      }
      return result;
    });

    const result = await syncTradesToSheet(coerced);

    res.json({
      success: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${result.spreadsheetId}`,
      rowCount: result.rowCount,
    });
  } catch (err) {
    console.error("Sheets sync error:", err);
    res.status(500).json({ error: "Failed to sync to Google Sheets" });
  }
});

export default router;
