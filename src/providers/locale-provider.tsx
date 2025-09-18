"use client";

import { useTransition } from "react";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import { updateLocale } from "@/server/actions/preferences";
import type { Locale } from "@/lib/i18n";

export function useLocale() {
  const [isPending, startTransition] = useTransition();
  const locale = usePreferencesStore((state) => state.locale);
  const setLocaleStore = usePreferencesStore((state) => state.setLocale);

  const setLocale = (newLocale: Locale) => {
    startTransition(async () => {
      setLocaleStore(newLocale);
      await updateLocale(newLocale);
    });
  };

  return { locale, setLocale, isPending };
}
