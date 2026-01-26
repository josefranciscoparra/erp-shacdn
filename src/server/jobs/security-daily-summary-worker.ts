import type { PgBoss } from "pg-boss";

import { registerSecurityDailySummaryScheduler } from "@/server/jobs/security-daily-summary-scheduler";

export async function registerSecurityDailySummaryWorker(boss: PgBoss) {
  await registerSecurityDailySummaryScheduler(boss);
}
