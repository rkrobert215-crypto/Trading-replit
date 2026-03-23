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

export function notifyNewTrade(trade: Record<string, unknown>) {
  const dir = trade.trade_type === "LONG" ? "📈" : "📉";
  const msg =
    `${dir} <b>New Trade Opened</b>\n\n` +
    `<b>Symbol:</b> ${trade.symbol}\n` +
    `<b>Type:</b> ${trade.trade_type} (${trade.instrument})\n` +
    `<b>Entry:</b> ₹${Number(trade.entry_price).toLocaleString("en-IN")}\n` +
    `<b>Qty:</b> ${trade.quantity}\n` +
    (trade.stop_loss ? `<b>Stop Loss:</b> ₹${Number(trade.stop_loss).toLocaleString("en-IN")}\n` : "") +
    (trade.target ? `<b>Target:</b> ₹${Number(trade.target).toLocaleString("en-IN")}\n` : "") +
    (trade.strategy ? `<b>Strategy:</b> ${trade.strategy}\n` : "") +
    `<b>Date:</b> ${trade.trade_date}`;
  sendMessage(msg);
}

export function notifyTradeClosed(trade: Record<string, unknown>) {
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
    (trade.charges ? `<b>Charges:</b> ₹${Number(trade.charges).toLocaleString("en-IN")}\n` : "") +
    `<b>Date:</b> ${trade.trade_date}`;
  sendMessage(msg);
}

export function notifyTradeUpdated(trade: Record<string, unknown>) {
  const msg =
    `✏️ <b>Trade Updated</b>\n\n` +
    `<b>Symbol:</b> ${trade.symbol}\n` +
    `<b>Status:</b> ${trade.status}\n` +
    `<b>Type:</b> ${trade.trade_type} (${trade.instrument})`;
  sendMessage(msg);
}

export async function sendDailySummary(trades: Record<string, unknown>[]) {
  const today = new Date().toISOString().split("T")[0];

  const todayTrades = trades.filter((t) => {
    const d = String(t.trade_date ?? "").slice(0, 10);
    return d === today;
  });

  const allClosed = trades.filter((t) => t.status === "CLOSED");
  const totalPnl = allClosed.reduce(
    (sum, t) => sum + (Number(t.net_pnl) || 0),
    0
  );
  const wins = allClosed.filter((t) => Number(t.net_pnl) > 0).length;
  const losses = allClosed.filter((t) => Number(t.net_pnl) <= 0).length;
  const winRate =
    allClosed.length > 0
      ? ((wins / allClosed.length) * 100).toFixed(1)
      : "0.0";

  const todayPnl = todayTrades
    .filter((t) => t.status === "CLOSED")
    .reduce((sum, t) => sum + (Number(t.net_pnl) || 0), 0);

  const todayEmoji = todayPnl >= 0 ? "🟢" : "🔴";
  const totalEmoji = totalPnl >= 0 ? "✅" : "❌";

  let msg =
    `📊 <b>Daily Trading Summary</b>\n` +
    `📅 ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n`;

  if (todayTrades.length === 0) {
    msg += `No trades logged today.\n\n`;
  } else {
    msg +=
      `<b>Today's Activity:</b>\n` +
      `• Trades: ${todayTrades.length}\n` +
      `• ${todayEmoji} P&L: ₹${todayPnl.toLocaleString("en-IN")}\n\n`;

    const openToday = todayTrades.filter((t) => t.status === "OPEN");
    if (openToday.length > 0) {
      msg += `<b>Open Positions (${openToday.length}):</b>\n`;
      for (const t of openToday.slice(0, 5)) {
        msg += `• ${t.symbol} ${t.trade_type} @ ₹${Number(t.entry_price).toLocaleString("en-IN")}\n`;
      }
      if (openToday.length > 5) msg += `  ...and ${openToday.length - 5} more\n`;
      msg += "\n";
    }
  }

  msg +=
    `<b>Overall Performance:</b>\n` +
    `• Total Trades: ${allClosed.length}\n` +
    `• Win Rate: ${winRate}% (${wins}W / ${losses}L)\n` +
    `• ${totalEmoji} Net P&L: ₹${totalPnl.toLocaleString("en-IN")}`;

  return sendMessage(msg);
}
