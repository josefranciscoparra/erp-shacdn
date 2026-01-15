import type { BaseEmailPayload } from "@/lib/email/types";
import { getBoss } from "@/server/jobs/boss";

export const EMAIL_SEND_JOB = "email.send";

export interface EmailSendPayload extends BaseEmailPayload {
  userId?: string;
  orgId?: string;
}

export async function enqueueEmailSendJob(payload: EmailSendPayload) {
  const boss = await getBoss();

  await boss.createQueue(EMAIL_SEND_JOB);

  await boss.send(EMAIL_SEND_JOB, payload, {
    retryLimit: 3,
    retryDelay: 120,
    retryBackoff: true,
    expireInSeconds: 60 * 60,
  });
}
