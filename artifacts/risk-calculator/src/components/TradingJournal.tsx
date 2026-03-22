import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, TrendingUp, TrendingDown, Edit2, Trash2, X, Check, Calendar, CalendarDays, Loader2 } from "lucide-react";
import type { Trade } from "@/types/trade";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface FormData {
  trade_date: string;
  symbol: string;
  trade_type: string;
  instrument: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  option_type: string | null;
  strike_price: number | null;
  expiry_date: string | null;
  gross_pnl: number | null;
  charges: number;
  net_pnl: number | null;
  stop_loss: number | null;
  target: number | null;
  risk_amount: number | null;
  risk_reward_ratio: number | null;
  position_size_percent: number | null;
  capital_at_entry: number | null;
  strategy: string;
  setup_type: string;
  notes: string;
  status: string;
}

const defaultTrade: FormData = {
  trade_date: new Date().toISOString().split('T')[0],
  symbol: '',
  trade_type: 'LONG',
  instrument: 'EQUITY',
  entry_price: 0,
  exit_price: null,
  quantity: 1,
  option_type: null,
  strike_price: null,
  expiry_date: null,
  gross_pnl: null,
  charges: 0,
  net_pnl: null,
  stop_loss: null,
  target: null,
  risk_amount: null,
  risk_reward_ratio: null,
  position_size_percent: null,
  capital_at_entry: null,
  strategy: '',
  setup_type: '',
  notes: '',
  status: 'OPEN',
};

const apiUrl = (path: string) => `${BASE_URL}/api${path}`;

