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

  await boss.work<PayslipBatchJobPayload>(PAYSLIP_BATCH_PROCESS_JOB, { teamSize: concurrency }, async (job) => {
    const payload = job.data;
    if (!payload) {
      throw new Error("Job sin payload para procesar nóminas");
    }
    if (!payload.batchId) {
      throw new Error("Job sin batchId para procesar nóminas");
    }
    if (!payload.sourcePath) {
      throw new Error("Job sin sourcePath para procesar nóminas");
    }

    const batch = await prisma.payslipBatch.findUnique({
      where: { id: payload.batchId },
      select: { orgId: true, status: true },
    });

    if (!batch) {
      throw new Error(`Lote no encontrado: ${payload.batchId}`);
    }

    if (batch.status !== "PROCESSING") {
      console.warn(`[PayslipWorker] Lote ${payload.batchId} ignorado con estado ${batch.status}`);
      return;
    }

    const fileBuffer = await downloadSourceBuffer(payload.sourcePath);

    const employees = await prisma.employee.findMany({
      where: { orgId: batch.orgId },
      select: { id: true, firstName: true, lastName: true, nifNie: true, employeeNumber: true, active: true },
    });

    await payslipService.processBatchAsync(payload.batchId, fileBuffer, employees);
  });
}
