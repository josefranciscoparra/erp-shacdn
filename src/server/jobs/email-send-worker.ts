import type { PgBoss } from "pg-boss";

import { sendEmailRawImmediate } from "@/lib/email/email-service";
import { EMAIL_SEND_JOB, type EmailSendPayload } from "@/server/jobs/email-send-queue";

export async function registerEmailSendWorker(boss: PgBoss) {
  await boss.createQueue(EMAIL_SEND_JOB);

  await boss.work<EmailSendPayload>(EMAIL_SEND_JOB, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const payload = job.data ?? job;

      if (!payload) {
        console.error(`[EmailWorker] Job ${job.id} inválido: payload vacío.`);
        continue;
      }

      if (!payload.to) {
        console.error(`[EmailWorker] Job ${job.id} inválido: destinatario faltante.`);
        continue;
      }

      if (!payload.subject) {
        console.error(`[EmailWorker] Job ${job.id} inválido: subject faltante.`);
        continue;
      }

      try {
        const result = await sendEmailRawImmediate(payload);

        if (!result.success) {
          throw new Error(result.error ?? "Error enviando email.");
        }

        console.log(`[EmailWorker] Email enviado correctamente. Job ${job.id}`);
      } catch (error) {
        console.error(`[EmailWorker] Error en job ${job.id}:`, error);
        throw error;
      }
    }
  });
}
