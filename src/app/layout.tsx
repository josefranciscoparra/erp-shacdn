import { ReactNode } from "react";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/config/app-config";
import { getPreference } from "@/server/server-actions";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";
import { type Locale, defaultLocale } from "@/lib/i18n";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const themeMode = await getPreference<ThemeMode>("theme_mode", THEME_MODE_VALUES, "light");
  const themePreset = await getPreference<ThemePreset>("theme_preset", THEME_PRESET_VALUES, "default");
  const locale = await getPreference<Locale>("locale", ["es", "en"], defaultLocale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={themeMode === "dark" ? "dark" : ""}
      data-theme-preset={themePreset}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-screen antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <PreferencesStoreProvider themeMode={themeMode} themePreset={themePreset} locale={locale}>
            {children}
            <Toaster />
          </PreferencesStoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
