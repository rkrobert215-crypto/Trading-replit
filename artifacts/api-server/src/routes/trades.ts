import { Router, type IRouter } from "express";
import { db, tradesTable } from "@workspace/db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { optionalAuth } from "../lib/jwt";
import { notifyNewTrade, notifyTradeClosed, notifyTradeUpdated } from "../lib/telegram";
import { isOwnerTrade, getOwnerUserId } from "../lib/ownerCache";
import { syncTradesToSheet } from "../lib/googleSheets";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Fetch all trades for a given userId (or anonymous) and sync to Google Sheets
async function autoSyncSheets(userId: string | null) {
  try {
    let rows;
    if (userId) {
      rows = await db.select().from(tradesTable).where(eq(tradesTable.user_id, userId)).orderBy(desc(tradesTable.trade_date));
    } else {
      rows = await db.select().from(tradesTable).where(isNull(tradesTable.user_id)).orderBy(desc(tradesTable.trade_date));
    }
    const trades = rows.map(coerce) as any[];
    await syncTradesToSheet(trades);
    logger.info("Auto Google Sheets sync completed");
  } catch (err) {
    logger.warn({ err }, "Auto Google Sheets sync failed (non-fatal)");
  }
}

router.get("/trades", optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    let trades;
    if (userId) {
      trades = await db.select().from(tradesTable).where(eq(tradesTable.user_id, userId)).orderBy(desc(tradesTable.trade_date));
    } else {
      trades = await db.select().from(tradesTable).where(isNull(tradesTable.user_id)).orderBy(desc(tradesTable.trade_date));
    }
    const parsed = trades.map(coerce);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

router.post("/trades", optionalAuth, async (req, res) => {
  try {
    const body = req.body;
    const userId = (req as any).user?.userId ?? null;
    const [trade] = await db
      .insert(tradesTable)
      .values({
        user_id: userId,
        trade_date: body.trade_date,
        symbol: body.symbol,
        trade_type: body.trade_type,
        instrument: body.instrument,
        entry_price: String(body.entry_price),
        exit_price: body.exit_price != null ? String(body.exit_price) : null,
        quantity: String(body.quantity),
        option_type: body.option_type ?? null,
        strike_price: body.strike_price != null ? String(body.strike_price) : null,
        expiry_date: body.expiry_date ?? null,
        gross_pnl: body.gross_pnl != null ? String(body.gross_pnl) : null,
        charges: body.charges != null ? String(body.charges) : "0",
        net_pnl: body.net_pnl != null ? String(body.net_pnl) : null,
        stop_loss: body.stop_loss != null ? String(body.stop_loss) : null,
        target: body.target != null ? String(body.target) : null,
        risk_amount: body.risk_amount != null ? String(body.risk_amount) : null,
        risk_reward_ratio: body.risk_reward_ratio != null ? String(body.risk_reward_ratio) : null,
        position_size_percent: body.position_size_percent != null ? String(body.position_size_percent) : null,
        capital_at_entry: body.capital_at_entry != null ? String(body.capital_at_entry) : null,
        strategy: body.strategy ?? null,
        setup_type: body.setup_type ?? null,
        notes: body.notes ?? null,
        status: body.status ?? "OPEN",
      })
      .returning();

    const coerced = coerce(trade);

    // Telegram: only notify for owner's trades
    if (isOwnerTrade(userId)) {
      notifyNewTrade(coerced);
    }

    // Google Sheets: auto-sync owner's trades after any change
    if (isOwnerTrade(userId)) {
      autoSyncSheets(userId);
    }

    res.status(201).json(coerced);
  } catch (err) {
    res.status(500).json({ error: "Failed to create trade" });
  }
});

router.patch("/trades/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const userId = (req as any).user?.userId ?? null;

    const ownershipCondition = userId
      ? and(eq(tradesTable.id, id), eq(tradesTable.user_id, userId))
      : and(eq(tradesTable.id, id), isNull(tradesTable.user_id));

    const [existing] = await db.select().from(tradesTable).where(ownershipCondition);
    if (!existing) {
      return res.status(404).json({ error: "Trade not found" });
    }

    const updateData: Record<string, unknown> = {};
    const numericFields = [
      "entry_price", "exit_price", "quantity", "strike_price",
      "gross_pnl", "charges", "net_pnl", "stop_loss", "target",
      "risk_amount", "risk_reward_ratio", "position_size_percent", "capital_at_entry"
    ];
    const textFields = [
      "trade_date", "symbol", "trade_type", "instrument",
      "option_type", "expiry_date", "strategy", "setup_type", "notes", "status"
    ];

    for (const field of numericFields) {
      if (field in body) {
        updateData[field] = body[field] != null ? String(body[field]) : null;
      }
    }
    for (const field of textFields) {
      if (field in body) {
        updateData[field] = body[field] ?? null;
      }
    }

    const [trade] = await db
      .update(tradesTable)
      .set({ ...updateData, updated_at: new Date() })
      .where(ownershipCondition)
      .returning();

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    const coerced = coerce(trade);

    // Telegram: only notify for owner's trades
    if (isOwnerTrade(userId)) {
      if (body.status === "CLOSED") {
        notifyTradeClosed(coerced);
      } else {
        notifyTradeUpdated(coerced);
      }
    }

    // Google Sheets: auto-sync owner's trades after any change
    if (isOwnerTrade(userId)) {
      autoSyncSheets(userId);
    }

    res.json(coerced);
  } catch (err) {
    res.status(500).json({ error: "Failed to update trade" });
  }
});

router.delete("/trades/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId ?? null;

    const ownershipCondition = userId
      ? and(eq(tradesTable.id, id), eq(tradesTable.user_id, userId))
      : and(eq(tradesTable.id, id), isNull(tradesTable.user_id));

    const [deleted] = await db
      .delete(tradesTable)
      .where(ownershipCondition)
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Google Sheets: auto-sync after deletion too
    if (isOwnerTrade(userId)) {
      autoSyncSheets(userId);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

function coerce(trade: Record<string, unknown>) {
  const numericFields = [
    "entry_price", "exit_price", "quantity", "strike_price",
    "gross_pnl", "charges", "net_pnl", "stop_loss", "target",
    "risk_amount", "risk_reward_ratio", "position_size_percent", "capital_at_entry"
  ];
  const result: Record<string, unknown> = { ...trade };
  for (const field of numericFields) {
    if (result[field] != null) {
      result[field] = parseFloat(result[field] as string);
    }
  }
  return result;
}

export default router;
