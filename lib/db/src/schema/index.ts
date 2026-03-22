import { pgTable, text, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradesTable = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  trade_date: text("trade_date").notNull(),
  symbol: text("symbol").notNull(),
  trade_type: text("trade_type").notNull(),
  instrument: text("instrument").notNull(),
  entry_price: numeric("entry_price", { precision: 15, scale: 4 }).notNull(),
  exit_price: numeric("exit_price", { precision: 15, scale: 4 }),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  option_type: text("option_type"),
  strike_price: numeric("strike_price", { precision: 15, scale: 4 }),
  expiry_date: text("expiry_date"),
  gross_pnl: numeric("gross_pnl", { precision: 15, scale: 4 }),
  charges: numeric("charges", { precision: 15, scale: 4 }),
  net_pnl: numeric("net_pnl", { precision: 15, scale: 4 }),
  stop_loss: numeric("stop_loss", { precision: 15, scale: 4 }),
  target: numeric("target", { precision: 15, scale: 4 }),
  risk_amount: numeric("risk_amount", { precision: 15, scale: 4 }),
  risk_reward_ratio: numeric("risk_reward_ratio", { precision: 15, scale: 4 }),
  position_size_percent: numeric("position_size_percent", { precision: 15, scale: 4 }),
  capital_at_entry: numeric("capital_at_entry", { precision: 15, scale: 4 }),
  strategy: text("strategy"),
  setup_type: text("setup_type"),
  notes: text("notes"),
  status: text("status").notNull().default("OPEN"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
