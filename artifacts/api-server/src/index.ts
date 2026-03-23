import app from "./app";
import { logger } from "./lib/logger";
import { db, tradesTable, usersTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { sendDailySummary, sendWeeklySummary, sendMonthlySummary } from "./lib/telegram";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const SUMMARY_HOUR_UTC = 13; // 6:30 PM IST = 13:00 UTC
const SUMMARY_MINUTE_UTC = 0;
const OWNER_EMAIL = process.env.TELEGRAM_OWNER_EMAIL?.toLowerCase().trim();

function coerceTrades(rows: any[]): Record<string, unknown>[] {
  const numericFields = ["entry_price", "exit_price", "quantity", "gross_pnl", "charges", "net_pnl"];
  return rows.map((t) => {
    const result: Record<string, unknown> = { ...t };
    for (const field of numericFields) {
      if (result[field] != null) result[field] = parseFloat(result[field] as string);
    }
    return result;
  });
}

async function getOwnerTrades() {
  if (OWNER_EMAIL) {
    const [owner] = await db.select().from(usersTable).where(eq(usersTable.email, OWNER_EMAIL));
    if (owner) {
      logger.info({ email: OWNER_EMAIL }, "Fetching owner trades for scheduled summary");
      const rows = await db.select().from(tradesTable).where(eq(tradesTable.user_id, owner.id));
      return coerceTrades(rows);
    }
    logger.warn({ email: OWNER_EMAIL }, "Owner email set but no matching user found yet — falling back to anonymous trades");
  }
  // Fallback: anonymous trades (no account)
  const rows = await db.select().from(tradesTable).where(isNull(tradesTable.user_id));
  return coerceTrades(rows);
}

function msUntilNext(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(hour, minute, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function isLastDayOfMonth(): boolean {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.getUTCMonth() !== now.getUTCMonth();
}

function scheduleDailySummary() {
  const ms = msUntilNext(SUMMARY_HOUR_UTC, SUMMARY_MINUTE_UTC);
  logger.info({ hoursUntil: (ms / 3600000).toFixed(1) }, "Daily Telegram summary scheduled");

  setTimeout(async () => {
    try {
      const trades = await getOwnerTrades();
      await sendDailySummary(trades);
      logger.info("Daily Telegram summary sent");
    } catch (err) {
      logger.error({ err }, "Failed to send daily Telegram summary");
    }
    scheduleDailySummary();
  }, ms);
}

function scheduleWeeklySummary() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;

  const next = new Date();
  next.setUTCDate(now.getUTCDate() + daysUntilFriday);
  next.setUTCHours(SUMMARY_HOUR_UTC, SUMMARY_MINUTE_UTC, 0, 0);

  const ms = next.getTime() - now.getTime();
  logger.info({ daysUntil: (ms / 86400000).toFixed(1) }, "Weekly Telegram summary scheduled (Friday)");

  setTimeout(async () => {
    try {
      const trades = await getOwnerTrades();
      await sendWeeklySummary(trades);
      logger.info("Weekly Telegram summary sent");
    } catch (err) {
      logger.error({ err }, "Failed to send weekly Telegram summary");
    }
    scheduleWeeklySummary();
  }, ms);
}

function scheduleMonthlySummary() {
  const CHECK_INTERVAL_MS = 60 * 60 * 1000;

  const tryAndReschedule = async () => {
    const now = new Date();
    if (isLastDayOfMonth() && now.getUTCHours() === SUMMARY_HOUR_UTC && now.getUTCMinutes() < 30) {
      try {
        const trades = await getOwnerTrades();
        await sendMonthlySummary(trades);
        logger.info("Monthly Telegram summary sent");
        setTimeout(tryAndReschedule, 24 * CHECK_INTERVAL_MS);
        return;
      } catch (err) {
        logger.error({ err }, "Failed to send monthly Telegram summary");
      }
    }
    setTimeout(tryAndReschedule, CHECK_INTERVAL_MS);
  };

  logger.info("Monthly Telegram summary scheduler started");
  setTimeout(tryAndReschedule, CHECK_INTERVAL_MS);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port, ownerEmail: OWNER_EMAIL || "(anonymous mode)" }, "Server listening");
  scheduleDailySummary();
  scheduleWeeklySummary();
  scheduleMonthlySummary();
});
