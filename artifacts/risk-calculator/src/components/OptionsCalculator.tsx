import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, TrendingDown, Target, AlertTriangle, 
  IndianRupee, Activity, Clock, Zap, Percent
} from "lucide-react";
import { calculateGreeks, LOT_SIZES, IndexType } from "@/lib/optionsCalculator";
import { getSettings, AppSettings } from "@/components/SettingsPanel";
import { calculateCharges } from "@/lib/charges";
import { formatCurrency, formatNumber } from "@/lib/formatters";

interface OptionsInputs {
  instrumentType: 'INDEX' | 'STOCK';
  index: IndexType;
  stockSymbol: string;
  stockLotSize: string;
  optionType: 'CE' | 'PE';
  spotPrice: string;
  strikePrice: string;
  premium: string;
  daysToExpiry: string;
  volatility: string;
  riskFreeRate: string;
  capital: string;
  riskPercent: string;
  riskAmount: string;
  riskType: 'percent' | 'fixed';
  targetPremium: string;
  stopLossPremium: string;
}

const OptionsCalculator = () => {
  const { toast } = useToast();
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings);

  useEffect(() => {
    const handleSettingsChange = (e: CustomEvent<AppSettings>) => {
      setAppSettings(e.detail);
    };
    window.addEventListener("settingsChanged", handleSettingsChange as EventListener);
    return () => window.removeEventListener("settingsChanged", handleSettingsChange as EventListener);
  }, []);

  const [inputs, setInputs] = useState<OptionsInputs>({
    instrumentType: 'STOCK',
    index: 'NIFTY',
    stockSymbol: "",
    stockLotSize: "",
    optionType: 'CE',
    spotPrice: "",
    strikePrice: "",
    premium: "",
    daysToExpiry: "",
    volatility: "15",
    riskFreeRate: "6.5",
    capital: "100000",
    riskPercent: "2",
    riskAmount: "2000",
    riskType: 'percent',
    targetPremium: "",
    stopLossPremium: "",
  });

  const lotSize = inputs.instrumentType === 'STOCK'
    ? (parseInt(inputs.stockLotSize) || 1)
    : LOT_SIZES[inputs.index];

  const greeks = useMemo(() => {
    const spot = parseFloat(inputs.spotPrice) || 0;
    const strike = parseFloat(inputs.strikePrice) || 0;
    const days = parseFloat(inputs.daysToExpiry) || 0;
    const vol = parseFloat(inputs.volatility) || 15;
    const rate = parseFloat(inputs.riskFreeRate) || 6.5;

    if (spot > 0 && strike > 0 && days > 0) {
      return calculateGreeks({
        spotPrice: spot,
        strikePrice: strike,
        daysToExpiry: days,
        volatility: vol,
        riskFreeRate: rate,
        optionType: inputs.optionType,
      });
    }
    return null;
  }, [inputs.spotPrice, inputs.strikePrice, inputs.daysToExpiry, inputs.volatility, inputs.riskFreeRate, inputs.optionType]);

  const positionCalc = useMemo(() => {
    const capital = parseFloat(inputs.capital) || 0;
    const riskPercent = parseFloat(inputs.riskPercent) || 0;
    const fixedRisk = parseFloat(inputs.riskAmount) || 0;
    const entryPremium = parseFloat(inputs.premium) || (greeks?.premium || 0);
    const targetPremium = parseFloat(inputs.targetPremium) || 0;
    const slPremium = parseFloat(inputs.stopLossPremium) || 0;

    const costPerLot = entryPremium * lotSize;
    const maxAffordableLots = costPerLot > 0 ? Math.floor(capital / costPerLot) : 0;
    const maxAffordableQty = maxAffordableLots * lotSize;
    const maxPositionValue = maxAffordableQty * entryPremium;

    const riskAmount = inputs.riskType === 'percent'
      ? (capital * riskPercent) / 100
      : fixedRisk;

    const riskPerLot = slPremium > 0 ? (entryPremium - slPremium) * lotSize : 0;
    let riskBasedLots = riskPerLot > 0 ? Math.floor(riskAmount / riskPerLot) : 0;

    let wasLotsCapped = false;
    if (riskBasedLots > maxAffordableLots && maxAffordableLots > 0) {
      riskBasedLots = maxAffordableLots;
      wasLotsCapped = true;
    }

    const uncappedLots = riskPerLot > 0 ? Math.floor(riskAmount / riskPerLot) : 0;
    const requiredCapital = uncappedLots * costPerLot;

    const quantity = riskBasedLots * lotSize;
    const positionValue = quantity * entryPremium;

    const rewardPerLot = targetPremium > 0 ? (targetPremium - entryPremium) * lotSize : 0;
    const potentialProfit = riskBasedLots * rewardPerLot;
    const riskRewardRatio = riskPerLot > 0 ? rewardPerLot / riskPerLot : 0;

    const actualRisk = riskBasedLots * riskPerLot;

    const charges = calculateCharges(positionValue, 'options');
    const totalCharges = charges.total;

    const maxAffordableRisk = slPremium > 0 ? maxAffordableLots * (entryPremium - slPremium) * lotSize : 0;
    const maxAffordableProfit = targetPremium > 0 ? maxAffordableLots * (targetPremium - entryPremium) * lotSize : 0;
    const maxAffordableCharges = calculateCharges(maxPositionValue, 'options').total;

    return {
      lots: riskBasedLots,
      quantity,
      positionValue,
      potentialProfit: potentialProfit - totalCharges,
      riskRewardRatio,
      actualRisk: actualRisk + totalCharges,
      totalCharges,
      entryPremium,
      maxAffordableLots,
      maxAffordableQty,
      maxPositionValue,
      costPerLot,
      wasLotsCapped,
      requiredCapital,
      maxAffordableRisk: maxAffordableRisk + maxAffordableCharges,
      maxAffordableProfit: maxAffordableProfit - maxAffordableCharges,
    };
  }, [inputs.capital, inputs.riskPercent, inputs.riskAmount, inputs.riskType, inputs.premium, inputs.targetPremium, inputs.stopLossPremium, greeks, lotSize]);

  const oneLotSummary = useMemo(() => {
    const entryPremium = parseFloat(inputs.premium) || (greeks?.premium || 0);
    const targetPremium = parseFloat(inputs.targetPremium) || 0;
    const slPremium = parseFloat(inputs.stopLossPremium) || 0;

    const oneLotQty = lotSize;
    const oneLotCost = entryPremium * oneLotQty;
    const oneLotRisk = slPremium > 0 ? (entryPremium - slPremium) * oneLotQty : 0;
    const oneLotReward = targetPremium > 0 ? (targetPremium - entryPremium) * oneLotQty : 0;
    const oneLotRR = oneLotRisk > 0 ? oneLotReward / oneLotRisk : 0;

    const oneLotChargesResult = calculateCharges(oneLotCost, 'options');
    const oneLotCharges = oneLotChargesResult.total;

    return {
      quantity: oneLotQty,
      cost: oneLotCost,
      risk: oneLotRisk + oneLotCharges,
      reward: oneLotReward - oneLotCharges,
      riskReward: oneLotRR,
      charges: oneLotCharges,
    };
  }, [inputs.premium, inputs.targetPremium, inputs.stopLossPremium, greeks, lotSize]);

  const handleChange = (field: keyof OptionsInputs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setInputs(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Option Setup */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Activity className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Option Setup</h2>
            </div>

            <div className="space-y-2 mb-4">
              <Label className="text-muted-foreground">Instrument Type</Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">Stock options = individual shares; Index = NIFTY, BANKNIFTY etc.</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setInputs(prev => ({ ...prev, instrumentType: 'STOCK' }))}
                  className={`h-12 rounded-lg font-semibold transition-all ${inputs.instrumentType === 'STOCK' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                  Stock Options
                </button>
                <button onClick={() => setInputs(prev => ({ ...prev, instrumentType: 'INDEX' }))}
                  className={`h-12 rounded-lg font-semibold transition-all ${inputs.instrumentType === 'INDEX' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                  Index Options
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {inputs.instrumentType === 'STOCK' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Stock Symbol</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">NSE ticker of the stock</p>
                    <Input type="text" value={inputs.stockSymbol} onChange={handleChange("stockSymbol")} placeholder="e.g., RELIANCE" className="uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Lot Size</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Number of shares per lot contract</p>
                    <Input type="number" value={inputs.stockLotSize} onChange={handleChange("stockLotSize")} placeholder="e.g., 250" />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Index</Label>
                  <p className="text-[11px] text-muted-foreground/70 -mt-1">Select index with pre-set lot size</p>
                  <select value={inputs.index} onChange={handleChange("index") as React.ChangeEventHandler<HTMLSelectElement>}
                    className="flex h-12 w-full rounded-lg border border-border bg-input px-4 py-2 text-base font-mono focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="NIFTY">NIFTY (Lot: 25)</option>
                    <option value="BANKNIFTY">BANKNIFTY (Lot: 15)</option>
                    <option value="FINNIFTY">FINNIFTY (Lot: 25)</option>
                    <option value="MIDCPNIFTY">MIDCPNIFTY (Lot: 50)</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Option Type</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Call (CE) = bullish bet; Put (PE) = bearish bet</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setInputs(prev => ({ ...prev, optionType: 'CE' }))}
                    className={`h-12 rounded-lg font-semibold transition-all ${inputs.optionType === 'CE' ? 'bg-[hsl(142_76%_45%)] text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                    CALL (CE)
                  </button>
                  <button onClick={() => setInputs(prev => ({ ...prev, optionType: 'PE' }))}
                    className={`h-12 rounded-lg font-semibold transition-all ${inputs.optionType === 'PE' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                    PUT (PE)
                  </button>
                </div>
              </div>
            </div>

            {inputs.instrumentType === 'INDEX' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Spot Price (₹)</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Current market price of the index</p>
                    <Input type="number" value={inputs.spotPrice} onChange={handleChange("spotPrice")} placeholder="e.g., 24500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Strike Price (₹)</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Price level of the option contract</p>
                    <Input type="number" value={inputs.strikePrice} onChange={handleChange("strikePrice")} placeholder="e.g., 24500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />Days to Expiry</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Trading days left until contract expires</p>
                    <Input type="number" value={inputs.daysToExpiry} onChange={handleChange("daysToExpiry")} placeholder="e.g., 7" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">IV (Volatility %)</Label>
                    <p className="text-[11px] text-muted-foreground/70 -mt-1">Implied Volatility — market's expected swing</p>
                    <Input type="number" value={inputs.volatility} onChange={handleChange("volatility")} placeholder="15" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Position Sizing */}
          <div className="glass rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Target className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Position Sizing</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2"><IndianRupee className="w-4 h-4" />Capital</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Your total trading account balance</p>
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
                <Label className="text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" />Risk %</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Max % of capital to risk (recommended: 1-2%)</p>
                <Input type="number" value={inputs.riskPercent} onChange={handleChange("riskPercent")} placeholder="2" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2"><IndianRupee className="w-4 h-4" />Risk Amount (₹)</Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Max rupees willing to lose on this trade</p>
                <Input type="number" value={inputs.riskAmount} onChange={handleChange("riskAmount")} placeholder="2000" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Entry Premium (₹){inputs.instrumentType === 'INDEX' && greeks ? ' - Leave blank to use calculated' : ''}
              </Label>
              <p className="text-[11px] text-muted-foreground/70 -mt-1">Price you pay per unit to buy the option</p>
              <Input type="number" value={inputs.premium} onChange={handleChange("premium")} placeholder={inputs.instrumentType === 'INDEX' && greeks ? formatNumber(greeks.premium) : "e.g., 150"} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />Stop Loss Premium (₹)
                </Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Exit if premium drops to this level</p>
                <Input type="number" value={inputs.stopLossPremium} onChange={handleChange("stopLossPremium")} placeholder="e.g., 80" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[hsl(142_76%_45%)]" />Target Premium (₹)
                </Label>
                <p className="text-[11px] text-muted-foreground/70 -mt-1">Exit to book profit at this premium</p>
                <Input type="number" value={inputs.targetPremium} onChange={handleChange("targetPremium")} placeholder="e.g., 200" />
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Greeks Card - Only for Index Options */}
          {inputs.instrumentType === 'INDEX' && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg text-foreground">Option Greeks</h2>
                {greeks && (
                  <span className="text-2xl font-bold text-primary font-mono">
                    ₹{formatNumber(greeks.premium)}
                  </span>
                )}
              </div>

              {greeks ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-primary" />
                      <p className="text-muted-foreground text-sm">Delta (Δ)</p>
                    </div>
                    <p className={`text-2xl font-bold font-mono ${greeks.delta > 0 ? 'text-[hsl(142_76%_45%)]' : 'text-destructive'}`}>
                      {formatNumber(greeks.delta, 4)}
                    </p>
                    <p className="text-muted-foreground text-xs">per ₹1 spot move</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-muted-foreground text-sm mb-1">Gamma (Γ)</p>
                    <p className="text-2xl font-bold text-foreground font-mono">{formatNumber(greeks.gamma, 6)}</p>
                    <p className="text-muted-foreground text-xs">delta sensitivity</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-[hsl(45_93%_47%)]" />
                      <p className="text-muted-foreground text-sm">Theta (Θ)</p>
                    </div>
                    <p className="text-2xl font-bold text-[hsl(45_93%_47%)] font-mono">{formatNumber(greeks.theta, 2)}</p>
                    <p className="text-muted-foreground text-xs">₹ decay/day</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-muted-foreground text-sm mb-1">Vega (ν)</p>
                    <p className="text-2xl font-bold text-foreground font-mono">{formatNumber(greeks.vega, 2)}</p>
                    <p className="text-muted-foreground text-xs">per 1% IV change</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-muted-foreground text-sm mb-1">Intrinsic Value</p>
                    <p className="text-xl font-bold text-foreground font-mono">₹{formatNumber(greeks.intrinsicValue)}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-muted-foreground text-sm mb-1">Time Value</p>
                    <p className="text-xl font-bold text-foreground font-mono">₹{formatNumber(greeks.timeValue)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Enter spot price, strike price, and days to expiry to calculate Greeks
                </div>
              )}
            </div>
          )}

          {/* Risk-Based Position Size */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg text-foreground mb-4">Risk-Based Position Size</h2>
            <p className="text-muted-foreground text-sm mb-4">Lots based on your risk % and stop loss</p>

            {positionCalc.wasLotsCapped && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-4">
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-500">
                    Lots capped to fit capital. Need {formatCurrency(positionCalc.requiredCapital)} capital for full risk.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-xs border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => setInputs(prev => ({ ...prev, capital: String(positionCalc.requiredCapital) }))}>
                    Auto-adjust to {formatCurrency(positionCalc.requiredCapital)}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Lots</p>
                <p className="text-3xl font-bold text-foreground font-mono">{positionCalc.lots}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Quantity</p>
                <p className="text-3xl font-bold text-foreground font-mono">{positionCalc.quantity}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Value</p>
                <p className="text-xl font-bold text-foreground font-mono">{formatCurrency(positionCalc.positionValue)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-muted-foreground text-sm">Max Loss</p>
                </div>
                <p className="text-xl font-bold text-destructive font-mono">{formatCurrency(positionCalc.actualRisk)}</p>
              </div>
              <div className="bg-[hsl(142_76%_45%_/_0.1)] border border-[hsl(142_76%_45%_/_0.3)] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[hsl(142_76%_45%)]" />
                  <p className="text-muted-foreground text-sm">Potential Profit</p>
                </div>
                <p className="text-xl font-bold text-[hsl(142_76%_45%)] font-mono">{formatCurrency(positionCalc.potentialProfit)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 py-2">
              <span className="text-muted-foreground">Risk : Reward</span>
              <span className={`text-xl font-bold font-mono ${positionCalc.riskRewardRatio >= 2 ? 'text-[hsl(142_76%_45%)]' : positionCalc.riskRewardRatio >= 1 ? 'text-[hsl(45_93%_47%)]' : 'text-destructive'}`}>
                1 : {formatNumber(positionCalc.riskRewardRatio)}
              </span>
            </div>
          </div>

          {/* One Lot Summary - Stock Options Only */}
          {inputs.instrumentType === 'STOCK' && (
            <div className="glass rounded-xl p-6">
              <h2 className="font-semibold text-lg text-foreground mb-4">One Lot Summary</h2>
              <p className="text-muted-foreground text-sm mb-4">Trade metrics for a single lot ({lotSize} qty)</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                  <p className="text-muted-foreground text-sm mb-1">Cost (1 Lot)</p>
                  <p className="text-2xl font-bold text-foreground font-mono">{formatCurrency(oneLotSummary.cost)}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                  <p className="text-muted-foreground text-sm mb-1">Charges</p>
                  <p className="text-2xl font-bold text-foreground font-mono">₹{formatNumber(oneLotSummary.charges, 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <p className="text-muted-foreground text-sm mb-1">Max Loss (1 Lot)</p>
                  <p className="text-xl font-bold text-destructive font-mono">{formatCurrency(oneLotSummary.risk)}</p>
                </div>
                <div className="bg-[hsl(142_76%_45%_/_0.1)] border border-[hsl(142_76%_45%_/_0.3)] rounded-lg p-4">
                  <p className="text-muted-foreground text-sm mb-1">Profit (1 Lot)</p>
                  <p className="text-xl font-bold text-[hsl(142_76%_45%)] font-mono">{formatCurrency(oneLotSummary.reward)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Max Affordable Lots */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg text-foreground mb-4">Maximum Affordable (Capital Based)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Max Lots</p>
                <p className="text-3xl font-bold text-primary font-mono">{positionCalc.maxAffordableLots}</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Quantity</p>
                <p className="text-3xl font-bold text-primary font-mono">{positionCalc.maxAffordableQty}</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm mb-1">Cost/Lot</p>
                <p className="text-xl font-bold text-primary font-mono">{formatCurrency(positionCalc.costPerLot)}</p>
              </div>
            </div>
            <div className="mt-4 bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-sm">Total Investment Required</p>
              <p className="text-2xl font-bold text-foreground font-mono">{formatCurrency(positionCalc.maxPositionValue)}</p>
            </div>
          </div>

          {/* Charges */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg text-foreground mb-2">Estimated Charges</h2>
            <div className="flex justify-between font-medium">
              <span className="text-foreground">Total (Brokerage + Taxes)</span>
              <span className="text-primary font-mono">₹{formatNumber(positionCalc.totalCharges, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsCalculator;
