"use client";

import { OvertimeSchedulerSettingsCard } from "./overtime-scheduler-settings-card";

export function GlobalSettingsTab() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <OvertimeSchedulerSettingsCard />
    </div>
  );
}
