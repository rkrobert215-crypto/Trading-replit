import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ThemeKey = "cyan" | "emerald" | "violet" | "amber" | "rose";

interface ThemeConfig {
  label: string;
  preview: string;
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  cyan: { label: "Ocean Cyan", preview: "hsl(185 85% 50%)" },
  emerald: { label: "Forest Green", preview: "hsl(160 84% 39%)" },
  violet: { label: "Neon Purple", preview: "hsl(270 76% 58%)" },
  amber: { label: "Golden Amber", preview: "hsl(38 92% 50%)" },
  rose: { label: "Cherry Rose", preview: "hsl(346 77% 50%)" },
};

export const getTheme = (): ThemeKey => {
  return (localStorage.getItem("appTheme") as ThemeKey) || "rose";
};

export const applyTheme = (theme: ThemeKey) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("appTheme", theme);
};

const ThemeSelector = () => {
  const [current, setCurrent] = useState<ThemeKey>(getTheme);

  useEffect(() => {
    applyTheme(current);
  }, [current]);

  useEffect(() => {
    applyTheme(getTheme());
  }, []);

  const select = (key: ThemeKey) => {
    setCurrent(key);
    applyTheme(key);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Palette className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {(Object.entries(THEMES) as [ThemeKey, ThemeConfig][]).map(([key, cfg]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => select(key)}
            className={`flex items-center gap-2 cursor-pointer ${current === key ? "bg-accent/20 font-semibold" : ""}`}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 border border-border"
              style={{ background: cfg.preview }}
            />
            {cfg.label}
            {current === key && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSelector;
