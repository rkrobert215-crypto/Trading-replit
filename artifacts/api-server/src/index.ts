import app from "./app";
import { logger } from "./lib/logger";
import { db, tradesTable } from "@workspace/db";
import { isNull } from "drizzle-orm";
import { sendDailySummary } from "./lib/telegram";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function scheduleDailySummary() {
  const now = new Date();
  const next = new Date();

  // 6:30 PM IST = 13:00 UTC
  next.setUTCHours(13, 0, 0, 0);

  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  const msUntilNext = next.getTime() - now.getTime();
  const hoursUntil = (msUntilNext / 3600000).toFixed(1);

  logger.info({ hoursUntil }, "Daily Telegram summary scheduled");

  setTimeout(async () => {
    try {
      const trades = await db.select().from(tradesTable).where(isNull(tradesTable.user_id));
      const coerced = trades.map((t) => {
        const result: Record<string, unknown> = { ...t };
        const numericFields = ["entry_price", "exit_price", "quantity", "gross_pnl", "charges", "net_pnl"];
        for (const field of numericFields) {
          if ((result as any)[field] != null) {
            (result as any)[field] = parseFloat((result as any)[field] as string);
          }
        }
        return result;
      });
      await sendDailySummary(coerced);
      logger.info("Daily Telegram summary sent");
    } catch (err) {
      logger.error({ err }, "Failed to send daily Telegram summary");
    }
    scheduleDailySummary();
  }, msUntilNext);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  scheduleDailySummary();
});
