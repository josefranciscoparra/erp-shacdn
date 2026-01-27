import { createWriteStream, promises as fs } from "fs";
import os from "os";
import path from "path";

import { DataExportStatus, DataExportType } from "@prisma/client";
import type { PgBoss } from "pg-boss";

import { prisma } from "@/lib/prisma";
import { documentStorageService, getStorageProvider } from "@/lib/storage";
import { getLocalDateParts, getLocalDayStartUtcFromParts, resolveTimeZone } from "@/lib/timezone-utils";
import { DATA_EXPORT_CLEANUP_JOB, DATA_EXPORT_JOB, type DataExportJobPayload } from "@/server/jobs/data-export-queue";
import { registerDataExportScheduler } from "@/server/jobs/data-export-scheduler";

const EXPORT_PAGE_SIZE = 1000;

function resolveWorkerConcurrency() {
  const concurrencyRaw = process.env.DATA_EXPORT_WORKER_CONCURRENCY ?? process.env.JOB_WORKER_CONCURRENCY;
  const parsed = Number(concurrencyRaw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(date: Date, timeZone: string) {
  const parts = getLocalDateParts(date, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function formatLocalTime(date: Date | null, timeZone: string) {
  if (!date) return "";
  const parts = getLocalDateParts(date, timeZone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

function escapeCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildMonthRange(year: number, month: number, timeZone: string) {
  const start = getLocalDayStartUtcFromParts(year, month, 1, timeZone);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextStart = getLocalDayStartUtcFromParts(nextYear, nextMonth, 1, timeZone);
  const end = new Date(nextStart.getTime() - 1);
  return { start, end };
}

function buildExportFileName(type: DataExportType, year: number, month: number) {
  const monthLabel = pad2(month);
  const base = type === DataExportType.TIME_TRACKING_MONTHLY ? "fichajes" : "export";
  return `${base}-${year}-${monthLabel}.csv`;
}

function buildStorageKey(orgId: string, exportId: string, fileName: string) {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
  return `org-${orgId}/exports/${exportId}/${sanitizedName}`;
}

function parseMonthlyFilters(filters: unknown) {
  if (!filters || typeof filters !== "object") {
    throw new Error("Filtros inválidos para la exportación");
  }

  const record = filters as Record<string, unknown>;
  const month = Number(record.month ?? 0);
  const year = Number(record.year ?? 0);
  const scope = record.scope === "DEPARTMENT" ? "DEPARTMENT" : "COMPANY";
  const departmentId = typeof record.departmentId === "string" ? record.departmentId : undefined;

  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Mes inválido en filtros");
  }

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new Error("Año inválido en filtros");
  }

  if (scope === "DEPARTMENT" && !departmentId) {
    throw new Error("Departamento requerido para la exportación");
  }

  return { month, year, scope, departmentId };
}

async function markAsRunning(exportId: string) {
  await prisma.dataExport.update({
    where: { id: exportId },
    data: {
      status: DataExportStatus.RUNNING,
      startedAt: new Date(),
      progress: 5,
      errorMessage: null,
    },
  });
}

async function isCanceled(exportId: string) {
  const latest = await prisma.dataExport.findUnique({
    where: { id: exportId },
    select: { status: true },
  });
  return latest?.status === DataExportStatus.CANCELED;
}

async function updateProgress(exportId: string, progress: number) {
  await prisma.dataExport.update({
    where: { id: exportId },
    data: {
      progress,
    },
  });
}

async function finalizeExportSuccess(
  exportId: string,
  payload: { storageKey: string; fileName: string; size: number },
) {
  await prisma.dataExport.update({
    where: { id: exportId },
    data: {
      status: DataExportStatus.COMPLETED,
      progress: 100,
      completedAt: new Date(),
      fileStorageKey: payload.storageKey,
      fileName: payload.fileName,
      fileSize: payload.size,
      fileMimeType: "text/csv",
      errorMessage: null,
    },
  });
}

async function markAsFailed(exportId: string, message: string) {
  const latest = await prisma.dataExport.findUnique({
    where: { id: exportId },
    select: { status: true },
  });
  if (latest?.status === DataExportStatus.CANCELED) {
    return;
  }

  await prisma.dataExport.update({
    where: { id: exportId },
    data: {
      status: DataExportStatus.FAILED,
      failedAt: new Date(),
      errorMessage: message,
    },
  });
}

async function generateTimeTrackingMonthlyExport(exportId: string) {
  const exportRecord = await prisma.dataExport.findUnique({
    where: { id: exportId },
    select: {
      id: true,
      orgId: true,
      type: true,
      status: true,
      filters: true,
    },
  });

  if (!exportRecord) {
    return;
  }

  if (![DataExportStatus.PENDING, DataExportStatus.RUNNING].includes(exportRecord.status)) {
    return;
  }

  if (exportRecord.status === DataExportStatus.PENDING) {
    await markAsRunning(exportId);
  }

  const { month, year, scope, departmentId } = parseMonthlyFilters(exportRecord.filters);

  const organization = await prisma.organization.findUnique({
    where: { id: exportRecord.orgId },
    select: { timezone: true },
  });
  const timeZone = resolveTimeZone(organization?.timezone);
  const { start, end } = buildMonthRange(year, month, timeZone);

  const baseWhere = {
    orgId: exportRecord.orgId,
    date: {
      gte: start,
      lte: end,
    },
  } as const;

  const scopedWhere =
    scope === "DEPARTMENT"
      ? {
          ...baseWhere,
          employee: {
            employmentContracts: {
              some: {
                departmentId,
                active: true,
              },
            },
          },
        }
      : baseWhere;

  const totalRows = await prisma.workdaySummary.count({ where: scopedWhere });

  const headers = [
    "Empleado",
    "Nº Empleado",
    "NIF/NIE",
    "Departamento",
    "Fecha",
    "Entrada",
    "Salida",
    "Minutos trabajados",
    "Minutos pausa",
    "Minutos esperados",
    "Desviación minutos",
    "Estado día",
  ];

  const tempPath = path.join(os.tmpdir(), `export-${exportId}.csv`);
  const stream = createWriteStream(tempPath, { encoding: "utf8" });

  const writeLine = (values: Array<string | number | null | undefined>) => {
    const line = values.map((value) => escapeCsvValue(value)).join(",");
    stream.write(`${line}\n`);
  };

  stream.write(`\ufeff${headers.join(",")}\n`);

  let processed = 0;
  let cursor: string | undefined;

  while (true) {
    if (await isCanceled(exportId)) {
      stream.end();
      await fs.unlink(tempPath).catch(() => null);
      return;
    }

    const batch = await prisma.workdaySummary.findMany({
      where: scopedWhere,
      orderBy: { id: "asc" },
      take: EXPORT_PAGE_SIZE,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        date: true,
        clockIn: true,
        clockOut: true,
        totalWorkedMinutes: true,
        totalBreakMinutes: true,
        expectedMinutes: true,
        deviationMinutes: true,
        status: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            secondLastName: true,
            employeeNumber: true,
            nifNie: true,
            employmentContracts: {
              where: { active: true },
              select: {
                department: {
                  select: { name: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      const employee = row.employee;
      const fullName = [employee.firstName, employee.lastName, employee.secondLastName].filter(Boolean).join(" ");
      const departmentName = employee.employmentContracts[0]?.department?.name ?? "";

      const workedMinutes = row.totalWorkedMinutes ? Number(row.totalWorkedMinutes) : 0;
      const breakMinutes = row.totalBreakMinutes ? Number(row.totalBreakMinutes) : 0;
      const expectedMinutes = row.expectedMinutes ? Number(row.expectedMinutes) : 0;
      const deviationMinutes = row.deviationMinutes ? Number(row.deviationMinutes) : 0;

      writeLine([
        fullName,
        employee.employeeNumber ?? "",
        employee.nifNie ?? "",
        departmentName,
        formatLocalDate(row.date, timeZone),
        formatLocalTime(row.clockIn, timeZone),
        formatLocalTime(row.clockOut, timeZone),
        workedMinutes,
        breakMinutes,
        expectedMinutes,
        deviationMinutes,
        row.status,
      ]);
    }

    processed += batch.length;
    cursor = batch[batch.length - 1]?.id;

    if (totalRows > 0) {
      const progress = Math.min(90, Math.round((processed / totalRows) * 80 + 10));
      await updateProgress(exportId, progress);
    }
  }

  await new Promise<void>((resolve, reject) => {
    stream.end(() => resolve());
    stream.on("error", () => reject(new Error("Error escribiendo CSV")));
  });

  if (await isCanceled(exportId)) {
    await fs.unlink(tempPath).catch(() => null);
    return;
  }

  const fileName = buildExportFileName(exportRecord.type, year, month);
  const storageKey = buildStorageKey(exportRecord.orgId, exportRecord.id, fileName);

  const buffer = await fs.readFile(tempPath);
  const storage = getStorageProvider();
  const result = await storage.upload(buffer, storageKey, {
    mimeType: "text/csv",
    metadata: {
      orgId: exportRecord.orgId,
      exportId: exportRecord.id,
      type: exportRecord.type,
    },
  });

  await finalizeExportSuccess(exportRecord.id, {
    storageKey: result.path,
    fileName,
    size: result.size,
  });

  await fs.unlink(tempPath).catch(() => null);
}

async function cleanupExpiredExports() {
  const now = new Date();
  const exports = await prisma.dataExport.findMany({
    where: {
      status: DataExportStatus.COMPLETED,
      expiresAt: { lte: now },
    },
    select: {
      id: true,
      fileStorageKey: true,
    },
  });

  for (const exportRecord of exports) {
    if (exportRecord.fileStorageKey) {
      try {
        await documentStorageService.deleteDocument(exportRecord.fileStorageKey);
      } catch (error) {
        console.error("[DataExportCleanup] Error eliminando archivo:", exportRecord.id, error);
        continue;
      }
    }

    await prisma.dataExport.update({
      where: { id: exportRecord.id },
      data: {
        status: DataExportStatus.EXPIRED,
        fileStorageKey: null,
        fileName: null,
        fileSize: null,
        fileMimeType: null,
      },
    });
  }
}

async function processDataExport(exportId: string) {
  const exportRecord = await prisma.dataExport.findUnique({
    where: { id: exportId },
    select: { id: true, type: true },
  });

  if (!exportRecord) {
    return;
  }

  try {
    if (exportRecord.type === DataExportType.TIME_TRACKING_MONTHLY) {
      await generateTimeTrackingMonthlyExport(exportRecord.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await markAsFailed(exportRecord.id, message);
    throw error;
  }
}

export async function registerDataExportWorker(boss: PgBoss) {
  const concurrency = resolveWorkerConcurrency();

  await boss.createQueue(DATA_EXPORT_JOB);
  await boss.createQueue(DATA_EXPORT_CLEANUP_JOB);
  await registerDataExportScheduler(boss);

  await boss.work<DataExportJobPayload>(DATA_EXPORT_JOB, { teamSize: concurrency }, async (jobOrJobs) => {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    for (const job of jobs) {
      const payload = job.data ?? job;
      if (!payload?.exportId) {
        console.error("[DataExportWorker] Job inválido", payload);
        continue;
      }

      await processDataExport(payload.exportId);
    }
  });

  await boss.work(DATA_EXPORT_CLEANUP_JOB, { teamSize: 1 }, async () => {
    await cleanupExpiredExports();
  });
}
