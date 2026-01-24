import type { PgBoss } from "pg-boss";

import {
  processOpenPunchRollover,
  processOpenPunchSafetyClose,
  processOnCallAvailabilitySettlement,
} from "@/server/jobs/time-tracking-processor";
import {
  TIME_TRACKING_ROLLOVER_JOB,
  TIME_TRACKING_SAFETY_CLOSE_JOB,
  TIME_TRACKING_ON_CALL_SETTLEMENT_JOB,
  type TimeTrackingRolloverPayload,
  type TimeTrackingSafetyClosePayload,
  type TimeTrackingOnCallSettlementPayload,
} from "@/server/jobs/time-tracking-queue";
import { registerTimeTrackingScheduler } from "@/server/jobs/time-tracking-scheduler";

function resolveWorkerConcurrency() {
  const concurrencyRaw = process.env.JOB_WORKER_CONCURRENCY;
  const parsed = Number(concurrencyRaw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}

export async function registerTimeTrackingWorker(boss: PgBoss) {
  const concurrency = resolveWorkerConcurrency();

  await boss.createQueue(TIME_TRACKING_ROLLOVER_JOB);
  await boss.createQueue(TIME_TRACKING_SAFETY_CLOSE_JOB);
  await boss.createQueue(TIME_TRACKING_ON_CALL_SETTLEMENT_JOB);
  await registerTimeTrackingScheduler(boss);

  await boss.work<TimeTrackingRolloverPayload>(TIME_TRACKING_ROLLOVER_JOB, { teamSize: 1 }, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const payload = job.data ?? job;
      if (!(payload?.orgId && payload?.lookbackDays)) {
        console.error(`[TimeTrackingWorker] Job rollover inválido`, payload);
        continue;
      }

      await processOpenPunchRollover(payload);
    }
  });

  await boss.work<TimeTrackingSafetyClosePayload>(
    TIME_TRACKING_SAFETY_CLOSE_JOB,
    { teamSize: concurrency },
    async (jobOrJobs) => {
      const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

      for (const job of jobs) {
        const payload = job.data ?? job;
        if (!payload?.orgId) {
          console.error(`[TimeTrackingWorker] Job safety-close inválido`, payload);
          continue;
        }

        await processOpenPunchSafetyClose(payload);
      }
    },
  );

  await boss.work<TimeTrackingOnCallSettlementPayload>(
    TIME_TRACKING_ON_CALL_SETTLEMENT_JOB,
    { teamSize: 1 },
    async (jobOrJobs) => {
      const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

      for (const job of jobs) {
        const payload = job.data ?? job;
        if (!(payload?.orgId && payload?.lookbackDays)) {
          console.error(`[TimeTrackingWorker] Job on-call inválido`, payload);
          continue;
        }

        await processOnCallAvailabilitySettlement(payload);
      }
    },
  );
}
