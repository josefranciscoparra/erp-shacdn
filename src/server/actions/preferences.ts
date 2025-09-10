"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Locale } from "@/lib/i18n";

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