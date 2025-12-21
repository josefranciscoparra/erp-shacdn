import type { PgBoss } from "pg-boss";

import { processEmployeeImportJob } from "@/server/jobs/employee-import-processor";
import { EMPLOYEE_IMPORT_PROCESS_JOB, type EmployeeImportJobPayload } from "@/server/jobs/employee-import-queue";

export async function registerEmployeeImportWorker(boss: PgBoss) {
  await boss.createQueue(EMPLOYEE_IMPORT_PROCESS_JOB);

  await boss.work<EmployeeImportJobPayload>(EMPLOYEE_IMPORT_PROCESS_JOB, async (jobOrJobs) => {
    // Manejo robusto de array vs objeto único (igual que en payslips)
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const payload = job.data || job;

      console.log(`[EmployeeImportWorker] Procesando job ${job.id} (ImportID: ${payload?.jobId})`);

      if (!payload?.jobId || !payload?.orgId) {
        console.error(`[EmployeeImportWorker] Job ${job.id} inválido. Payload recibido:`, JSON.stringify(payload));
        continue;
      }

      try {
        await processEmployeeImportJob({
          jobId: payload.jobId,
          orgId: payload.orgId,
          performedBy: payload.performedBy,
          userAgent: payload.userAgent ?? undefined,
        });
        console.log(`[EmployeeImportWorker] Job ${job.id} completado exitosamente`);
      } catch (error) {
        console.error(`[EmployeeImportWorker] Error en job ${job.id}:`, error);
        // Aquí podríamos marcar el job como fallido en DB si no lo hace el processor
      }
    }
  });
}
