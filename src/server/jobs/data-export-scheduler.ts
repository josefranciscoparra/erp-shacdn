import type { PgBoss } from "pg-boss";

import { DATA_EXPORT_CLEANUP_JOB } from "@/server/jobs/data-export-queue";

const DEFAULT_CLEANUP_CRON = "15 4 * * *"; // 04:15 diario

export async function registerDataExportScheduler(boss: PgBoss) {
  await boss.createQueue(DATA_EXPORT_CLEANUP_JOB);

  const cron = process.env.DATA_EXPORT_CLEANUP_CRON ?? DEFAULT_CLEANUP_CRON;
  await boss.schedule(DATA_EXPORT_CLEANUP_JOB, cron);
}
