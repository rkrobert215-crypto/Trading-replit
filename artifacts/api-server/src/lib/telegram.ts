import {
  type TradeRecord,
  type PeriodStats,
  computeDailySummaries,
  computeWeeklySummaries,
  computeMonthlySummaries,
} from "./summaryUtils";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("Telegram not configured: missing BOT_TOKEN or CHAT_ID");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      }
    );
    const data = await res.json();
    if (!data.ok) {
      console.error("Telegram API error:", data);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Telegram send failed:", err);
    return false;
  }
}

export function notifyNewTrade(trade: TradeRecord) {
  const dir = trade.trade_type === "LONG" ? "📈" : "📉";
  const msg =
    `${dir} <b>New Trade Opened</b>\n\n` +
    `<b>Symbol:</b> ${trade.symbol}\n` +
    `<b>Type:</b> ${trade.trade_type} (${trade.instrument})\n` +
    `<b>Entry:</b> ₹${Number(trade.entry_price).toLocaleString("en-IN")}\n` +
    `<b>Qty:</b> ${trade.quantity}\n` +
    (trade.stop_loss
      ? `<b>Stop Loss:</b> ₹${Number(trade.stop_loss).toLocaleString("en-IN")}\n`
      : "") +
    (trade.target
      ? `<b>Target:</b> ₹${Number(trade.target).toLocaleString("en-IN")}\n`
      : "") +
    (trade.strategy ? `<b>Strategy:</b> ${trade.strategy}\n` : "") +
    `<b>Date:</b> ${trade.trade_date}`;
  sendMessage(msg);
}

export function notifyTradeClosed(trade: TradeRecord) {
  const pnl = Number(trade.net_pnl ?? trade.gross_pnl ?? 0);
  const emoji = pnl >= 0 ? "✅" : "❌";
  const msg =
    `${emoji} <b>Trade Closed</b>\n\n` +
    `<b>Symbol:</b> ${trade.symbol}\n` +
    `<b>Type:</b> ${trade.trade_type} (${trade.instrument})\n` +
    `<b>Entry:</b> ₹${Number(trade.entry_price).toLocaleString("en-IN")}\n` +
    `<b>Exit:</b> ₹${Number(trade.exit_price).toLocaleString("en-IN")}\n` +
    `<b>Qty:</b> ${trade.quantity}\n` +
    `<b>P&L:</b> ₹${pnl.toLocaleString("en-IN")} ${pnl >= 0 ? "(Profit)" : "(Loss)"}\n` +
    (trade.charges
      ? `<b>Charges:</b> ₹${Number(trade.charges).toLocaleString("en-IN")}\n`
      : "") +
    `<b>Date:</b> ${trade.trade_date}`;
  sendMessage(msg);
}

export function notifyTradeUpdated(trade: TradeRecord) {
  const msg =
    `✏️ <b>Trade Updated</b>\n\n` +
    `<b>Symbol:</b> ${trade.symbol}\n` +
    `<b>Status:</b> ${trade.status}\n` +
    `<b>Type:</b> ${trade.trade_type} (${trade.instrument})`;
  sendMessage(msg);
}

function statsBlock(s: PeriodStats): string {
  const emoji = s.netPnl >= 0 ? "🟢" : "🔴";
  return (
    `• Trades: ${s.totalTrades} (${s.openTrades} open)\n` +
    `• Win Rate: ${s.winRate}% (${s.wins}W / ${s.losses}L)\n` +
    `• Gross P&L: ₹${s.grossPnl.toLocaleString("en-IN")}\n` +
    `• Charges: ₹${s.charges.toLocaleString("en-IN")}\n` +
    `• ${emoji} Net P&L: ₹${s.netPnl.toLocaleString("en-IN")}`
  );
}

