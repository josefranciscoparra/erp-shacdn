import type { PgBoss } from "pg-boss";

import {
  processSecurityDailySummary,
  resolveSecurityDailySummaryConfig,
} from "@/server/jobs/security-daily-summary-processor";

export const SECURITY_DAILY_SUMMARY_DISPATCH_JOB = "security.daily-summary.dispatch";

export async function registerSecurityDailySummaryScheduler(boss: PgBoss) {
  await boss.createQueue(SECURITY_DAILY_SUMMARY_DISPATCH_JOB);

  await boss.work(SECURITY_DAILY_SUMMARY_DISPATCH_JOB, { teamSize: 1 }, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const referenceTime = job?.createdon ? new Date(job.createdon) : new Date();
      await processSecurityDailySummary(referenceTime);
    }
  });

  const config = await resolveSecurityDailySummaryConfig();
  if (!config.enabled) {
    console.log("[SecuritySummary] Resumen diario desactivado por entorno.");
    return;
  }

  const cron = `${config.dispatchMinute} ${config.dispatchHour} * * *`;
  await boss.schedule(SECURITY_DAILY_SUMMARY_DISPATCH_JOB, cron);

  // Enviar si el worker arrancó después de la hora programada
  try {
    await processSecurityDailySummary(new Date());
  } catch (error) {
    console.error("[SecuritySummary] Error al comprobar envío inmediato:", error);
  }
}
