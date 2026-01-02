import { getBoss } from "@/server/jobs/boss";

export const EMPLOYEE_IMPORT_SIMULATE_JOB = "employee.import.simulate";

export interface EmployeeImportSimulatePayload {
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

export async function enqueueEmployeeImportSimulationJob(payload: EmployeeImportSimulatePayload) {
  const boss = await getBoss();

  await boss.createQueue(EMPLOYEE_IMPORT_SIMULATE_JOB);

  await boss.send(EMPLOYEE_IMPORT_SIMULATE_JOB, payload, {
    retryLimit: 1,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: payload.jobId,
    expireInSeconds: 60 * 60,
  });
}
