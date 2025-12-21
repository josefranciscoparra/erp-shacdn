import { getBoss } from "@/server/jobs/boss";

export const PAYSLIP_BATCH_PROCESS_JOB = "payslip.batch.process";

export interface PayslipBatchJobPayload {
  batchId: string;
  sourcePath: string;
}

export async function enqueuePayslipBatchJob(payload: PayslipBatchJobPayload) {
  const boss = await getBoss();

  await boss.send(PAYSLIP_BATCH_PROCESS_JOB, payload, {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    singletonKey: payload.batchId,
    expireInSeconds: 60 * 60,
  });
}
