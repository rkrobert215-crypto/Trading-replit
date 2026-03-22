import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-3xl font-bold text-foreground">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    </div>
  );
}
