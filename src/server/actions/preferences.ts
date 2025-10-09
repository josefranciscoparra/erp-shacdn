"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import type { Locale } from "@/lib/i18n";
import type { ThemeMode, ThemePreset } from "@/types/preferences/theme";

export async function updateLocale(locale: Locale) {
  const cookieStore = await cookies();

  cookieStore.set("locale", locale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  revalidatePath("/", "layout");
}

export async function updateThemeMode(mode: ThemeMode) {
  const cookieStore = await cookies();

  cookieStore.set("theme_mode", mode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  revalidatePath("/", "layout");
}

export async function updateThemePreset(preset: ThemePreset) {
  const cookieStore = await cookies();

  cookieStore.set("theme_preset", preset, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  revalidatePath("/", "layout");
}
