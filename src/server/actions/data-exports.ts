"use server";

import { createHash } from "crypto";

import { revalidatePath } from "next/cache";

import { DataExportStatus, DataExportType } from "@prisma/client";

import { getActionError, safeAnyPermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { enqueueDataExportJob } from "@/server/jobs/data-export-queue";

const EXPORT_RETENTION_DAYS = 45;

export type DataExportListItem = {
  id: string;
  type: DataExportType;
  status: DataExportStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date;
  progress: number;
  fileName: string | null;
  fileSize: number | null;
  filters: Record<string, unknown>;
  requestedBy: {
    name: string | null;
    email: string | null;
  };
  errorMessage: string | null;
};

export type DataExportCounts = {
  total: number;
  pending: number;
  running: number;
  inProgress: number;
  completed: number;
  failed: number;
  canceled: number;
  expired: number;
};

type ExportStatusFilter = "ALL" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELED" | "EXPIRED";

function resolveStatusFilter(status?: ExportStatusFilter) {
  if (!status || status === "ALL") {
    return {};
  }

  if (status === "IN_PROGRESS") {
    return { status: { in: [DataExportStatus.PENDING, DataExportStatus.RUNNING] } };
  }

  if (status === "COMPLETED") {
    return { status: DataExportStatus.COMPLETED };
  }

  if (status === "FAILED") {
    return { status: DataExportStatus.FAILED };
  }

  if (status === "CANCELED") {
    return { status: DataExportStatus.CANCELED };
  }

  if (status === "EXPIRED") {
    return { status: DataExportStatus.EXPIRED };
  }

  return {};
}

function buildStableString(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => buildStableString(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    const serialized = entries.map(([key, val]) => `"${key}":${buildStableString(val)}`);
    return `{${serialized.join(",")}}`;
  }

  return JSON.stringify(value);
}

function buildFiltersHash(filters: Record<string, unknown>) {
  return createHash("sha1").update(buildStableString(filters)).digest("hex");
}

function buildExpiresAt() {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + EXPORT_RETENTION_DAYS);
  return expiresAt;
}

