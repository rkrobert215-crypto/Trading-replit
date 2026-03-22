import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Target, Shield, AlertTriangle, IndianRupee, Percent, CheckCircle2 } from "lucide-react";
import { getSettings, AppSettings } from "@/components/SettingsPanel";
import { calculateCharges } from "@/lib/charges";
import { formatCurrency, formatNumber, handleWheel } from "@/lib/formatters";

interface CalculatorInputs {
  symbol: string;
  capital: string;
  deployedCapital: string;
  deployedType: 'percent' | 'fixed';
  leverage: string;
  riskPercent: string;
  riskAmount: string;
  riskType: 'percent' | 'fixed';
  entryPrice: string;
  stopLoss: string;
  targetPrice: string;
  tradeDirection: 'LONG' | 'SHORT';
  useMaxBuyingPower: boolean;
}

const EquityCalculator = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings);

  useEffect(() => {
    const handleSettingsChange = (e: CustomEvent<AppSettings>) => {
      setAppSettings(e.detail);
    };
    window.addEventListener("settingsChanged", handleSettingsChange as EventListener);
    return () => window.removeEventListener("settingsChanged", handleSettingsChange as EventListener);
  }, []);

  const [inputs, setInputs] = useState<CalculatorInputs>({
    symbol: "",
    capital: "100000",
    deployedCapital: "20",
    deployedType: 'percent',
    leverage: "5",
    riskPercent: "1",
    riskAmount: "1000",
    riskType: 'percent',
    entryPrice: "",
    stopLoss: "",
    targetPrice: "",
    tradeDirection: 'LONG',
    useMaxBuyingPower: false,
  });

  const calculations = useMemo(() => {
    const totalCapital = parseFloat(inputs.capital) || 0;
    const deployedPercent = parseFloat(inputs.deployedCapital) || 0;
    const fixedDeployed = parseFloat(inputs.deployedCapital) || 0;
    const leverage = parseFloat(inputs.leverage) || 1;
    const riskPercent = parseFloat(inputs.riskPercent) || 0;
    const fixedRisk = parseFloat(inputs.riskAmount) || 0;
    const entry = parseFloat(inputs.entryPrice) || 0;
    const sl = parseFloat(inputs.stopLoss) || 0;
    const target = parseFloat(inputs.targetPrice) || 0;
    const isLong = inputs.tradeDirection === 'LONG';
    const isCNC = leverage === 1;

    const deployedCapital = inputs.deployedType === 'percent'
      ? (totalCapital * deployedPercent) / 100
      : fixedDeployed;

    const buyingPower = deployedCapital * leverage;

    const configuredRiskAmount = inputs.riskType === 'percent'
      ? (deployedCapital * riskPercent) / 100
      : fixedRisk;
    const riskPerShare = isLong ? entry - sl : sl - entry;

    let quantity: number;
    let wasQuantityCapped = false;
    if (inputs.useMaxBuyingPower && entry > 0) {
      quantity = Math.floor(buyingPower / entry);
    } else {
      const riskBasedQty = riskPerShare > 0 ? Math.floor(configuredRiskAmount / riskPerShare) : 0;
      const maxQtyByCapital = entry > 0 ? Math.floor(buyingPower / entry) : 0;
      if (riskBasedQty > maxQtyByCapital && maxQtyByCapital > 0) {
        quantity = maxQtyByCapital;
        wasQuantityCapped = true;
      } else {
        quantity = riskBasedQty;
      }
    }

    const requiredDeployedCapital = riskPerShare > 0 && entry > 0
      ? Math.ceil((configuredRiskAmount / riskPerShare) * entry / leverage)
      : 0;

    const riskAmount = (inputs.useMaxBuyingPower || wasQuantityCapped)
      ? quantity * riskPerShare
      : configuredRiskAmount;

    const positionValue = quantity * entry;
    const marginRequired = isCNC ? positionValue : positionValue / leverage;

    const rewardPerShare = isLong ? target - entry : entry - target;
    const potentialProfit = quantity * rewardPerShare;
    const riskRewardRatio = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;

    const slPercent = entry > 0 ? Math.abs((entry - sl) / entry) * 100 : 0;
    const targetPercent = entry > 0 ? Math.abs((target - entry) / entry) * 100 : 0;

    const capitalAtRiskPercent = totalCapital > 0 ? (riskAmount / totalCapital) * 100 : 0;

    const exceedsBuyingPower = positionValue > buyingPower;

    const trailingSLLevels = isLong ? {
      costToEntry: entry,
      oneR: entry + riskPerShare,
      twoR: entry + (riskPerShare * 2),
      threeR: entry + (riskPerShare * 3),
    } : {
      costToEntry: entry,
      oneR: entry - riskPerShare,
      twoR: entry - (riskPerShare * 2),
      threeR: entry - (riskPerShare * 3),
    };

    const segment = isCNC ? 'equity-cnc' as const : 'equity-intraday' as const;
    const charges = calculateCharges(positionValue, segment);
    const totalCharges = charges.total;
    const netProfit = potentialProfit - totalCharges;
    const actualLoss = riskAmount + totalCharges;

    const isValidSetup = isLong
      ? (entry > sl && target > entry)
      : (sl > entry && entry > target);

    return {
      riskAmount,
      quantity,
      positionValue,
      marginRequired,
      potentialProfit,
      riskRewardRatio,
      totalCharges,
      netProfit,
      actualLoss,
      isLong,
      isValid: entry > 0 && sl > 0 && target > 0 && quantity > 0 && isValidSetup,
      riskPerShare,
      deployedCapital,
      buyingPower,
      leverage,
      slPercent,
      targetPercent,
      capitalAtRiskPercent,
      exceedsBuyingPower,
      wasQuantityCapped,
      requiredDeployedCapital,
      trailingSLLevels,
      isCNC,
      totalCapital,
    };
  }, [inputs]);

  const handleChange = (field: keyof CalculatorInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="space-y-6">
        {/* Capital & Risk Card */}
        <div className="glass rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 text-primary mb-4">
            <Shield className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Capital & Risk Settings</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                Total Capital
              </Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">Your total trading account balance</p>
              <Input type="number" value={inputs.capital} onChange={handleChange("capital")} onWheel={handleWheel} placeholder="100000" />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Capital Allocation</Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">How much of your capital to deploy in this trade</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setInputs(prev => ({ ...prev, deployedType: 'percent' }))}
                  className={`h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${inputs.deployedType === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                  <Percent className="w-3 h-3" /> Percentage
                </button>
                <button onClick={() => setInputs(prev => ({ ...prev, deployedType: 'fixed' }))}
                  className={`h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${inputs.deployedType === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                  <IndianRupee className="w-3 h-3" /> Fixed Amount
                </button>
              </div>
            </div>

            {inputs.deployedType === 'percent' ? (
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" />Deploy % of Capital</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">e.g., 20% of ₹1L = ₹20,000 deployed</p>
                <Input type="number" value={inputs.deployedCapital} onChange={handleChange("deployedCapital")} onWheel={handleWheel} placeholder="20" step="5" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2"><IndianRupee className="w-4 h-4" />Deploy Amount (₹)</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Fixed rupee amount to use for this trade</p>
                <Input type="number" value={inputs.deployedCapital} onChange={handleChange("deployedCapital")} onWheel={handleWheel} placeholder="20000" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-muted-foreground">Leverage</Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">CNC = delivery (no leverage), 2x-5x = intraday margin</p>
              <div className="grid grid-cols-5 gap-2">
                {['1', '2', '3', '4', '5'].map((lev) => (
                  <button key={lev} onClick={() => setInputs(prev => ({ ...prev, leverage: lev }))}
                    className={`h-10 rounded-lg font-medium text-sm transition-all ${inputs.leverage === lev ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                    {lev === '1' ? 'CNC' : `${lev}x`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Position Sizing Mode</Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">Risk-Based = size by SL risk; Max = use full buying power</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setInputs(prev => ({ ...prev, useMaxBuyingPower: false }))}
                  className={`h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${!inputs.useMaxBuyingPower ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                  <Shield className="w-3 h-3" /> Risk-Based
                </button>
                <button onClick={() => setInputs(prev => ({ ...prev, useMaxBuyingPower: true }))}
                  className={`h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${inputs.useMaxBuyingPower ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                  <TrendingUp className="w-3 h-3" /> Max Buying Power
                </button>
              </div>
            </div>

            {!inputs.useMaxBuyingPower && (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Risk Type</Label>
                  <p className="text-[11px] text-muted-foreground/70 -mt-1">Define risk as % of capital or fixed ₹ amount</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setInputs(prev => ({ ...prev, riskType: 'percent' }))}
                      className={`h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${inputs.riskType === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                      <Percent className="w-3 h-3" /> Percentage
                    </button>
                    <button onClick={() => setInputs(prev => ({ ...prev, riskType: 'fixed' }))}
                      className={`h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1 ${inputs.riskType === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                      <IndianRupee className="w-3 h-3" /> Fixed Amount
                    </button>
                  </div>
                </div>

                {inputs.riskType === 'percent' ? (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" />Risk Per Trade (%)</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Max % of capital you can lose (recommended: 1-2%)</p>
                    <Input type="number" value={inputs.riskPercent} onChange={handleChange("riskPercent")} onWheel={handleWheel} placeholder="1" step="0.1" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2"><IndianRupee className="w-4 h-4" />Risk Amount (₹)</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Max rupees you're willing to lose on this trade</p>
                    <Input type="number" value={inputs.riskAmount} onChange={handleChange("riskAmount")} onWheel={handleWheel} placeholder="1000" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Trade Details Card */}
        <div className="glass rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2 text-primary mb-4">
            <Target className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Trade Setup</h2>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Trade Direction</Label>
            <p className="text-[11px] text-muted-foreground/70 -mt-1">Long = expect price to rise; Short = expect price to fall</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setInputs(prev => ({ ...prev, tradeDirection: 'LONG' }))}
                className={`h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${inputs.tradeDirection === 'LONG' ? 'bg-[hsl(142_76%_45%)] text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                <TrendingUp className="w-4 h-4" /> BUY (Long)
              </button>
              <button onClick={() => setInputs(prev => ({ ...prev, tradeDirection: 'SHORT' }))}
                className={`h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${inputs.tradeDirection === 'SHORT' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                <TrendingDown className="w-4 h-4" /> SELL (Short)
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Stock Symbol</Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">NSE ticker name of the stock you want to trade</p>
              <Input type="text" value={inputs.symbol} onChange={handleChange("symbol")} placeholder="e.g., RELIANCE, TCS, INFY" className="uppercase" />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Entry Price (₹)</Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">Price at which you plan to enter the trade</p>
              <Input type="number" value={inputs.entryPrice} onChange={handleChange("entryPrice")} onWheel={handleWheel} placeholder="Enter entry price" step="0.05" />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Stop Loss (₹) {inputs.tradeDirection === 'LONG' ? '(Below Entry)' : '(Above Entry)'}
              </Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">Exit price to limit your loss if trade goes wrong</p>
              <Input type="number" value={inputs.stopLoss} onChange={handleChange("stopLoss")} onWheel={handleWheel} placeholder="Enter stop loss" step="0.05" />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-[hsl(142_76%_45%)]" />
                Target Price (₹) {inputs.tradeDirection === 'LONG' ? '(Above Entry)' : '(Below Entry)'}
              </Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">Exit price to book profit when trade goes your way</p>
              <Input type="number" value={inputs.targetPrice} onChange={handleChange("targetPrice")} onWheel={handleWheel} placeholder="Enter target price" step="0.05" />
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {/* Warnings */}
        {calculations.wasQuantityCapped && (
          <div className="glass rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-500">Quantity Capped</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Risk-based quantity exceeded buying power. Capped to {calculations.quantity} shares. Need {formatCurrency(calculations.requiredDeployedCapital)} deployed capital for full position.
                </p>
              </div>
            </div>
          </div>
        )}

        {calculations.exceedsBuyingPower && !calculations.wasQuantityCapped && (
          <div className="glass rounded-xl p-4 border border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Position Exceeds Buying Power</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Position value {formatCurrency(calculations.positionValue)} exceeds buying power {formatCurrency(calculations.buyingPower)}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Results Card */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Position Summary</h2>
            </div>
            {inputs.symbol && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-mono font-semibold">
                {inputs.symbol.toUpperCase()}
              </span>
            )}
          </div>

          <div className={`text-center py-3 px-4 rounded-lg ${calculations.isLong ? 'bg-[hsl(142_76%_45%_/_0.1)]' : 'bg-destructive/10'}`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {calculations.isLong ? <TrendingUp className="w-5 h-5 text-[hsl(142_76%_45%)]" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
              <span className={`text-xl font-bold ${calculations.isLong ? 'text-[hsl(142_76%_45%)]' : 'text-destructive'}`}>
                {calculations.isLong ? 'LONG' : 'SHORT'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{calculations.isCNC ? 'CNC - Delivery' : `${calculations.leverage}x Intraday`}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Quantity" value={calculations.isValid ? calculations.quantity.toLocaleString() : '—'} sub="shares to buy" />
            <ResultCard label="Position Value" value={calculations.isValid ? formatCurrency(calculations.positionValue) : '—'} sub="total trade size" />
            <ResultCard label="Margin Required" value={calculations.isValid ? formatCurrency(calculations.marginRequired) : '—'} sub={calculations.isCNC ? 'full CNC amount' : `${calculations.leverage}x leveraged`} />
            <ResultCard label="Risk Amount" value={calculations.isValid ? formatCurrency(calculations.riskAmount) : '—'} sub={`${formatNumber(calculations.capitalAtRiskPercent)}% of capital`} color="destructive" />
            <ResultCard label="Net Profit" value={calculations.isValid ? formatCurrency(calculations.netProfit) : '—'} sub="after all charges" color="success" />
            <ResultCard label="Risk : Reward" value={calculations.isValid ? `1 : ${formatNumber(calculations.riskRewardRatio)}` : '—'} sub={calculations.riskRewardRatio >= 2 ? '✓ Good setup' : calculations.riskRewardRatio >= 1 ? 'Acceptable' : 'Poor'} color={calculations.riskRewardRatio >= 2 ? 'success' : 'muted'} />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <MiniStat label="SL %" value={calculations.isValid ? `-${formatNumber(calculations.slPercent)}%` : '—'} color="destructive" />
            <MiniStat label="Target %" value={calculations.isValid ? `+${formatNumber(calculations.targetPercent)}%` : '—'} color="success" />
            <MiniStat label="Charges" value={calculations.isValid ? formatCurrency(calculations.totalCharges) : '—'} />
          </div>
        </div>

        {/* Trailing SL Card */}
        {calculations.isValid && (
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Shield className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Trailing Stop Loss Levels</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Move your SL to these levels as price moves in your favour</p>

            <div className="space-y-2">
              <TrailRow label="Entry (Cost-to-Entry)" price={calculations.trailingSLLevels.costToEntry} action="Initial SL set at stop loss" />
              <TrailRow label="1R — Move SL to Entry" price={calculations.trailingSLLevels.oneR} action={`When price hits ₹${formatNumber(calculations.trailingSLLevels.oneR, 2)}`} highlight />
              <TrailRow label="2R — Move SL to 1R" price={calculations.trailingSLLevels.twoR} action={`When price hits ₹${formatNumber(calculations.trailingSLLevels.twoR, 2)}`} highlight />
              <TrailRow label="3R — Move SL to 2R" price={calculations.trailingSLLevels.threeR} action={`When price hits ₹${formatNumber(calculations.trailingSLLevels.threeR, 2)}`} highlight />
            </div>
          </div>
        )}

        {/* Capital Info */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Capital Deployment</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Total Capital" value={formatCurrency(calculations.totalCapital)} />
            <MiniStat label="Deployed Capital" value={formatCurrency(calculations.deployedCapital)} />
            <MiniStat label="Buying Power" value={formatCurrency(calculations.buyingPower)} />
            <MiniStat label="Capital at Risk" value={`${formatNumber(calculations.capitalAtRiskPercent)}%`} color={calculations.capitalAtRiskPercent > 2 ? 'destructive' : 'muted'} />
          </div>
        </div>
      </div>
    </div>
  );
};

function ResultCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    success: 'text-[hsl(142_76%_45%)]',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
  };
  const textColor = color ? colorMap[color] : 'text-foreground';
  return (
    <div className="bg-secondary/40 rounded-lg p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold font-mono text-sm ${textColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    success: 'text-[hsl(142_76%_45%)]',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
  };
  const textColor = color ? colorMap[color] : 'text-foreground';
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono font-semibold ${textColor}`}>{value}</p>
    </div>
  );
}

function TrailRow({ label, price, action, highlight }: { label: string; price: number; action: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${highlight ? 'bg-primary/5 border border-primary/20' : 'bg-secondary/30'}`}>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{action}</p>
      </div>
      <span className={`font-mono font-semibold text-sm ${highlight ? 'text-primary' : 'text-muted-foreground'}`}>
        ₹{formatNumber(price, 2)}
      </span>
    </div>
  );
}

export default EquityCalculator;
