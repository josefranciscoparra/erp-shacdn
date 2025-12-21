import type { PgBoss } from "pg-boss";

import { processEmployeeImportJob } from "@/server/jobs/employee-import-processor";
import { EMPLOYEE_IMPORT_PROCESS_JOB, type EmployeeImportJobPayload } from "@/server/jobs/employee-import-queue";

export async function registerEmployeeImportWorker(boss: PgBoss) {
  await boss.createQueue(EMPLOYEE_IMPORT_PROCESS_JOB);

  await boss.work<EmployeeImportJobPayload>(EMPLOYEE_IMPORT_PROCESS_JOB, async (job) => {
    const payload = job.data;
    if (!payload) {
      throw new Error("Job sin payload para importación de empleados");
    }
    if (!payload.jobId || !payload.orgId) {
      throw new Error("Payload incompleto para importación de empleados");
    }

    await processEmployeeImportJob({
      jobId: payload.jobId,
      orgId: payload.orgId,
      performedBy: payload.performedBy,
      userAgent: payload.userAgent ?? undefined,
    });
  });
}
