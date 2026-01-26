ALTER TABLE "global_settings"
  ADD COLUMN "overtimeReconciliationEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "timeTrackingSweepEnabled" BOOLEAN NOT NULL DEFAULT true;
