import type { PgBoss } from "pg-boss";

import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { PAYSLIP_BATCH_PROCESS_JOB, type PayslipBatchJobPayload } from "@/server/jobs/payslip-queue";
import { payslipService } from "@/services/payslips/payslip.service";

function resolveWorkerConcurrency() {
  const concurrencyRaw = process.env.JOB_WORKER_CONCURRENCY;
  const parsed = Number(concurrencyRaw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}

async function downloadSourceBuffer(sourcePath: string): Promise<Buffer> {
  return await documentStorageService.downloadFileToBuffer(sourcePath);
}

export async function registerPayslipWorker(boss: PgBoss) {
  const concurrency = resolveWorkerConcurrency();

  await boss.createQueue(PAYSLIP_BATCH_PROCESS_JOB);

  await boss.work<PayslipBatchJobPayload>(PAYSLIP_BATCH_PROCESS_JOB, { teamSize: concurrency }, async (jobOrJobs) => {
    // pg-boss puede entregar un array de jobs o un único job dependiendo de la configuración/versión
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      // El payload real está dentro de la propiedad .data del job
      const payload = job.data || job;

      console.log(`[PayslipWorker] Procesando job ${job.id} para batch ${payload?.batchId}`);

      if (!payload?.batchId || !payload?.sourcePath) {
        console.error(`[PayslipWorker] Job ${job.id} inválido. Payload recibido:`, JSON.stringify(payload));
        // Si fallamos aquí, marcamos error en este job específico (si pg-boss lo permite lanzando error)
        // Pero para no detener el worker, logueamos y continuamos con el siguiente.
        continue;
      }

      try {
        const batch = await prisma.payslipBatch.findUnique({
          where: { id: payload.batchId },
          select: { orgId: true, status: true },
        });

        if (!batch) {
          console.error(`[PayslipWorker] Lote no encontrado: ${payload.batchId}`);
          continue;
        }

        if (batch.status !== "PROCESSING") {
          console.warn(`[PayslipWorker] Lote ${payload.batchId} ignorado con estado ${batch.status}`);
          continue;
        }

        const fileBuffer = await downloadSourceBuffer(payload.sourcePath);

        const employees = await prisma.employee.findMany({
          where: { orgId: batch.orgId },
          select: { id: true, firstName: true, lastName: true, nifNie: true, employeeNumber: true, active: true },
        });

        await payslipService.processBatchAsync(payload.batchId, fileBuffer, employees);
        console.log(`[PayslipWorker] Lote ${payload.batchId} procesado exitosamente`);
      } catch (error) {
        const retryCount = typeof (job as { retryCount?: number }).retryCount === "number" ? job.retryCount : 0;
        const retryLimit = typeof (job as { retryLimit?: number }).retryLimit === "number" ? job.retryLimit : 0;
        const hasRetriesLeft = retryLimit > 0 && retryCount < retryLimit;

        console.error(
          `[PayslipWorker] Error procesando job ${job.id} (Batch: ${payload.batchId}, intento ${
            retryCount + 1
          }/${retryLimit || 1}):`,
          error,
        );

        if (!hasRetriesLeft) {
          await payslipService.updateBatchStatus(payload.batchId, "ERROR");
        }

        throw error;
      }
    }
  });
}
