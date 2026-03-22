import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export interface AppSettings {
  spreadsheetId: string;
  telegramEnabled: boolean;
  autoSaveEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  spreadsheetId: "",
  telegramEnabled: false,
  autoSaveEnabled: false,
};

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem("appSettings");
  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem("appSettings", JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("settingsChanged", { detail: settings }));
};

const SettingsPanel = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(getSettings);

  useEffect(() => {
    setSettings(getSettings());
  }, [open]);

  const handleSave = () => {
    saveSettings(settings);
    toast({ title: "Settings Saved", description: "Your preferences have been updated." });
    setOpen(false);
  };

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            App Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-3 p-4 rounded-lg bg-muted/40 border border-border/50">
            <p className="text-sm text-muted-foreground">
              Settings are stored locally in your browser. All calculations happen client-side — no data is sent to any server.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="spreadsheetId" className="text-muted-foreground">
              Google Sheet ID (optional)
            </Label>
            <Input
              id="spreadsheetId"
              type="text"
              value={settings.spreadsheetId}
              onChange={(e) => handleChange("spreadsheetId", e.target.value)}
              placeholder="Enter your Google Sheet ID"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Find in your Sheet URL: docs.google.com/spreadsheets/d/<span className="text-primary font-medium">SHEET_ID</span>/edit
            </p>
          </div>
          <Button onClick={handleSave} className="w-full gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsPanel;
