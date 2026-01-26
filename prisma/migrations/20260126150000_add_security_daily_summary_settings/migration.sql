ALTER TABLE "global_settings"
  ADD COLUMN "securityDailySummaryEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "securityDailySummaryHour" INTEGER NOT NULL DEFAULT 22,
  ADD COLUMN "securityDailySummaryMinute" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "securityDailySummaryWindowMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "securityDailySummaryLookbackHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "securityDailySummaryDispatchIntervalMinutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "securityDailySummaryTimezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
  ADD COLUMN "securityDailySummaryRecipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "securityDailySummaryOrgIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "securityDailySummarySendEmpty" BOOLEAN NOT NULL DEFAULT true;
