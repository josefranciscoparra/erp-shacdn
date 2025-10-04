"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import { THEME_MODE_OPTIONS, THEME_PRESET_OPTIONS } from "@/types/preferences/theme";
import { updateThemeMode, updateThemePreset } from "@/server/actions/preferences";
import { Moon, Sun, Palette } from "lucide-react";
// import { useLocale } from "next-intl";
// import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AppearanceTab() {
  const { themeMode, themePreset, setThemeMode, setThemePreset } = usePreferencesStore((state) => state);
  // const locale = useLocale();
  // const router = useRouter();

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

  // TODO: Descomentar cuando las traducciones estén completas
  // const handleLocaleChange = async (value: string) => {
  //   await updateLocale(value as "en" | "es");
  //   toast.success("Idioma actualizado");
  //   router.refresh();
  // };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Modo de tema */}
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Modo de tema</h3>
              <p className="text-muted-foreground text-sm">Selecciona el modo claro u oscuro</p>
            </div>
          </div>

          <RadioGroup value={themeMode} onValueChange={handleThemeModeChange}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {THEME_MODE_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`theme-${option.value}`}
                  className="border-input hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary flex cursor-pointer items-center gap-3 rounded-lg border p-4"
                >
                  <RadioGroupItem value={option.value} id={`theme-${option.value}`} />
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
      </Card>

      {/* Preset de color */}
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Preset de color</h3>
              <p className="text-muted-foreground text-sm">Personaliza la paleta de colores de la aplicación</p>
            </div>
          </div>

          <RadioGroup value={themePreset} onValueChange={handleThemePresetChange}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {THEME_PRESET_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`preset-${option.value}`}
                  className="border-input hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary flex cursor-pointer items-center gap-3 rounded-lg border p-4"
                >
                  <RadioGroupItem value={option.value} id={`preset-${option.value}`} />
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
      </Card>

      {/* TODO: Descomentar cuando las traducciones estén completas */}
      {/* Idioma */}
      {/* <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Idioma</h3>
              <p className="text-muted-foreground text-sm">Selecciona el idioma de la interfaz</p>
            </div>
          </div>

          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card> */}
    </div>
  );
}
