import type { PgBoss } from "pg-boss";

import { prisma } from "@/lib/prisma";
import { processEmployeeImportSimulation } from "@/server/jobs/employee-import-simulate-processor";
import {
  EMPLOYEE_IMPORT_SIMULATE_JOB,
  type EmployeeImportSimulatePayload,
} from "@/server/jobs/employee-import-simulate-queue";

export async function registerEmployeeImportSimulationWorker(boss: PgBoss) {
  await boss.createQueue(EMPLOYEE_IMPORT_SIMULATE_JOB);

  await boss.work<EmployeeImportSimulatePayload>(EMPLOYEE_IMPORT_SIMULATE_JOB, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const payload = job.data || job;

      console.log(`[EmployeeImportSimulationWorker] Procesando job ${job.id} (ImportID: ${payload?.jobId})`);

      if (!payload?.jobId || !payload?.orgId) {
        console.error(
          `[EmployeeImportSimulationWorker] Job ${job.id} inválido. Payload recibido:`,
          JSON.stringify(payload),
        );
        continue;
      }

      try {
        await processEmployeeImportSimulation({
          jobId: payload.jobId,
          orgId: payload.orgId,
          performedBy: payload.performedBy,
          userAgent: payload.userAgent ?? undefined,
        });
        console.log(`[EmployeeImportSimulationWorker] Job ${job.id} completado exitosamente`);
      } catch (error) {
        console.error(`[EmployeeImportSimulationWorker] Error en job ${job.id}:`, error);
      } finally {
        try {
          await prisma.employeeImportJob.update({
            where: { id: payload.jobId },
            data: { status: "VALIDATED" },
          });
        } catch (updateError) {
          console.error(
            `[EmployeeImportSimulationWorker] Error restaurando estado del job ${payload.jobId}:`,
            updateError,
          );
        }
      }
    }
  });
}
