"use server";

import { createHash } from "crypto";

import type { EmployeeImportRowStatus, EmployeeImportJobStatus } from "@prisma/client";

import type { EmployeeImportOptions, RowValidationResult } from "@/lib/employee-import/types";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

interface PersistJobParams {
  orgId: string;
  userId: string;
  options: EmployeeImportOptions;
  rows: RowValidationResult[];
  stats: {
    total: number;
    ready: number;
    error: number;
    warning: number;
  };
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
}

const storageProvider = getStorageProvider();

function computeRowHash(row: RowValidationResult) {
  return createHash("sha256").update(JSON.stringify(row.data)).digest("hex");
}

export async function persistValidationJob(params: PersistJobParams) {
  const { orgId, userId, options, rows, stats, fileBuffer, fileName, mimeType } = params;

  const job = await prisma.employeeImportJob.create({
    data: {
      orgId,
      createdById: userId,
      status: "DRAFT",
      options,
      fileName: fileName ?? null,
      fileHash: fileBuffer ? createHash("sha256").update(fileBuffer).digest("hex") : null,
    },
    select: { id: true },
  });

  if (fileBuffer) {
    const filePath = `org-${orgId}/employee-imports/${job.id}/${Date.now()}-${fileName ?? "empleados"}`;
    await storageProvider.upload(fileBuffer, filePath, {
      mimeType: mimeType ?? "application/octet-stream",
      metadata: {
        orgId,
        jobId: job.id,
        originalName: fileName ?? "import",
      },
    });

    await prisma.employeeImportJob.update({
      where: { id: job.id },
      data: { filePath },
    });
  }

  await prisma.$transaction(async (tx) => {
    if (rows.length) {
      await tx.employeeImportRow.createMany({
        data: rows.map((row) => ({
          jobId: job.id,
          rowIndex: row.rowIndex,
          rowHash: computeRowHash(row),
          rawData: row.data,
          status: row.status as EmployeeImportRowStatus,
          messages: row.messages,
        })),
      });
    }

    await tx.employeeImportJob.update({
      where: { id: job.id },
      data: {
        status: rows.length ? ("VALIDATED" as EmployeeImportJobStatus) : ("FAILED" as EmployeeImportJobStatus),
        totalRows: stats.total,
        readyRows: stats.ready,
        errorRows: stats.error,
        warningRows: stats.warning,
        validatedAt: new Date(),
      },
    });
  });

  return job.id;
}

export async function recalculateJobCounters(jobId: string) {
  const counters = await prisma.employeeImportRow.groupBy({
    where: { jobId },
    by: ["status"],
    _count: true,
  });

  const map = new Map<EmployeeImportRowStatus, number>();
  counters.forEach((counter) => {
    map.set(counter.status, counter._count);
  });

  await prisma.employeeImportJob.update({
    where: { id: jobId },
    data: {
      readyRows: map.get("READY") ?? 0,
      errorRows: map.get("ERROR") ?? 0,
      skippedRows: map.get("SKIPPED") ?? 0,
      importedRows: map.get("IMPORTED") ?? 0,
      failedRows: map.get("FAILED") ?? 0,
    },
  });
}