export async function sendDailySummary(trades: TradeRecord[]) {
  const today = new Date().toISOString().split("T")[0];
  const allDays = computeDailySummaries(trades);
  const todayStat = allDays.find((d) => d.period === today);

  const allClosed = trades.filter((t) => t.status === "CLOSED");
  const totalPnl = allClosed.reduce((s, t) => s + (Number(t.net_pnl) || 0), 0);
  const totalWins = allClosed.filter((t) => Number(t.net_pnl) > 0).length;
  const totalLosses = allClosed.filter((t) => Number(t.net_pnl) <= 0).length;
  const overallWinRate =
    allClosed.length > 0
      ? ((totalWins / allClosed.length) * 100).toFixed(1)
      : "0.0";

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let msg = `📊 <b>Daily Trading Summary</b>\n📅 ${dateLabel}\n\n`;

  if (!todayStat || todayStat.totalTrades === 0) {
    msg += `No trades logged today.\n\n`;
  } else {
    msg += `<b>Today's Activity:</b>\n${statsBlock(todayStat)}\n\n`;
  }

  msg +=
    `<b>Overall Portfolio:</b>\n` +
    `• Total Closed: ${allClosed.length} (${totalWins}W / ${totalLosses}L)\n` +
    `• Win Rate: ${overallWinRate}%\n` +
    `• ${totalPnl >= 0 ? "✅" : "❌"} Net P&L: ₹${totalPnl.toLocaleString("en-IN")}`;

  return sendMessage(msg);
}

export async function sendWeeklySummary(trades: TradeRecord[]) {
  const weeks = computeWeeklySummaries(trades);
  const thisWeek = weeks[0];

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let msg = `📈 <b>Weekly Trading Summary</b>\n📅 Week ending ${dateLabel}\n\n`;

  if (!thisWeek || thisWeek.totalTrades === 0) {
    msg += `No trades this week.\n\n`;
  } else {
    msg += `<b>This Week (${thisWeek.period}):</b>\n${statsBlock(thisWeek)}\n\n`;
  }

  if (weeks.length > 1) {
    const prev = weeks[1];
    msg += `<b>Last Week (${prev.period}):</b>\n${statsBlock(prev)}\n\n`;
  }

  const allClosed = trades.filter((t) => t.status === "CLOSED");
  const totalPnl = allClosed.reduce((s, t) => s + (Number(t.net_pnl) || 0), 0);
  msg += `<b>All-Time Net P&L:</b> ${totalPnl >= 0 ? "✅" : "❌"} ₹${totalPnl.toLocaleString("en-IN")}`;

  return sendMessage(msg);
}

export async function sendMonthlySummary(trades: TradeRecord[]) {
  const months = computeMonthlySummaries(trades);
  const thisMonth = months[0];

  const monthLabel = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  let msg = `🗓️ <b>Monthly Trading Summary</b>\n📅 ${monthLabel}\n\n`;

  if (!thisMonth || thisMonth.totalTrades === 0) {
    msg += `No trades this month.\n\n`;
  } else {
    msg += `<b>This Month (${thisMonth.period}):</b>\n${statsBlock(thisMonth)}\n\n`;
  }

  if (months.length > 1) {
    const prev = months[1];
    msg += `<b>Last Month (${prev.period}):</b>\n${statsBlock(prev)}\n\n`;
  }

  if (months.length > 2) {
    msg += `<b>All-Time by Month:</b>\n`;
    for (const m of months.slice(0, 6)) {
      const emoji = m.netPnl >= 0 ? "🟢" : "🔴";
      msg += `• ${m.period}: ${emoji} ₹${m.netPnl.toLocaleString("en-IN")} (${m.winRate}% win)\n`;
    }
  }

  const allClosed = trades.filter((t) => t.status === "CLOSED");
  const totalPnl = allClosed.reduce((s, t) => s + (Number(t.net_pnl) || 0), 0);
  msg += `\n<b>All-Time Net P&L:</b> ${totalPnl >= 0 ? "✅" : "❌"} ₹${totalPnl.toLocaleString("en-IN")}`;

  return sendMessage(msg);
}
