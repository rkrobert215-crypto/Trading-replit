export type TradeRecord = Record<string, unknown>;

export interface PeriodStats {
  period: string;
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  winRate: string;
  grossPnl: number;
  charges: number;
  netPnl: number;
}

function computeStats(period: string, trades: TradeRecord[]): PeriodStats {
  const closed = trades.filter((t) => t.status === "CLOSED");
  const open = trades.filter((t) => t.status === "OPEN");
  const wins = closed.filter((t) => Number(t.net_pnl) > 0).length;
  const losses = closed.filter((t) => Number(t.net_pnl) <= 0).length;
  const winRate =
    closed.length > 0
      ? ((wins / closed.length) * 100).toFixed(1)
      : "0.0";
  const grossPnl = closed.reduce((s, t) => s + (Number(t.gross_pnl) || 0), 0);
  const charges = closed.reduce((s, t) => s + (Number(t.charges) || 0), 0);
  const netPnl = closed.reduce((s, t) => s + (Number(t.net_pnl) || 0), 0);
  return {
    period,
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: open.length,
    wins,
    losses,
    winRate,
    grossPnl,
    charges,
    netPnl,
  };
}

export function computeDailySummaries(trades: TradeRecord[]): PeriodStats[] {
  const grouped: Record<string, TradeRecord[]> = {};
  for (const t of trades) {
    const date = String(t.trade_date ?? "").slice(0, 10);
    if (!date) continue;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(t);
  }
  return Object.keys(grouped)
    .sort()
    .reverse()
    .map((date) => computeStats(date, grouped[date]));
}

export function computeWeeklySummaries(trades: TradeRecord[]): PeriodStats[] {
  const grouped: Record<string, TradeRecord[]> = {};
  for (const t of trades) {
    const date = String(t.trade_date ?? "").slice(0, 10);
    if (!date) continue;
    const d = new Date(date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const label = `${monday.toISOString().slice(0, 10)} to ${sunday.toISOString().slice(0, 10)}`;
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(t);
  }
  return Object.keys(grouped)
    .sort()
    .reverse()
    .map((label) => computeStats(label, grouped[label]));
}

export function computeMonthlySummaries(trades: TradeRecord[]): PeriodStats[] {
  const grouped: Record<string, TradeRecord[]> = {};
  for (const t of trades) {
    const date = String(t.trade_date ?? "").slice(0, 7);
    if (!date) continue;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(t);
  }
  return Object.keys(grouped)
    .sort()
    .reverse()
    .map((month) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
        "en-IN",
        { month: "long", year: "numeric" }
      );
      return computeStats(label, grouped[month]);
    });
}
