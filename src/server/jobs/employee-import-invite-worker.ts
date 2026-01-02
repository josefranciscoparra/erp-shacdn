import type { PgBoss } from "pg-boss";

import { processEmployeeImportInvites } from "@/server/jobs/employee-import-invite-processor";
import {
  EMPLOYEE_IMPORT_INVITE_JOB,
  type EmployeeImportInvitePayload,
} from "@/server/jobs/employee-import-invite-queue";

export async function registerEmployeeImportInviteWorker(boss: PgBoss) {
  await boss.createQueue(EMPLOYEE_IMPORT_INVITE_JOB);

  await boss.work<EmployeeImportInvitePayload>(EMPLOYEE_IMPORT_INVITE_JOB, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const payload = job.data || job;

      console.log(`[EmployeeImportInviteWorker] Procesando job ${job.id} (ImportID: ${payload?.jobId})`);

      if (!payload?.jobId || !payload?.orgId || !payload?.mode) {
        console.error(
          `[EmployeeImportInviteWorker] Job ${job.id} inválido. Payload recibido:`,
          JSON.stringify(payload),
        );
        continue;
      }

      try {
        await processEmployeeImportInvites({
          jobId: payload.jobId,
          orgId: payload.orgId,
          mode: payload.mode,
          performedBy: payload.performedBy,
          userAgent: payload.userAgent ?? undefined,
        });
        console.log(`[EmployeeImportInviteWorker] Job ${job.id} completado exitosamente`);
      } catch (error) {
        console.error(`[EmployeeImportInviteWorker] Error en job ${job.id}:`, error);
      }
    }
  });
}
