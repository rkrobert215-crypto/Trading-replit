import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpCircle, TrendingUp, Activity, Layers, BookOpen, BarChart3 } from "lucide-react";

const sections = [
  {
    icon: <TrendingUp className="w-5 h-5 text-primary" />,
    title: "Equity Calculator",
    content: [
      { q: "Capital", a: "Your total trading account balance. The calculator uses this to size positions correctly." },
      { q: "Leverage", a: "Intraday leverage multiplier (e.g., 5x means ₹1L capital gives ₹5L buying power). Equity intraday typically has 5-10x." },
      { q: "Risk %", a: "Maximum % of capital you are willing to lose on a single trade. Professional traders risk 1-2% max." },
      { q: "Entry Price", a: "The price at which you plan to buy (LONG) or sell short (SHORT)." },
      { q: "Stop Loss", a: "The price at which you will exit to cut losses. Place at a technical level (below support for LONG, above resistance for SHORT)." },
      { q: "Target", a: "Profit exit level. Aim for at least 2:1 reward-to-risk ratio." },
      { q: "Position Size", a: "Calculated as Risk Amount ÷ Risk Per Share. This is how many shares to buy." },
    ],
  },
  {
    icon: <Activity className="w-5 h-5 text-primary" />,
    title: "Options Calculator",
    content: [
      { q: "Stock vs Index Options", a: "Stock options are on individual company shares. Index options (NIFTY, BANKNIFTY) are settled in cash — no delivery." },
      { q: "CE / PE", a: "CE (Call) = right to buy = bullish bet. PE (Put) = right to sell = bearish bet." },
      { q: "Premium", a: "The price you pay per unit to buy an option. Your maximum loss is limited to this premium × lot size." },
      { q: "Lot Size", a: "The minimum quantity per options contract. NIFTY = 25, BANKNIFTY = 15. You must trade in whole lots." },
      { q: "Greeks (Delta, Theta, Vega)", a: "Delta: how much premium moves per ₹1 spot change. Theta: daily time decay in ₹. Vega: sensitivity to volatility. These appear only for Index options where we calculate them from inputs." },
      { q: "Stop Loss / Target Premium", a: "The premium level at which you exit the option, NOT the underlying stock price. Set a premium SL before entering." },
      { q: "IV (Implied Volatility)", a: "Market's expectation of future price swings. High IV = expensive options. India VIX tracks NIFTY options IV." },
    ],
  },
  {
    icon: <Layers className="w-5 h-5 text-primary" />,
    title: "Futures Calculator",
    content: [
      { q: "Futures vs Options", a: "Futures have unlimited profit AND loss. Options buyers have limited loss (premium paid). Futures require SPAN margin, not full contract value." },
      { q: "Margin %", a: "SPAN + Exposure margin required to hold one futures contract. Typically 8-15% of contract value. Check your broker's margin calculator." },
      { q: "Contract Price", a: "Current futures price (slightly different from spot due to cost of carry). Use live NSE futures price." },
      { q: "Lot Size", a: "Pre-filled for indices. For stock futures, enter the lot size from NSE contract specifications." },
      { q: "Margin Utilization", a: "What % of your capital is locked as margin. Keep below 50-60% to have capital for MTM losses and other trades." },
    ],
  },
  {
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    title: "Trading Journal",
    content: [
      { q: "Why journal trades?", a: "Journaling reveals patterns in your performance — which setups work, which instruments suit you, and common mistakes." },
      { q: "P&L Calculation", a: "Gross P&L = (Exit - Entry) × Qty for LONG; (Entry - Exit) × Qty for SHORT. Net P&L = Gross P&L - Charges." },
      { q: "Close a trade", a: "Click the checkmark ✓ icon on an OPEN trade and enter the exit price. The app calculates final P&L automatically." },
      { q: "Charges", a: "Enter the actual brokerage + taxes charged by your broker. Or leave 0 and use our estimated charges from the calculators." },
      { q: "Risk:Reward (R:R)", a: "Calculated from stop loss and target vs entry. An R:R of 1:2 means you risk ₹1 to make ₹2." },
      { q: "CSV Export", a: "Download your full trade history as CSV for custom analysis in Excel or Google Sheets." },
    ],
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-primary" />,
    title: "Performance Dashboard",
    content: [
      { q: "Win Rate", a: "% of closed trades that were profitable. Aim for >50%, but even 40% with 2:1 R:R is profitable." },
      { q: "Profit Factor", a: "Total gross wins ÷ Total gross losses. Ratio above 1.5 is good; above 2 is excellent." },
      { q: "Expectancy", a: "(Avg Win × Win Rate) - (Avg Loss × Loss Rate). Positive expectancy means profitable strategy over time." },
      { q: "Cumulative P&L Chart", a: "Shows the equity curve of your account. Smooth upward slope with shallow drawdowns = good system." },
      { q: "Weekly Win Rate", a: "Tracks win rate trend over time. Declining trend may indicate a change in market conditions." },
    ],
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-primary" />,
    title: "Indian Market Charges",
    content: [
      { q: "STT (Securities Transaction Tax)", a: "Equity delivery: 0.1% both sides. Equity intraday: 0.025% sell side only. Options: 0.0625% on sell side (premium). Futures: 0.0125% sell side." },
      { q: "SEBI Charges", a: "₹10 per crore of turnover (both sides). Very small but included in calculation." },
      { q: "GST", a: "18% on (brokerage + transaction charges + SEBI charges). Applied on service charges only, not on STT." },
      { q: "Stamp Duty", a: "Varies by state but standardized: 0.015% on buy side for delivery; 0.003% for intraday; 0.002% for F&O." },
      { q: "Exchange Transaction Charges", a: "NSE: ~0.00297% for equity. Futures: ~0.00173%. Options: ~0.053% on premium turnover." },
    ],
  },
];

const HelpGuide = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="h-8 w-8 sm:h-9 sm:w-9" title="Help Guide">
        <HelpCircle className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Help Guide</DialogTitle>
            <DialogDescription>Understanding the calculator fields and trading concepts</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-2">
              {sections.map((section) => (
                <div key={section.title} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    {section.icon}
                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                  </div>
                  <div className="space-y-3 pl-2">
                    {section.content.map((item) => (
                      <div key={item.q} className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{item.q}</p>
                        <p className="text-sm text-muted-foreground">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpGuide;
