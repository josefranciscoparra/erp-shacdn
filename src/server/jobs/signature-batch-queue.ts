import { getBoss } from "@/server/jobs/boss";

export const SIGNATURE_BATCH_ACTIVATE_JOB = "signature.batch.activate";

export interface SignatureBatchActivatePayload {
  batchId: string;
  orgId: string;
  performedById: string;
  performedByEmail: string;
  performedByName: string | null;
  performedByRole: string;
  recipientEmployeeIds: string[];
  additionalSignerEmployeeIds: string[];
}

export async function enqueueSignatureBatchActivate(payload: SignatureBatchActivatePayload) {
  const boss = await getBoss();

  await boss.send(SIGNATURE_BATCH_ACTIVATE_JOB, payload, {
    retryLimit: 2,
    retryDelay: 120,
    retryBackoff: true,
    singletonKey: payload.batchId,
    expireInSeconds: 60 * 60,
  });
}
