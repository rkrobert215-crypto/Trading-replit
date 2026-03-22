import { useState, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { BarChart3, TrendingUp, Activity, BookOpen, Loader2, Layers, PieChart, Home } from "lucide-react";
import EquityCalculator from "@/components/EquityCalculator";
import OptionsCalculator from "@/components/OptionsCalculator";
import FuturesCalculator from "@/components/FuturesCalculator";
const TradingJournal = lazy(() => import("@/components/TradingJournal").then(m => ({ default: m.TradingJournal })));
const PerformanceDashboard = lazy(() => import("@/components/PerformanceDashboard"));
import SettingsPanel from "@/components/SettingsPanel";
import HelpGuide from "@/components/HelpGuide";
import ThemeSelector from "@/components/ThemeSelector";
import { Button } from "@/components/ui/button";

type TabType = 'equity' | 'options' | 'futures' | 'journal' | 'dashboard';

interface RiskCalculatorProps {
  initialTab?: TabType;
}

const RiskCalculator = ({ initialTab = 'equity' }: RiskCalculatorProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2 mb-8 relative">
          <div className="absolute left-0 top-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 sm:gap-2" title="Back to Home">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Home</span>
            </Button>
          </div>
          <div className="absolute right-0 top-0 flex items-center gap-0.5 sm:gap-1">
            <HelpGuide />
            <ThemeSelector />
            <SettingsPanel />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 glow-primary">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Intraday Risk Calculator
          </h1>
          <p className="text-muted-foreground text-lg">
            Position sizing & money management for Indian markets
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center overflow-x-auto pb-2">
          <div className="inline-flex bg-secondary/50 rounded-xl p-1.5 gap-1 min-w-max">
            <button
              onClick={() => setActiveTab('equity')}
              className={`flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap ${
                activeTab === 'equity'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Equity</span>
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap ${
                activeTab === 'options'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Options</span>
            </button>
            <button
              onClick={() => setActiveTab('futures')}
              className={`flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap ${
                activeTab === 'futures'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Futures</span>
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap ${
                activeTab === 'journal'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Journal</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'equity' && <EquityCalculator />}
          {activeTab === 'options' && <OptionsCalculator />}
          {activeTab === 'futures' && <FuturesCalculator />}
          {(activeTab === 'journal' || activeTab === 'dashboard') && (
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              {activeTab === 'journal' && <TradingJournal />}
              {activeTab === 'dashboard' && <PerformanceDashboard />}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskCalculator;
