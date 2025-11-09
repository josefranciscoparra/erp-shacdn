export const THEME_MODE_OPTIONS = [
  {
    label: "Light",
    value: "light",
  },
  {
    label: "Dark",
    value: "dark",
  },
] as const;

export const THEME_MODE_VALUES = THEME_MODE_OPTIONS.map((m) => m.value);

export type ThemeMode = (typeof THEME_MODE_VALUES)[number];

// --- THEME PRESETS: 4 temas (3 ERP + 1 UIKit) ---

export const THEME_PRESET_OPTIONS = [
  // TEMA PRINCIPAL (por defecto)
  {
    label: "Lavender Dream",
    value: "lavender-dream",
    primary: {
      light: "oklch(0.5709 0.1808 306.89)",
      dark: "oklch(0.5709 0.1808 306.89)",
    },
  },
  // TEMAS ALTERNATIVOS
  {
    label: "Ocean Dream",
    value: "ocean-dream",
    primary: {
      light: "oklch(0.6723 0.1606 244.9955)",
      dark: "oklch(0.7 0.16 245.011)",
    },
  },
  {
    label: "Midnight Violet",
    value: "brut-notion",
    primary: {
      light: "oklch(0.72 0.12 240)",
      dark: "oklch(0.78 0.12 240)",
    },
  },
  {
    label: "Twilight Blue",
    value: "soft-pop",
    primary: {
      light: "#4459c4",
      dark: "#8b97e8",
    },
  },
] as const;

export const THEME_PRESET_VALUES = THEME_PRESET_OPTIONS.map((p) => p.value);

export type ThemePreset = (typeof THEME_PRESET_OPTIONS)[number]["value"];

// --- RADIUS OPTIONS ---

export const THEME_RADIUS_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
  { label: "Extra Large", value: "xl" },
] as const;

export const THEME_RADIUS_VALUES = THEME_RADIUS_OPTIONS.map((r) => r.value);

export type ThemeRadius = (typeof THEME_RADIUS_VALUES)[number];

// --- CONTENT LAYOUT OPTIONS ---

export const THEME_CONTENT_LAYOUT_OPTIONS = [
  { label: "Full Width", value: "full" },
  { label: "Centered", value: "centered" },
] as const;

export const THEME_CONTENT_LAYOUT_VALUES = THEME_CONTENT_LAYOUT_OPTIONS.map((l) => l.value);

export type ThemeContentLayout = (typeof THEME_CONTENT_LAYOUT_VALUES)[number];
