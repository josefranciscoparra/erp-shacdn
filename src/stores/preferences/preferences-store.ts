import { createStore } from "zustand/vanilla";

import type { Locale } from "@/lib/i18n";
import type { ThemeMode, ThemePreset, ThemeRadius, ThemeContentLayout } from "@/types/preferences/theme";

export type PreferencesState = {
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  themeRadius: ThemeRadius;
  themeContentLayout: ThemeContentLayout;
  locale: Locale;
  setThemeMode: (mode: ThemeMode) => void;
  setThemePreset: (preset: ThemePreset) => void;
  setThemeRadius: (radius: ThemeRadius) => void;
  setThemeContentLayout: (layout: ThemeContentLayout) => void;
  setLocale: (locale: Locale) => void;
};

export const createPreferencesStore = (init?: Partial<PreferencesState>) =>
  createStore<PreferencesState>()((set) => ({
    themeMode: init?.themeMode ?? "light",
    themePreset: init?.themePreset ?? "lavender-dream",
    themeRadius: init?.themeRadius ?? "xl",
    themeContentLayout: init?.themeContentLayout ?? "centered",
    locale: init?.locale ?? "es",
    setThemeMode: (mode) => set({ themeMode: mode }),
    setThemePreset: (preset) => set({ themePreset: preset }),
    setThemeRadius: (radius) => set({ themeRadius: radius }),
    setThemeContentLayout: (layout) => set({ themeContentLayout: layout }),
    setLocale: (locale) => set({ locale: locale }),
  }));
