import { getBoss } from "@/server/jobs/boss";
import type { EmployeeImportInviteMode } from "@/server/jobs/employee-import-invite-processor";

export const EMPLOYEE_IMPORT_INVITE_JOB = "employee.import.invite";

export interface EmployeeImportInvitePayload {
  jobId: string;
  orgId: string;
  mode: EmployeeImportInviteMode;
  performedBy: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  userAgent?: string | null;
}

export async function enqueueEmployeeImportInviteJob(payload: EmployeeImportInvitePayload) {
  const boss = await getBoss();

  await boss.createQueue(EMPLOYEE_IMPORT_INVITE_JOB);

  await boss.send(EMPLOYEE_IMPORT_INVITE_JOB, payload, {
    retryLimit: 2,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: `${payload.jobId}:${payload.mode}`,
    expireInSeconds: 60 * 60,
  });
}
