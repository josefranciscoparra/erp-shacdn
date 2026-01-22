import type { PgBoss } from "pg-boss";

import {
  processOvertimeWorkdaySweep,
  processWeeklyOvertimeReconciliation,
  processWorkdayOvertimeJob,
} from "@/server/jobs/overtime-processor";
import {
  OVERTIME_WEEKLY_RECONCILIATION_JOB,
  OVERTIME_WORKDAY_JOB,
  OVERTIME_WORKDAY_SWEEP_JOB,
  type OvertimeWeeklyJobPayload,
  type OvertimeWorkdayJobPayload,
  type OvertimeWorkdaySweepPayload,
} from "@/server/jobs/overtime-queue";
import { registerOvertimeScheduler } from "@/server/jobs/overtime-scheduler";

function resolveWorkerConcurrency() {
  const concurrencyRaw = process.env.JOB_WORKER_CONCURRENCY;
  const parsed = Number(concurrencyRaw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}

export async function registerOvertimeWorker(boss: PgBoss) {
  const concurrency = resolveWorkerConcurrency();

  await boss.createQueue(OVERTIME_WORKDAY_JOB);
  await boss.createQueue(OVERTIME_WEEKLY_RECONCILIATION_JOB);
  await boss.createQueue(OVERTIME_WORKDAY_SWEEP_JOB);
  await registerOvertimeScheduler(boss);

  await boss.work<OvertimeWorkdayJobPayload>(OVERTIME_WORKDAY_JOB, { teamSize: concurrency }, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const payload = job.data ?? job;
      if (!(payload?.orgId && payload?.employeeId && payload?.date)) {
        console.error(`[OvertimeWorker] Job ${job.id} inválido`, payload);
        continue;
      }

      await processWorkdayOvertimeJob(payload);
    }
  });

  await boss.work<OvertimeWeeklyJobPayload>(
    OVERTIME_WEEKLY_RECONCILIATION_JOB,
    { teamSize: concurrency },
    async (jobOrJobs) => {
      const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

      for (const job of jobs) {
        const payload = job.data ?? job;
        if (!(payload?.orgId && payload?.weekStart)) {
          console.error(`[OvertimeWorker] Job semanal ${job.id} inválido`, payload);
          continue;
        }

        await processWeeklyOvertimeReconciliation(payload);
      }
    },
  );

  await boss.work<OvertimeWorkdaySweepPayload>(OVERTIME_WORKDAY_SWEEP_JOB, { teamSize: 1 }, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const payload = job.data ?? job;
      if (!(payload?.orgId && payload?.lookbackDays)) {
        console.error(`[OvertimeWorker] Job barrido ${job.id} inválido`, payload);
        continue;
      }

      await processOvertimeWorkdaySweep(payload);
    }
  });
}
