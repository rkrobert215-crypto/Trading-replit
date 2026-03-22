import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Target, AlertTriangle, IndianRupee, Percent, Activity } from "lucide-react";
import { calculateCharges } from "@/lib/charges";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const FUTURES_LOT_SIZES: Record<string, number> = {
  NIFTY: 25,
  BANKNIFTY: 15,
  FINNIFTY: 25,
  MIDCPNIFTY: 50,
  SENSEX: 10,
  BANKEX: 15,
};

interface FuturesInputs {
  symbol: string;
  lotSize: string;
  customLotSize: string;
  useCustomLot: boolean;
  contractPrice: string;
  marginPercent: string;
  capital: string;
  riskPercent: string;
  riskAmount: string;
  riskType: 'percent' | 'fixed';
  stopLoss: string;
  target: string;
  tradeDirection: 'LONG' | 'SHORT';
}

const FuturesCalculator = () => {
  const { toast } = useToast();
  const [inputs, setInputs] = useState<FuturesInputs>({
    symbol: 'NIFTY',
    lotSize: '25',
    customLotSize: '',
    useCustomLot: false,
    contractPrice: '',
    marginPercent: '10',
    capital: '100000',
    riskPercent: '2',
    riskAmount: '2000',
    riskType: 'percent',
    stopLoss: '',
    target: '',
    tradeDirection: 'LONG',
  });

  const handleChange = (field: keyof FuturesInputs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setInputs(prev => ({ ...prev, [field]: e.target.value }));
  };

  const lotSize = inputs.useCustomLot
    ? (parseInt(inputs.customLotSize) || 1)
    : (FUTURES_LOT_SIZES[inputs.symbol] || parseInt(inputs.lotSize) || 25);

  const calc = useMemo(() => {
    const contractPrice = parseFloat(inputs.contractPrice) || 0;
    const marginPercent = parseFloat(inputs.marginPercent) || 10;
    const capital = parseFloat(inputs.capital) || 0;
    const riskPercent = parseFloat(inputs.riskPercent) || 0;
    const fixedRisk = parseFloat(inputs.riskAmount) || 0;
    const stopLoss = parseFloat(inputs.stopLoss) || 0;
    const target = parseFloat(inputs.target) || 0;

    const contractValue = contractPrice * lotSize;
    const marginPerLot = (contractValue * marginPercent) / 100;

    const maxLotsByCapital = marginPerLot > 0 ? Math.floor(capital / marginPerLot) : 0;
    const totalMarginRequired = maxLotsByCapital * marginPerLot;

    const riskAmount = inputs.riskType === 'percent'
      ? (capital * riskPercent) / 100
      : fixedRisk;

    const isLong = inputs.tradeDirection === 'LONG';
    const riskPerUnit = stopLoss > 0 ? (isLong ? contractPrice - stopLoss : stopLoss - contractPrice) : 0;
    const riskPerLot = riskPerUnit * lotSize;
    const riskBasedLots = riskPerLot > 0 ? Math.floor(riskAmount / riskPerLot) : 0;

    const finalLots = Math.min(riskBasedLots, maxLotsByCapital);
    const quantity = finalLots * lotSize;
    const positionValue = contractPrice * quantity;
    const marginUsed = finalLots * marginPerLot;

    const rewardPerUnit = target > 0 ? (isLong ? target - contractPrice : contractPrice - target) : 0;
    const rewardPerLot = rewardPerUnit * lotSize;
    const potentialProfit = finalLots * rewardPerLot;
    const actualRisk = finalLots * riskPerLot;
    const riskRewardRatio = riskPerUnit > 0 && rewardPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;

    const charges = calculateCharges(positionValue, 'futures');
    const totalCharges = charges.total;

    const oneLotMargin = marginPerLot;
    const oneLotRisk = riskPerLot;
    const oneLotReward = rewardPerLot;

    return {
      contractValue,
      marginPerLot,
      maxLotsByCapital,
      totalMarginRequired,
      finalLots,
      quantity,
      positionValue,
      marginUsed,
      potentialProfit: potentialProfit - totalCharges,
      actualRisk: actualRisk + totalCharges,
      riskRewardRatio,
      totalCharges,
      oneLotMargin,
      oneLotRisk,
      oneLotReward,
      marginUtilization: capital > 0 ? (marginUsed / capital) * 100 : 0,
    };
  }, [inputs, lotSize]);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-6">
          {/* Instrument Setup */}
          <div className="glass rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Activity className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Futures Contract</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Symbol / Index</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Select a preset index or type your own</p>
                <select value={inputs.useCustomLot ? 'CUSTOM' : inputs.symbol}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setInputs(prev => ({ ...prev, useCustomLot: true }));
                    } else {
                      const sym = e.target.value;
                      setInputs(prev => ({ ...prev, symbol: sym, lotSize: String(FUTURES_LOT_SIZES[sym] || 25), useCustomLot: false }));
                    }
                  }}
                  className="flex h-12 w-full rounded-lg border border-border bg-input px-4 py-2 text-base font-mono focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="NIFTY">NIFTY (Lot: 25)</option>
                  <option value="BANKNIFTY">BANKNIFTY (Lot: 15)</option>
                  <option value="FINNIFTY">FINNIFTY (Lot: 25)</option>
                  <option value="MIDCPNIFTY">MIDCPNIFTY (Lot: 50)</option>
                  <option value="SENSEX">SENSEX (Lot: 10)</option>
                  <option value="BANKEX">BANKEX (Lot: 15)</option>
                  <option value="CUSTOM">Custom Stock Futures</option>
                </select>
              </div>

              <div className="space-y-2">
                {inputs.useCustomLot ? (
                  <>
                    <Label className="text-muted-foreground">Custom Lot Size</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Units per futures contract</p>
                    <Input type="number" value={inputs.customLotSize} onChange={handleChange("customLotSize")} placeholder="e.g., 500" />
                  </>
                ) : (
                  <>
                    <Label className="text-muted-foreground">Lot Size</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Units per contract (pre-filled)</p>
                    <Input type="number" value={lotSize} readOnly className="bg-secondary/50 cursor-not-allowed" />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2"><IndianRupee className="w-4 h-4" />Contract Price (₹)</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Current futures contract price</p>
                <Input type="number" value={inputs.contractPrice} onChange={handleChange("contractPrice")} placeholder="e.g., 24500" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" />Margin Required (%)</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">SPAN + Exposure margin (typically 8-15%)</p>
                <Input type="number" value={inputs.marginPercent} onChange={handleChange("marginPercent")} placeholder="10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Trade Direction</Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">LONG = buy futures; SHORT = sell futures</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setInputs(prev => ({ ...prev, tradeDirection: 'LONG' }))}
                  className={`h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${inputs.tradeDirection === 'LONG' ? 'bg-[hsl(142_76%_45%)] text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                  <TrendingUp className="w-4 h-4" /> LONG
                </button>
                <button onClick={() => setInputs(prev => ({ ...prev, tradeDirection: 'SHORT' }))}
                  className={`h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${inputs.tradeDirection === 'SHORT' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                  <TrendingDown className="w-4 h-4" /> SHORT
                </button>
              </div>
            </div>
          </div>

          {/* Risk & Capital */}
          <div className="glass rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Target className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Risk & Capital</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2"><IndianRupee className="w-4 h-4" />Capital (₹)</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Total account balance</p>
                <Input type="number" value={inputs.capital} onChange={handleChange("capital")} placeholder="100000" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Risk Type</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Define risk as % or fixed ₹</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setInputs(prev => ({ ...prev, riskType: 'percent' }))}
                    className={`h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${inputs.riskType === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                    <Percent className="w-3 h-3" /> %
                  </button>
                  <button onClick={() => setInputs(prev => ({ ...prev, riskType: 'fixed' }))}
                    className={`h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${inputs.riskType === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                    <IndianRupee className="w-3 h-3" /> Fixed
                  </button>
                </div>
              </div>
            </div>

            {inputs.riskType === 'percent' ? (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Risk %</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">% of capital to risk (recommended: 1-2%)</p>
                <Input type="number" value={inputs.riskPercent} onChange={handleChange("riskPercent")} placeholder="2" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Risk Amount (₹)</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Max rupees you are willing to lose</p>
                <Input type="number" value={inputs.riskAmount} onChange={handleChange("riskAmount")} placeholder="2000" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />Stop Loss (₹)
                </Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Price level to exit with limited loss</p>
                <Input type="number" value={inputs.stopLoss} onChange={handleChange("stopLoss")} placeholder="e.g., 24200" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[hsl(142_76%_45%)]" />Target (₹)
                </Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Price level to book profit</p>
                <Input type="number" value={inputs.target} onChange={handleChange("target")} placeholder="e.g., 24800" />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Contract Info */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg text-foreground mb-4">Contract Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Contract Value</p>
                <p className="text-xl font-bold text-foreground font-mono">{formatCurrency(calc.contractValue)}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Margin/Lot</p>
                <p className="text-xl font-bold text-foreground font-mono">{formatCurrency(calc.marginPerLot)}</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Max Lots (Capital)</p>
                <p className="text-3xl font-bold text-primary font-mono">{calc.maxLotsByCapital}</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Total Margin Needed</p>
                <p className="text-xl font-bold text-primary font-mono">{formatCurrency(calc.totalMarginRequired)}</p>
              </div>
            </div>
          </div>

          {/* Risk-Based Position */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg text-foreground mb-4">Risk-Based Position Size</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Lots</p>
                <p className="text-3xl font-bold text-foreground font-mono">{calc.finalLots}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Quantity</p>
                <p className="text-3xl font-bold text-foreground font-mono">{calc.quantity}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Margin Used</p>
                <p className="text-xl font-bold text-foreground font-mono">{formatCurrency(calc.marginUsed)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-muted-foreground text-sm">Max Loss</p>
                </div>
                <p className="text-xl font-bold text-destructive font-mono">{formatCurrency(calc.actualRisk)}</p>
              </div>
              <div className="bg-[hsl(142_76%_45%_/_0.1)] border border-[hsl(142_76%_45%_/_0.3)] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[hsl(142_76%_45%)]" />
                  <p className="text-muted-foreground text-sm">Potential Profit</p>
                </div>
                <p className="text-xl font-bold text-[hsl(142_76%_45%)] font-mono">{formatCurrency(calc.potentialProfit)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 py-2">
              <span className="text-muted-foreground">Risk : Reward</span>
              <span className={`text-xl font-bold font-mono ${calc.riskRewardRatio >= 2 ? 'text-[hsl(142_76%_45%)]' : calc.riskRewardRatio >= 1 ? 'text-[hsl(45_93%_47%)]' : 'text-destructive'}`}>
                1 : {formatNumber(calc.riskRewardRatio)}
              </span>
            </div>
          </div>

          {/* One Lot Summary */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg text-foreground mb-4">One Lot Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Margin (1 Lot)</p>
                <p className="text-lg font-bold text-foreground font-mono">{formatCurrency(calc.oneLotMargin)}</p>
              </div>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Risk (1 Lot)</p>
                <p className="text-lg font-bold text-destructive font-mono">{formatCurrency(calc.oneLotRisk)}</p>
              </div>
              <div className="bg-[hsl(142_76%_45%_/_0.1)] border border-[hsl(142_76%_45%_/_0.3)] rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Reward (1 Lot)</p>
                <p className="text-lg font-bold text-[hsl(142_76%_45%)] font-mono">{formatCurrency(calc.oneLotReward)}</p>
              </div>
            </div>
          </div>

          {/* Margin Utilization */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg text-foreground mb-4">Margin Utilization</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Capital Used</span>
                <span className={`font-mono font-bold ${calc.marginUtilization > 80 ? 'text-destructive' : calc.marginUtilization > 50 ? 'text-[hsl(45_93%_47%)]' : 'text-[hsl(142_76%_45%)]'}`}>
                  {formatNumber(calc.marginUtilization)}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${calc.marginUtilization > 80 ? 'bg-destructive' : calc.marginUtilization > 50 ? 'bg-[hsl(45_93%_47%)]' : 'bg-[hsl(142_76%_45%)]'}`}
                  style={{ width: `${Math.min(calc.marginUtilization, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Margin Used: {formatCurrency(calc.marginUsed)}</span>
                <span>Free: {formatCurrency(Math.max(0, parseFloat(inputs.capital) - calc.marginUsed))}</span>
              </div>
            </div>

            <div className="mt-4 bg-secondary/50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Estimated Charges</span>
              <span className="text-primary font-mono font-medium">₹{formatNumber(calc.totalCharges, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuturesCalculator;
