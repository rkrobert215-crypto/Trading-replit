import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Target, Award,
  BarChart3, PieChart, Activity, Loader2, FileText
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from "recharts";
import type { Trade } from "@/types/trade";
import { formatCurrency } from "@/lib/formatters";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const apiUrl = (path: string) => `${BASE_URL}/api${path}`;

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  border: 'hsl(var(--border))',
  muted: 'hsl(var(--muted-foreground))',
};
const PIE_COLORS = ['hsl(var(--primary))', 'hsl(142 76% 45%)', 'hsl(45 93% 47%)', 'hsl(280, 65%, 60%)'];

interface DailyPnL { date: string; pnl: number; cumulative: number; trades: number; }
interface WeeklyStats { week: string; winRate: number; trades: number; pnl: number; }
interface InstrumentStats { name: string; trades: number; pnl: number; winRate: number; }

const PerformanceDashboard = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/trades'));
      if (!res.ok) throw new Error('Failed to fetch');
      const all = (await res.json()) as Trade[];
      setTrades(all.filter(t => t.status === 'CLOSED').sort((a, b) => a.trade_date.localeCompare(b.trade_date)));
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    const winningTrades = trades.filter(t => (t.net_pnl || 0) > 0);
    const losingTrades = trades.filter(t => (t.net_pnl || 0) < 0);
    const totalPnL = trades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
    const totalGrossPnL = trades.reduce((sum, t) => sum + (t.gross_pnl || 0), 0);
    const totalCharges = trades.reduce((sum, t) => sum + (t.charges || 0), 0);
    const wins = winningTrades.map(t => t.net_pnl || 0);
    const losses = losingTrades.map(t => Math.abs(t.net_pnl || 0));
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    const largestWin = wins.length > 0 ? Math.max(...wins) : 0;
    const largestLoss = losses.length > 0 ? Math.max(...losses) : 0;
    const totalWins = wins.reduce((a, b) => a + b, 0);
    const totalLosses = losses.reduce((a, b) => a + b, 0);
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const avgRR = trades.filter(t => t.risk_reward_ratio != null)
      .reduce((sum, t, _, arr) => sum + (t.risk_reward_ratio || 0) / arr.length, 0);
    return {
      totalTrades: trades.length, winningTrades: winningTrades.length, losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      totalPnL, totalGrossPnL, totalCharges, avgWin, avgLoss, largestWin, largestLoss,
      profitFactor, avgRR,
      expectancy: avgWin * (winningTrades.length / trades.length) - avgLoss * (losingTrades.length / trades.length),
    };
  }, [trades]);

  const dailyPnL = useMemo((): DailyPnL[] => {
    if (trades.length === 0) return [];
    const grouped = trades.reduce((acc, t) => {
      const d = t.trade_date;
      if (!acc[d]) acc[d] = { pnl: 0, trades: 0 };
      acc[d].pnl += t.net_pnl || 0;
      acc[d].trades += 1;
      return acc;
    }, {} as Record<string, { pnl: number; trades: number }>);
    let cumulative = 0;
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => {
      cumulative += data.pnl;
      return { date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), pnl: data.pnl, cumulative, trades: data.trades };
    });
  }, [trades]);

  const weeklyStats = useMemo((): WeeklyStats[] => {
    if (trades.length === 0) return [];
    const grouped = trades.reduce((acc, trade) => {
      const date = new Date(trade.trade_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      if (!acc[weekKey]) acc[weekKey] = { trades: [], pnl: 0 };
      acc[weekKey].trades.push(trade);
      acc[weekKey].pnl += trade.net_pnl || 0;
      return acc;
    }, {} as Record<string, { trades: Trade[]; pnl: number }>);
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([week, data]) => {
      const wins = data.trades.filter(t => (t.net_pnl || 0) > 0).length;
      return {
        week: new Date(week).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        winRate: (wins / data.trades.length) * 100, trades: data.trades.length, pnl: data.pnl,
      };
    });
  }, [trades]);

  const instrumentStats = useMemo((): InstrumentStats[] => {
    if (trades.length === 0) return [];
    const grouped = trades.reduce((acc, trade) => {
      const key = trade.instrument;
      if (!acc[key]) acc[key] = { trades: [], pnl: 0 };
      acc[key].trades.push(trade);
      acc[key].pnl += trade.net_pnl || 0;
      return acc;
    }, {} as Record<string, { trades: Trade[]; pnl: number }>);
    return Object.entries(grouped).map(([name, data]) => {
      const wins = data.trades.filter(t => (t.net_pnl || 0) > 0).length;
      return { name, trades: data.trades.length, pnl: data.pnl, winRate: (wins / data.trades.length) * 100 };
    });
  }, [trades]);

  const exportDashboardReport = () => {
    if (!stats) return;
    const lines = [
      `TRADING PERFORMANCE REPORT`,
      `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      ``, `=== OVERVIEW ===`,
      `Total Trades: ${stats.totalTrades}`,
      `Winning: ${stats.winningTrades} | Losing: ${stats.losingTrades}`,
      `Win Rate: ${stats.winRate.toFixed(1)}%`,
      ``, `=== P&L SUMMARY ===`,
      `Net P&L: ${formatCurrency(stats.totalPnL)}`,
      `Gross P&L: ${formatCurrency(stats.totalGrossPnL)}`,
      `Total Charges: ${formatCurrency(stats.totalCharges)}`,
      ``, `=== STATISTICS ===`,
      `Avg Win: ${formatCurrency(stats.avgWin)}`,
      `Avg Loss: ${formatCurrency(stats.avgLoss)}`,
      `Largest Win: ${formatCurrency(stats.largestWin)}`,
      `Largest Loss: ${formatCurrency(stats.largestLoss)}`,
      `Profit Factor: ${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}`,
      `Expectancy: ${formatCurrency(stats.expectancy)}`,
      `Avg R:R: ${stats.avgRR.toFixed(2)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (trades.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Closed Trades Yet</h3>
        <p className="text-muted-foreground">Close some trades in the Journal tab to see your performance analytics.</p>
      </div>
    );
  }

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Performance Analytics</h2>
        <Button variant="outline" size="sm" onClick={exportDashboardReport} className="gap-2">
          <FileText className="h-4 w-4" /><span className="hidden sm:inline">Export</span> Report
        </Button>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="glass border-border/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Target className="h-4 w-4" /><span className="text-xs">Win Rate</span></div>
          <p className="text-2xl font-mono font-bold text-primary">{stats?.winRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">{stats?.winningTrades}W / {stats?.losingTrades}L</p>
        </CardContent></Card>

        <Card className="glass border-border/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            {(stats?.totalPnL || 0) >= 0 ? <TrendingUp className="h-4 w-4 text-[hsl(142_76%_45%)]" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            <span className="text-xs">Total P&L</span>
          </div>
          <p className={`text-2xl font-mono font-bold ${(stats?.totalPnL || 0) >= 0 ? 'text-[hsl(142_76%_45%)]' : 'text-destructive'}`}>
            {formatCurrency(stats?.totalPnL || 0)}
          </p>
          <p className="text-xs text-muted-foreground">Charges: {formatCurrency(stats?.totalCharges || 0)}</p>
        </CardContent></Card>

        <Card className="glass border-border/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Award className="h-4 w-4" /><span className="text-xs">Profit Factor</span></div>
          <p className="text-2xl font-mono font-bold text-primary">{stats?.profitFactor === Infinity ? '∞' : stats?.profitFactor.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Expectancy: {formatCurrency(stats?.expectancy || 0)}</p>
        </CardContent></Card>

        <Card className="glass border-border/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Activity className="h-4 w-4" /><span className="text-xs">Avg Win/Loss</span></div>
          <p className="text-lg font-mono">
            <span className="text-[hsl(142_76%_45%)]">{formatCurrency(stats?.avgWin || 0)}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-destructive">{formatCurrency(stats?.avgLoss || 0)}</span>
          </p>
          <p className="text-xs text-muted-foreground">{stats?.totalTrades} total trades</p>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />Cumulative P&L
          </CardTitle></CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyPnL}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                  <XAxis dataKey="date" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} />
                  <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Cumulative P&L']} />
                  <Area type="monotone" dataKey="cumulative" stroke={CHART_COLORS.primary} fill="url(#pnlGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />Daily P&L
          </CardTitle></CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                  <XAxis dataKey="date" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} />
                  <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [formatCurrency(v), n === 'pnl' ? 'P&L' : n]} />
                  <Bar dataKey="pnl" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />Weekly Win Rate Trend
          </CardTitle></CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                  <XAxis dataKey="week" stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} />
                  <YAxis stroke={CHART_COLORS.muted} fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => n === 'winRate' ? [`${v.toFixed(1)}%`, 'Win Rate'] : [v, n]} />
                  <Line type="monotone" dataKey="winRate" stroke={CHART_COLORS.primary} strokeWidth={2}
                    dot={{ fill: CHART_COLORS.primary, strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: CHART_COLORS.primary }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />By Instrument
          </CardTitle></CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={instrumentStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={2} dataKey="trades" nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                    {instrumentStats.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number, _n: string, props: { payload?: InstrumentStats }) => {
                    const d = props.payload;
                    return [`${v} trades | ${d?.winRate.toFixed(0)}% WR | ${formatCurrency(d?.pnl || 0)}`, d?.name || ''];
                  }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-base">Detailed Statistics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-3">
              <div><p className="text-muted-foreground">Largest Win</p><p className="font-mono text-[hsl(142_76%_45%)]">{formatCurrency(stats?.largestWin || 0)}</p></div>
              <div><p className="text-muted-foreground">Largest Loss</p><p className="font-mono text-destructive">{formatCurrency(stats?.largestLoss || 0)}</p></div>
            </div>
            <div className="space-y-3">
              <div><p className="text-muted-foreground">Avg R:R Achieved</p><p className="font-mono text-primary">{stats?.avgRR.toFixed(2) || '0'}</p></div>
              <div><p className="text-muted-foreground">Gross P&L</p><p className="font-mono">{formatCurrency(stats?.totalGrossPnL || 0)}</p></div>
            </div>
            <div className="space-y-3">
              <div><p className="text-muted-foreground">Total Charges</p><p className="font-mono text-[hsl(45_93%_47%)]">{formatCurrency(stats?.totalCharges || 0)}</p></div>
              <div><p className="text-muted-foreground">Charge %</p>
                <p className="font-mono text-[hsl(45_93%_47%)]">
                  {stats?.totalGrossPnL ? ((stats.totalCharges / Math.abs(stats.totalGrossPnL)) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div><p className="text-muted-foreground">Win/Loss Ratio</p><p className="font-mono text-primary">{stats?.avgLoss ? (stats.avgWin / stats.avgLoss).toFixed(2) : '∞'}</p></div>
              <div><p className="text-muted-foreground">Expectancy</p>
                <p className={`font-mono ${(stats?.expectancy || 0) >= 0 ? 'text-[hsl(142_76%_45%)]' : 'text-destructive'}`}>
                  {formatCurrency(stats?.expectancy || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;
