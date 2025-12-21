import { getBoss } from "@/server/jobs/boss";

export const EMPLOYEE_IMPORT_PROCESS_JOB = "employee.import.process";

export interface EmployeeImportJobPayload {
  jobId: string;
  orgId: string;
  performedBy: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  userAgent?: string | null;
}

export async function enqueueEmployeeImportJob(payload: EmployeeImportJobPayload) {
  const boss = await getBoss();

  await boss.createQueue(EMPLOYEE_IMPORT_PROCESS_JOB);

  await boss.send(EMPLOYEE_IMPORT_PROCESS_JOB, payload, {
    retryLimit: 2,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: payload.jobId,
    expireInSeconds: 60 * 60,
  });
}
