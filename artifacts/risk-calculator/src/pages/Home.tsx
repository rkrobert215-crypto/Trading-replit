import { useLocation } from "wouter";
import { TrendingUp, Activity, Layers, BookOpen, PieChart, BarChart3, LogIn, LogOut, User } from "lucide-react";
import ThemeSelector from "@/components/ThemeSelector";
import HelpGuide from "@/components/HelpGuide";
import SettingsPanel from "@/components/SettingsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const cards = [
  {
    title: "Equity Calculator",
    description: "Position sizing & risk management for cash equity trades",
    icon: TrendingUp,
    path: "/equity",
    gradient: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-500",
    border: "hover:border-emerald-500/40",
  },
  {
    title: "Options Calculator",
    description: "Premium-based risk analysis with Greeks & lot sizing",
    icon: Activity,
    path: "/options",
    gradient: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-500",
    border: "hover:border-blue-500/40",
  },
  {
    title: "Futures Calculator",
    description: "Margin-based position sizing for F&O contracts",
    icon: Layers,
    path: "/futures",
    gradient: "from-orange-500/20 to-orange-600/5",
    iconColor: "text-orange-500",
    border: "hover:border-orange-500/40",
  },
  {
    title: "Trading Journal",
    description: "Log, review & analyse every trade you take",
    icon: BookOpen,
    path: "/journal",
    gradient: "from-purple-500/20 to-purple-600/5",
    iconColor: "text-purple-500",
    border: "hover:border-purple-500/40",
  },
  {
    title: "Performance Dashboard",
    description: "Visual analytics & P&L breakdown of your trades",
    icon: PieChart,
    path: "/dashboard",
    gradient: "from-rose-500/20 to-rose-600/5",
    iconColor: "text-rose-500",
    border: "hover:border-rose-500/40",
  },
];

const Home = () => {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <User className="w-4 h-4 text-[var(--primary)]" />
                  )}
                  <span className="text-sm text-[var(--foreground)] font-medium">{user?.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-[var(--muted-foreground)]">
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/login")} className="gap-1.5">
                <LogIn className="w-4 h-4" /> Sign In
              </Button>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <HelpGuide />
            <ThemeSelector />
            <SettingsPanel />
          </div>
        </div>

        <div className="text-center space-y-4 pb-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 glow-primary">
              <BarChart3 className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Trading Risk Calculator
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Professional position sizing & money management for Indian markets
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Real-time calculations · No data sent to server
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className={`glass rounded-xl p-6 text-left transition-all duration-200 border border-border/50 ${card.border} hover:scale-[1.02] active:scale-[0.99] group`}
              >
                <div className={`w-full h-1 rounded-full bg-gradient-to-r ${card.gradient} mb-5 opacity-60`} />
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} w-fit mb-4`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <h3 className="font-semibold text-foreground text-base mb-1.5 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground/40 pb-4">
          Indian market charges (STT, SEBI, GST, Stamp Duty) auto-calculated
        </div>
      </div>
    </div>
  );
};

export default Home;
