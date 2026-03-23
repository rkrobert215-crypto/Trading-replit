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