export async function getDataExports(
  options: {
    status?: ExportStatusFilter;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{
  success: boolean;
  exports?: DataExportListItem[];
  total?: number;
  counts?: DataExportCounts;
  error?: string;
}> {
  try {
    const authz = await safeAnyPermission(["view_reports", "export_time_tracking", "manage_time_tracking"]);
    if (!authz.ok) {
      return { success: false, error: authz.error };
    }

    const { session } = authz;
    const orgId = session.user.orgId;

    const page = Math.max(1, Math.round(options.page ?? 1));
    const pageSize = Math.min(50, Math.max(5, Math.round(options.pageSize ?? 10)));
    const skip = (page - 1) * pageSize;

    const baseWhere = { orgId };
    const statusFilter = resolveStatusFilter(options.status);

    const [exports, total, grouped] = await Promise.all([
      prisma.dataExport.findMany({
        where: { ...baseWhere, ...statusFilter },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          expiresAt: true,
          progress: true,
          fileName: true,
          fileSize: true,
          filters: true,
          errorMessage: true,
          requestedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.dataExport.count({ where: { ...baseWhere, ...statusFilter } }),
      prisma.dataExport.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    // eslint-disable-next-line no-underscore-dangle
    const countsMap = new Map(grouped.map((item) => [item.status, item._count._all]));

    const counts: DataExportCounts = {
      total: Array.from(countsMap.values()).reduce((sum, value) => sum + value, 0),
      pending: countsMap.get(DataExportStatus.PENDING) ?? 0,
      running: countsMap.get(DataExportStatus.RUNNING) ?? 0,
      completed: countsMap.get(DataExportStatus.COMPLETED) ?? 0,
      failed: countsMap.get(DataExportStatus.FAILED) ?? 0,
      canceled: countsMap.get(DataExportStatus.CANCELED) ?? 0,
      expired: countsMap.get(DataExportStatus.EXPIRED) ?? 0,
      inProgress: 0,
    };

    counts.inProgress = counts.pending + counts.running;

    return {
      success: true,
      exports: exports.map((item) => ({
        ...item,
        filters: (item.filters as Record<string, unknown>) ?? {},
      })),
      total,
      counts,
    };
  } catch (error) {
    return { success: false, error: getActionError(error, "Error al cargar exportaciones") };
  }
}

export async function requestTimeTrackingMonthlyExport(
  month: number,
  year: number,
  scope: "COMPANY" | "DEPARTMENT",
  departmentId?: string,
): Promise<{
  success: boolean;
  exportId?: string;
  status?: DataExportStatus;
  reused?: boolean;
  error?: string;
}> {
  try {
    const authz = await safeAnyPermission(["view_reports", "export_time_tracking", "manage_time_tracking"]);
    if (!authz.ok) {
      return { success: false, error: authz.error };
    }

    const { session } = authz;
    const orgId = session.user.orgId;
    const userId = session.user.id;

    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return { success: false, error: "Mes inválido" };
    }
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return { success: false, error: "Año inválido" };
    }

    const resolvedScope = scope === "DEPARTMENT" ? "DEPARTMENT" : "COMPANY";

    let departmentName: string | null = null;
    if (resolvedScope === "DEPARTMENT") {
      if (!departmentId) {
        return { success: false, error: "Departamento requerido" };
      }

      const department = await prisma.department.findFirst({
        where: { id: departmentId, orgId },
        select: { name: true },
      });

      if (!department) {
        return { success: false, error: "Departamento no encontrado" };
      }

      departmentName = department.name;
    }

    const filters: Record<string, unknown> = {
      month,
      year,
      scope: resolvedScope,
      departmentId: departmentId ?? null,
      departmentName,
      format: "CSV",
    };

    const filtersHash = buildFiltersHash(filters);
    const now = new Date();

    const existing = await prisma.dataExport.findFirst({
      where: {
        orgId,
        type: DataExportType.TIME_TRACKING_MONTHLY,
        filtersHash,
        status: { in: [DataExportStatus.PENDING, DataExportStatus.RUNNING, DataExportStatus.COMPLETED] },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return { success: true, exportId: existing.id, status: existing.status, reused: true };
    }

    const exportRecord = await prisma.dataExport.create({
      data: {
        orgId,
        requestedById: userId,
        type: DataExportType.TIME_TRACKING_MONTHLY,
        status: DataExportStatus.PENDING,
        filters,
        filtersHash,
        expiresAt: buildExpiresAt(),
      },
    });

    await enqueueDataExportJob({ exportId: exportRecord.id });

    revalidatePath("/dashboard/reports");

    return { success: true, exportId: exportRecord.id, status: exportRecord.status };
  } catch (error) {
    return { success: false, error: getActionError(error, "No se pudo crear la exportación") };
  }
}

export async function cancelDataExport(exportId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authz = await safeAnyPermission(["view_reports", "export_time_tracking", "manage_time_tracking"]);
    if (!authz.ok) {
      return { success: false, error: authz.error };
    }

    const { session } = authz;
    const orgId = session.user.orgId;

    const exportRecord = await prisma.dataExport.findFirst({
      where: { id: exportId, orgId },
      select: { status: true },
    });

    if (!exportRecord) {
      return { success: false, error: "Exportación no encontrada" };
    }

    if (![DataExportStatus.PENDING, DataExportStatus.RUNNING].includes(exportRecord.status)) {
      return { success: false, error: "La exportación ya no se puede cancelar" };
    }

    await prisma.dataExport.update({
      where: { id: exportId },
      data: {
        status: DataExportStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    revalidatePath("/dashboard/reports");

    return { success: true };
  } catch (error) {
    return { success: false, error: getActionError(error, "No se pudo cancelar la exportación") };
  }
}

export async function getDataExportDownloadUrl(
  exportId: string,
): Promise<{ success: boolean; url?: string; fileName?: string; error?: string }> {
  try {
    const authz = await safeAnyPermission(["view_reports", "export_time_tracking", "manage_time_tracking"]);
    if (!authz.ok) {
      return { success: false, error: authz.error };
    }

    const { session } = authz;
    const orgId = session.user.orgId;

    const exportRecord = await prisma.dataExport.findFirst({
      where: { id: exportId, orgId },
      select: {
        status: true,
        fileStorageKey: true,
        fileName: true,
        expiresAt: true,
      },
    });

    if (!exportRecord) {
      return { success: false, error: "Exportación no encontrada" };
    }

    if (exportRecord.status !== DataExportStatus.COMPLETED) {
      return { success: false, error: "La exportación aún no está disponible" };
    }

    if (exportRecord.expiresAt <= new Date()) {
      return { success: false, error: "La exportación ha caducado" };
    }

    if (!exportRecord.fileStorageKey) {
      return { success: false, error: "Archivo no disponible" };
    }

    const fileName = exportRecord.fileName ?? "export.csv";
    const contentDisposition = `attachment; filename="${fileName}"`;
    const url = await documentStorageService.getDocumentUrl(exportRecord.fileStorageKey, 3600, contentDisposition);

    return { success: true, url, fileName };
  } catch (error) {
    return { success: false, error: getActionError(error, "No se pudo generar la descarga") };
  }
}
