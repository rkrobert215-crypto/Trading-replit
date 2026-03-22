import { Router, type IRouter } from "express";
import { db, tradesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/trades", async (_req, res) => {
  try {
    const trades = await db
      .select()
      .from(tradesTable)
      .orderBy(desc(tradesTable.trade_date));

    const parsed = trades.map(coerce);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/trades", async (req, res) => {
  try {
    const body = req.body;
    const [trade] = await db
      .insert(tradesTable)
      .values({
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

    res.status(201).json(coerce(trade));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/trades/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

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
      .where(eq(tradesTable.id, id))
      .returning();

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    res.json(coerce(trade));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/trades/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(tradesTable)
      .where(eq(tradesTable.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Trade not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
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
