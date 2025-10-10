import { ReactNode } from "react";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { AuthSessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/config/app-config";
import { type Locale, defaultLocale } from "@/lib/i18n";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();

  const readPreference = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const raw = cookieStore.get(key)?.value?.trim();
    return allowed.includes(raw as T) ? (raw as T) : fallback;
  };

  const themeMode = readPreference<ThemeMode>("theme_mode", THEME_MODE_VALUES, "light");
  const themePreset = readPreference<ThemePreset>("theme_preset", THEME_PRESET_VALUES, "default");
  const locale = readPreference<Locale>("locale", ["es", "en"], defaultLocale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={themeMode === "dark" ? "dark" : ""}
      data-theme-preset={themePreset}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-screen antialiased`}>
        <AuthSessionProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <PreferencesStoreProvider themeMode={themeMode} themePreset={themePreset} locale={locale}>
              {children}
              <Toaster />
            </PreferencesStoreProvider>
          </NextIntlClientProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
