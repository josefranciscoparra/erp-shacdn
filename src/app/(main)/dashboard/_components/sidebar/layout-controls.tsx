"use client";

import { Settings, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Locale } from "@/lib/i18n";
import { updateThemeMode, updateThemePreset } from "@/lib/theme-utils";
import { useLocale } from "@/providers/locale-provider";
import { setValueToCookie } from "@/server/server-actions";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import { THEME_PRESET_OPTIONS, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

export function LayoutControls() {
  const t = useTranslations("settings");
  const { locale, setLocale } = useLocale();

  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);

  const handleValueChange = async (key: string, value: any) => {
    if (key === "theme_mode") {
      updateThemeMode(value);
      setThemeMode(value as ThemeMode);
    }

    if (key === "theme_preset") {
      updateThemePreset(value);
      setThemePreset(value as ThemePreset);
    }

    await setValueToCookie(key, value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon">
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <h4 className="text-sm leading-none font-medium">{t("layoutSettings")}</h4>
            <p className="text-muted-foreground text-xs">{t("customizeLayout")}</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                <Globe className="mr-1 inline size-3" />
                {t("language")}
              </Label>
              <Select value={locale} onValueChange={(value: Locale) => setLocale(value)}>
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue placeholder={t("selectLanguage")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="text-xs" value="es">
                    {t("spanish")}
                  </SelectItem>
                  <SelectItem className="text-xs" value="en">
                    {t("english")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("themePreset")}</Label>
              <Select value={themePreset} onValueChange={(value) => handleValueChange("theme_preset", value)}>
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue placeholder={t("selectPreset")} />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESET_OPTIONS.map((preset) => (
                    <SelectItem key={preset.value} className="text-xs" value={preset.value}>
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor: themeMode === "dark" ? preset.primary.dark : preset.primary.light,
                        }}
                      />
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("theme")}</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={themeMode}
                onValueChange={(value) => handleValueChange("theme_mode", value)}
              >
                <ToggleGroupItem className="text-xs" value="light" aria-label="Toggle light">
                  {t("lightMode")}
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="dark" aria-label="Toggle dark">
                  {t("darkMode")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
