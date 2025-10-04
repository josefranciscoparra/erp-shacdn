"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import { THEME_MODE_OPTIONS, THEME_PRESET_OPTIONS } from "@/types/preferences/theme";
import { updateThemeMode, updateThemePreset } from "@/server/actions/preferences";
import { Moon, Sun, Palette } from "lucide-react";
import { toast } from "sonner";

export function AppearanceSettings() {
  const { themeMode, themePreset, setThemeMode, setThemePreset } = usePreferencesStore((state) => state);

  const handleThemeModeChange = async (value: string) => {
    const mode = value as "light" | "dark";
    setThemeMode(mode);
    await updateThemeMode(mode);
    toast.success("Tema actualizado");
  };

  const handleThemePresetChange = async (value: string) => {
    const preset = value as "default" | "brutalist" | "soft-pop" | "tangerine";
    setThemePreset(preset);
    await updateThemePreset(preset);
    toast.success("Preset de color actualizado");
  };

  return (
    <Card className="rounded-lg border p-6">
      <h3 className="mb-6 text-lg font-semibold">Preferencias de apariencia</h3>
      <div className="flex flex-col gap-6">
        {/* Modo de tema */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            <div>
              <h4 className="font-medium">Modo de tema</h4>
              <p className="text-muted-foreground text-sm">Selecciona el modo claro u oscuro</p>
            </div>
          </div>

          <RadioGroup value={themeMode} onValueChange={handleThemeModeChange}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {THEME_MODE_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`profile-theme-${option.value}`}
                  className="border-input hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary flex cursor-pointer items-center gap-3 rounded-lg border p-4"
                >
                  <RadioGroupItem value={option.value} id={`profile-theme-${option.value}`} />
                  <div className="flex items-center gap-2">
                    {option.value === "light" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    <span className="font-medium">{option.label}</span>
                  </div>
                </Label>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Preset de color */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <div>
              <h4 className="font-medium">Preset de color</h4>
              <p className="text-muted-foreground text-sm">Personaliza la paleta de colores de la aplicación</p>
            </div>
          </div>

          <RadioGroup value={themePreset} onValueChange={handleThemePresetChange}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {THEME_PRESET_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`profile-preset-${option.value}`}
                  className="border-input hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary flex cursor-pointer items-center gap-3 rounded-lg border p-4"
                >
                  <RadioGroupItem value={option.value} id={`profile-preset-${option.value}`} />
                  <div className="flex flex-1 items-center justify-between">
                    <span className="font-medium">{option.label}</span>
                    <div
                      className="h-6 w-6 rounded-full border"
                      style={{
                        backgroundColor: themeMode === "light" ? option.primary.light : option.primary.dark,
                      }}
                    />
                  </div>
                </Label>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>
    </Card>
  );
}
