import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { applyTheme, getTheme } from "@/components/ThemeSelector";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import Index from "@/pages/Index";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

applyTheme(getTheme());

type TabType = 'equity' | 'options' | 'futures' | 'journal' | 'dashboard';

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={AuthPage} />
      <Route path="/equity" component={() => <Index initialTab="equity" />} />
      <Route path="/options" component={() => <Index initialTab="options" />} />
      <Route path="/futures" component={() => <Index initialTab="futures" />} />
      <Route path="/journal" component={() => <Index initialTab="journal" />} />
      <Route path="/dashboard" component={() => <Index initialTab="dashboard" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ErrorBoundary>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRouter />
            </WouterRouter>
            <Toaster />
            <Sonner />
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