export const TradingJournal = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultTrade);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [closeTradeDialog, setCloseTradeDialog] = useState<Trade | null>(null);
  const [exitPriceInput, setExitPriceInput] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setFetching(true);
    try {
      const res = await fetch(apiUrl('/trades'));
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTrades(data || []);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load trades", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  const calculatePnL = (data: FormData): FormData => {
    if (!data.exit_price || !data.entry_price) return data;
    const isLong = data.trade_type === 'LONG';
    const grossPnl = isLong
      ? (data.exit_price - data.entry_price) * data.quantity
      : (data.entry_price - data.exit_price) * data.quantity;
    const charges = data.charges || 0;
    const netPnl = grossPnl - charges;

    let riskRewardRatio: number | null = null;
    if (data.stop_loss && data.target) {
      const risk = isLong ? data.entry_price - data.stop_loss : data.stop_loss - data.entry_price;
      const reward = isLong ? data.target - data.entry_price : data.entry_price - data.target;
      riskRewardRatio = risk > 0 ? reward / risk : null;
    }

    let riskAmount: number | null = null;
    if (data.stop_loss) {
      riskAmount = isLong
        ? (data.entry_price - data.stop_loss) * data.quantity
        : (data.stop_loss - data.entry_price) * data.quantity;
    }

    let positionSizePercent: number | null = null;
    if (data.capital_at_entry && data.capital_at_entry > 0) {
      positionSizePercent = ((data.entry_price * data.quantity) / data.capital_at_entry) * 100;
    }

    return {
      ...data,
      gross_pnl: grossPnl,
      net_pnl: netPnl,
      risk_reward_ratio: riskRewardRatio,
      risk_amount: riskAmount,
      position_size_percent: positionSizePercent,
      status: data.exit_price ? 'CLOSED' : 'OPEN',
    };
  };

  const handleSubmit = async () => {
    if (!formData.symbol || !formData.entry_price) {
      toast({ title: "Error", description: "Symbol and Entry Price are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const calculatedData = calculatePnL(formData);

    try {
      if (editingId) {
        const res = await fetch(apiUrl(`/trades/${editingId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calculatedData),
        });
        if (!res.ok) throw new Error('Failed to update');
        toast({ title: "Success", description: "Trade updated" });
      } else {
        const res = await fetch(apiUrl('/trades'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calculatedData),
        });
        if (!res.ok) throw new Error('Failed to create');
        toast({ title: "Success", description: "Trade added" });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(defaultTrade);
      fetchTrades();
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (trade: Trade) => {
    setFormData({
      trade_date: trade.trade_date,
      symbol: trade.symbol,
      trade_type: trade.trade_type,
      instrument: trade.instrument,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      quantity: trade.quantity,
      option_type: trade.option_type,
      strike_price: trade.strike_price,
      expiry_date: trade.expiry_date,
      gross_pnl: trade.gross_pnl,
      charges: trade.charges || 0,
      net_pnl: trade.net_pnl,
      stop_loss: trade.stop_loss,
      target: trade.target,
      risk_amount: trade.risk_amount,
      risk_reward_ratio: trade.risk_reward_ratio,
      position_size_percent: trade.position_size_percent,
      capital_at_entry: trade.capital_at_entry,
      strategy: trade.strategy || '',
      setup_type: trade.setup_type || '',
      notes: trade.notes || '',
      status: trade.status,
    });
    setEditingId(trade.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(apiUrl(`/trades/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast({ title: "Deleted", description: "Trade removed" });
      fetchTrades();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete trade", variant: "destructive" });
    }
  };

  const handleCloseTrade = async () => {
    if (!closeTradeDialog || !exitPriceInput) return;
    const trade = closeTradeDialog;
    const exitPrice = parseFloat(exitPriceInput);
    if (isNaN(exitPrice)) {
      toast({ title: "Error", description: "Please enter a valid exit price", variant: "destructive" });
      return;
    }

    const calculatedData = calculatePnL({
      ...defaultTrade,
      trade_date: trade.trade_date,
      symbol: trade.symbol,
      trade_type: trade.trade_type,
      instrument: trade.instrument,
      entry_price: trade.entry_price,
      quantity: trade.quantity,
      stop_loss: trade.stop_loss,
      target: trade.target,
      capital_at_entry: trade.capital_at_entry,
      exit_price: exitPrice,
      charges: trade.charges || 0,
    });

    try {
      const res = await fetch(apiUrl(`/trades/${trade.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...calculatedData, status: 'CLOSED' }),
      });
      if (!res.ok) throw new Error('Failed to close trade');
      fetchTrades();
      toast({ title: "Trade Closed", description: `P&L: ₹${calculatedData.net_pnl?.toFixed(2)}` });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }

    setCloseTradeDialog(null);
    setExitPriceInput("");
  };

  const exportToCSV = () => {
    const headers = [
      'Date', 'Symbol', 'Type', 'Instrument', 'Option Type', 'Strike', 'Entry', 'Exit',
      'Qty', 'Stop Loss', 'Target', 'Gross P&L', 'Charges', 'Net P&L', 'R:R',
      'Risk %', 'Strategy', 'Setup', 'Notes', 'Status'
    ];
    const escapeCSV = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = trades.map(t => [
      t.trade_date, t.symbol, t.trade_type, t.instrument, t.option_type || '',
      t.strike_price || '', t.entry_price, t.exit_price || '', t.quantity,
      t.stop_loss || '', t.target || '', t.gross_pnl || '', t.charges || '',
      t.net_pnl || '', t.risk_reward_ratio || '', t.position_size_percent || '',
      t.strategy || '', t.setup_type || '', t.notes || '', t.status
    ]);
    const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_journal_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalTrades = trades.length;
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const winningTrades = closedTrades.filter(t => (t.net_pnl || 0) > 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length * 100).toFixed(1) : 0;
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);

  return (
    <div className="space-y-6">
      {/* Close Trade Dialog */}
      <Dialog open={!!closeTradeDialog} onOpenChange={(open) => { if (!open) { setCloseTradeDialog(null); setExitPriceInput(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Trade — {closeTradeDialog?.symbol}</DialogTitle>
            <DialogDescription>Entry: ₹{closeTradeDialog?.entry_price} · Qty: {closeTradeDialog?.quantity}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="exitPrice">Exit Price (₹)</Label>
              <Input id="exitPrice" type="number" step="0.05" value={exitPriceInput} onChange={(e) => setExitPriceInput(e.target.value)}
                placeholder="Enter exit price" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleCloseTrade(); }} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCloseTradeDialog(null); setExitPriceInput(""); }}>Cancel</Button>
              <Button onClick={handleCloseTrade} disabled={!exitPriceInput}>Close Trade</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-mono font-bold text-primary">{totalTrades}</p>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-mono font-bold text-primary">{winRate}%</p>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total P&L</p>
            <p className={`text-2xl font-mono font-bold ${totalPnL >= 0 ? 'text-[hsl(142_76%_45%)]' : 'text-destructive'}`}>
              ₹{totalPnL.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Open Positions</p>
            <p className="text-2xl font-mono font-bold text-[hsl(45_93%_47%)]">
              {trades.filter(t => t.status === 'OPEN').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="glass border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData(defaultTrade); }} className="gap-2">
              <Plus size={16} /> Add Trade
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download size={16} /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trade Form */}
      {showForm && (
        <Card className="glass border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? 'Edit Trade' : 'New Trade'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={20} /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={formData.trade_date} onChange={(e) => setFormData({...formData, trade_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input placeholder="RELIANCE" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.trade_type} onValueChange={(v) => setFormData({...formData, trade_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LONG">LONG</SelectItem>
                    <SelectItem value="SHORT">SHORT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instrument</Label>
                <Select value={formData.instrument} onValueChange={(v) => setFormData({...formData, instrument: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EQUITY">EQUITY</SelectItem>
                    <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                    <SelectItem value="FUTURES">FUTURES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.instrument === 'OPTIONS' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Option Type</Label>
                  <Select value={formData.option_type || ''} onValueChange={(v) => setFormData({...formData, option_type: v})}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CE">CE</SelectItem>
                      <SelectItem value="PE">PE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Strike Price</Label>
                  <Input type="number" value={formData.strike_price || ''} onChange={(e) => setFormData({...formData, strike_price: parseFloat(e.target.value) || null})} />
                </div>
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Input type="date" value={formData.expiry_date || ''} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Entry Price</Label>
                <Input type="number" step="0.05" value={formData.entry_price || ''} onChange={(e) => setFormData({...formData, entry_price: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Exit Price</Label>
                <Input type="number" step="0.05" value={formData.exit_price || ''} onChange={(e) => setFormData({...formData, exit_price: parseFloat(e.target.value) || null})} />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} />
              </div>
              <div className="space-y-2">
                <Label>Stop Loss</Label>
                <Input type="number" step="0.05" value={formData.stop_loss || ''} onChange={(e) => setFormData({...formData, stop_loss: parseFloat(e.target.value) || null})} />
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Input type="number" step="0.05" value={formData.target || ''} onChange={(e) => setFormData({...formData, target: parseFloat(e.target.value) || null})} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Capital at Entry</Label>
                <Input type="number" value={formData.capital_at_entry || ''} onChange={(e) => setFormData({...formData, capital_at_entry: parseFloat(e.target.value) || null})} />
              </div>
              <div className="space-y-2">
                <Label>Charges (₹)</Label>
                <Input type="number" step="0.01" value={formData.charges || 0} onChange={(e) => setFormData({...formData, charges: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Input placeholder="Breakout, Reversal..." value={formData.strategy || ''} onChange={(e) => setFormData({...formData, strategy: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Setup Type</Label>
                <Input placeholder="Gap up, VWAP..." value={formData.setup_type || ''} onChange={(e) => setFormData({...formData, setup_type: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Trade reasoning, lessons learned..." value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : (editingId ? 'Update Trade' : 'Add Trade')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Trades List */}
      {fetching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => (
            <Card key={trade.id} className="glass border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-12 flex-shrink-0 rounded-full ${trade.status === 'OPEN' ? 'bg-[hsl(45_93%_47%)]' : (trade.net_pnl || 0) >= 0 ? 'bg-[hsl(142_76%_45%)]' : 'bg-destructive'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-lg">{trade.symbol}</span>
                        <Badge variant={trade.trade_type === 'LONG' ? 'default' : 'destructive'} className="text-xs">
                          {trade.trade_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{trade.instrument}</Badge>
                        {trade.option_type && (
                          <Badge variant="secondary" className="text-xs">{trade.strike_price} {trade.option_type}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span>{trade.trade_date}</span>
                        <span>Entry: ₹{trade.entry_price}</span>
                        {trade.exit_price && <span>Exit: ₹{trade.exit_price}</span>}
                        <span>Qty: {trade.quantity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end">
                    {trade.status === 'CLOSED' && (
                      <div className="text-left sm:text-right">
                        <div className={`font-mono font-bold text-lg ${(trade.net_pnl || 0) >= 0 ? 'text-[hsl(142_76%_45%)]' : 'text-destructive'}`}>
                          {(trade.net_pnl || 0) >= 0 ? <TrendingUp className="inline mr-1" size={16} /> : <TrendingDown className="inline mr-1" size={16} />}
                          ₹{trade.net_pnl?.toFixed(2)}
                        </div>
                        {trade.risk_reward_ratio && (
                          <div className="text-xs text-muted-foreground">R:R {trade.risk_reward_ratio.toFixed(2)}</div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-1">
                      {trade.status === 'OPEN' && (
                        <Button variant="ghost" size="icon" onClick={() => { setCloseTradeDialog(trade); setExitPriceInput(""); }} title="Close Trade">
                          <Check size={16} className="text-[hsl(142_76%_45%)]" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(trade)}><Edit2 size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(trade.id)}><Trash2 size={16} className="text-destructive" /></Button>
                    </div>
                  </div>
                </div>
                {trade.notes && (
                  <div className="mt-2 text-sm text-muted-foreground border-t border-border/30 pt-2">{trade.notes}</div>
                )}
              </CardContent>
            </Card>
          ))}
          {trades.length === 0 && (
            <Card className="glass border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                No trades yet. Click "Add Trade" to log your first trade.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
