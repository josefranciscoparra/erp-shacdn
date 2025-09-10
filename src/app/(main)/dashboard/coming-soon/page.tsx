"use client";

import { useTranslations } from "next-intl";

export default function Page() {
  const t = useTranslations('pages.comingSoon');
  
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('description')}</p>
    </div>
  );
}
