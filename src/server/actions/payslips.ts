"use server";

import { revalidatePath } from "next/cache";

import { FileCategory, RetentionPolicy, type Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { EmployeeOrgGuardError, ensureEmployeeHasAccessToActiveOrg } from "@/lib/auth/ensure-employee-active-org";
import { PAYSLIP_ADMIN_ROLES, PAYSLIP_PUBLISH_ROLES, PAYSLIP_REVOKE_ROLES } from "@/lib/payslip/config";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { registerStoredFile } from "@/lib/storage/storage-ledger";
import { createNotification } from "@/server/actions/notifications";
import { getOrgStorageQuota } from "@/server/storage/quota";

// Nombres de meses para notificaciones
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

async function logBatchEvent(batchId: string, type: string, message: string, meta?: Prisma.JsonValue) {
  // Sistema de actividad desactivado temporalmente
  return;
}

// ============================================
// TIPOS
// ============================================

export type PayslipBatchListItem = {
  id: string;
  month: number | null;
  year: number | null;
  label: string | null;
  originalFileName: string;
  originalFileType: string;
  totalFiles: number;
  readyCount: number;
  pendingCount: number;
  blockedInactive: number;
  publishedCount: number;
  revokedCount: number;
  errorCount: number;
  /** @deprecated Usar readyCount + publishedCount */
  assignedCount: number;
  status: string;
  createdAt: Date;
  publishedAt: Date | null;
  uploadedBy: {
    name: string | null;
    email: string | null;
  };
};

export type PayslipUploadItemDetail = {
  id: string;
  batchId: string;
  tempFilePath: string;
  originalFileName: string | null;
  pageNumber: number | null;
  detectedDni: string | null;
  detectedName: string | null;
  detectedCode: string | null;
  confidenceScore: number;
  isAutoMatched: boolean;
  status: string;
  errorMessage: string | null;
  employeeId: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    nifNie: string | null;
    employeeNumber: string | null;
  } | null;
  documentId: string | null;
  document?: {
    id: string;
    fileName: string;
    storageUrl: string;
    mimeType: string;
  } | null;
  createdAt: Date;
  assignedAt: Date | null;
  assignedById: string | null;
};

export type PayslipEmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
  nifNie: string | null;
  active: boolean;
};

// ============================================
// HELPERS
// ============================================

async function isPayslipAdmin(role: string): Promise<boolean> {
  return PAYSLIP_ADMIN_ROLES.includes(role as (typeof PAYSLIP_ADMIN_ROLES)[number]);
}

// ============================================
// SERVER ACTIONS: GESTIÓN DE LOTES
// ============================================

/**
 * Obtiene la lista de lotes de nóminas para la organización
 */
export async function getPayslipBatches(
  options: {
    status?: string;
    year?: number;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{ success: boolean; batches?: PayslipBatchListItem[]; total?: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos para ver lotes de nóminas" };
    }

    const { status, year, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where = {
      orgId,
      ...(status && {
        status: status as
          | "PROCESSING"
          | "REVIEW"
          | "READY_TO_PUBLISH"
          | "COMPLETED"
          | "PARTIAL"
          | "ERROR"
          | "CANCELLED",
      }),
      ...(year && { year }),
    };

    const [batches, total] = await Promise.all([
      prisma.payslipBatch.findMany({
        where,
        include: {
          uploadedBy: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.payslipBatch.count({ where }),
    ]);

    return {
      success: true,
      batches: batches.map((b) => ({
        id: b.id,
        month: b.month,
        year: b.year,
        label: b.label,
        originalFileName: b.originalFileName,
        originalFileType: b.originalFileType,
        totalFiles: b.totalFiles,
        readyCount: b.readyCount,
        pendingCount: b.pendingCount,
        blockedInactive: b.blockedInactive,
        publishedCount: b.publishedCount,
        revokedCount: b.revokedCount,
        errorCount: b.errorCount,
        // Campos legacy para compatibilidad
        assignedCount: b.assignedCount,
        status: b.status,
        createdAt: b.createdAt,
        publishedAt: b.publishedAt,
        uploadedBy: {
          name: b.uploadedBy.name,
          email: b.uploadedBy.email,
        },
      })),
      total,
    };
  } catch (error) {
    console.error("Error al obtener lotes de nóminas:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Obtiene un lote con todos sus items
 */
export async function getBatchWithItems(
  batchId: string,
  options: { status?: string; page?: number; pageSize?: number } = {},
): Promise<{
  success: boolean;
  batch?: PayslipBatchListItem;
  items?: PayslipUploadItemDetail[];
  total?: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos para ver este lote" };
    }

    const { status, page = 1, pageSize = 50 } = options;
    const skip = (page - 1) * pageSize;

    const batch = await prisma.payslipBatch.findFirst({
      where: { id: batchId, orgId },
      include: {
        uploadedBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    await logBatchEvent(batchId, "PUBLISH_STARTED", "Publicación de lote iniciada", {
      readyCount: batch.readyCount,
    });

    const itemWhere = {
      batchId,
      ...(status && {
        status: status as
          | "PENDING_OCR"
          | "PENDING_REVIEW"
          | "READY"
          | "PUBLISHED"
          | "BLOCKED_INACTIVE"
          | "ERROR"
          | "REVOKED"
          | "SKIPPED",
      }),
    };

    const [items, total] = await Promise.all([
      prisma.payslipUploadItem.findMany({
        where: itemWhere,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nifNie: true,
              employeeNumber: true,
            },
          },
          document: {
            select: {
              id: true,
              fileName: true,
              storageUrl: true,
              mimeType: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.payslipUploadItem.count({ where: itemWhere }),
    ]);

    return {
      success: true,
      batch: {
        id: batch.id,
        month: batch.month,
        year: batch.year,
        label: batch.label,
        originalFileName: batch.originalFileName,
        originalFileType: batch.originalFileType,
        totalFiles: batch.totalFiles,
        readyCount: batch.readyCount,
        pendingCount: batch.pendingCount,
        blockedInactive: batch.blockedInactive,
        publishedCount: batch.publishedCount,
        revokedCount: batch.revokedCount,
        errorCount: batch.errorCount,
        // Campos legacy para compatibilidad
        assignedCount: batch.assignedCount,
        status: batch.status,
        createdAt: batch.createdAt,
        publishedAt: batch.publishedAt,
        uploadedBy: {
          name: batch.uploadedBy.name,
          email: batch.uploadedBy.email,
        },
      },
      items: items.map((item) => ({
        id: item.id,
        batchId: item.batchId,
        tempFilePath: item.tempFilePath,
        originalFileName: item.originalFileName,
        pageNumber: item.pageNumber,
        detectedDni: item.detectedDni,
        detectedName: item.detectedName,
        detectedCode: item.detectedCode,
        confidenceScore: item.confidenceScore,
        isAutoMatched: item.isAutoMatched,
        status: item.status,
        errorMessage: item.errorMessage,
        employeeId: item.employeeId,
        employee: item.employee,
        documentId: item.documentId,
        document: item.document
          ? {
              id: item.document.id,
              fileName: item.document.fileName,
              storageUrl: item.document.storageUrl,
              mimeType: item.document.mimeType,
            }
          : null,
        createdAt: item.createdAt,
        assignedAt: item.assignedAt,
        assignedById: item.assignedById,
      })),
      total,
    };
  } catch (error) {
    console.error("Error al obtener lote con items:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

export async function getActiveEmployees(
  options: { includeInactive?: boolean; limit?: number } = {},
): Promise<{ success: boolean; employees?: PayslipEmployeeOption[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos para ver empleados" };
    }

    const includeInactive = options.includeInactive ?? true;

    const where: Prisma.EmployeeWhereInput = {
      orgId,
      ...(includeInactive ? {} : { active: true }),
    };

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        nifNie: true,
        active: true,
      },
      orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
      ...(typeof options.limit === "number" ? { take: options.limit } : {}),
    });

    return { success: true, employees };
  } catch (error) {
    console.error("Error al obtener empleados para nóminas:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Asigna manualmente un item de nómina a un empleado
 * Esto marca el item como READY (listo para publicar), NO lo publica
 * La publicación se hace después con publishBatch o publishItems
 */
export async function assignPayslipItem(
  itemId: string,
  employeeId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const userId = session.user.id;
    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos para asignar nóminas" };
    }

    // Verificar que el item existe y pertenece a la organización
    const item = await prisma.payslipUploadItem.findFirst({
      where: { id: itemId, orgId },
      include: { batch: true },
    });

    if (!item) {
      return { success: false, error: "Item no encontrado" };
    }

    // Solo se pueden asignar items en estado PENDING_REVIEW, BLOCKED_INACTIVE, ERROR o READY (permite editar)
    const assignableStatuses = ["PENDING_REVIEW", "BLOCKED_INACTIVE", "ERROR", "READY"];
    if (!assignableStatuses.includes(item.status)) {
      return { success: false, error: "Este item no se puede asignar en su estado actual" };
    }

    const previousStatus = item.status;

    // Verificar que el empleado existe y pertenece a la organización
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, orgId },
    });

    if (!employee) {
      return { success: false, error: "Empleado no encontrado" };
    }

    // Advertir si el empleado está inactivo
    if (!employee.active) {
      return { success: false, error: "No se puede asignar a un empleado inactivo" };
    }

    await prisma.$transaction(async (tx) => {
      // Actualizar item: marcar como READY (listo para publicar)
      await tx.payslipUploadItem.update({
        where: { id: itemId },
        data: {
          employeeId,
          status: "READY",
          assignedAt: new Date(),
          assignedById: userId,
          isAutoMatched: false, // Asignación manual
          errorMessage: null,
        },
      });

      // Actualizar contadores del batch
      await tx.payslipBatch.update({
        where: { id: item.batchId },
        data: {
          readyCount: previousStatus === "READY" ? undefined : { increment: 1 },
          pendingCount: previousStatus === "PENDING_REVIEW" ? { decrement: 1 } : undefined,
          blockedInactive: previousStatus === "BLOCKED_INACTIVE" ? { decrement: 1 } : undefined,
          errorCount: previousStatus === "ERROR" ? { decrement: 1 } : undefined,
        },
      });
    });

    // Actualizar estado del batch si es necesario
    await updateBatchStatus(item.batchId);

    await logBatchEvent(item.batchId, "ITEM_ASSIGNED_MANUAL", "Nómina asignada manualmente", {
      itemId,
      employeeId,
      assignedById: userId,
    });

    revalidatePath(`/dashboard/payslips/${item.batchId}`);

    return { success: true };
  } catch (error) {
    console.error("Error al asignar item:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Salta/descarta un item de nómina
 */
export async function skipPayslipItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos para gestionar nóminas" };
    }

    const item = await prisma.payslipUploadItem.findFirst({
      where: { id: itemId, orgId },
    });

    if (!item) {
      return { success: false, error: "Item no encontrado" };
    }

    // Solo se pueden saltar items que no están publicados
    const skippableStatuses = ["PENDING_OCR", "PENDING", "PENDING_REVIEW", "READY", "BLOCKED_INACTIVE", "ERROR"];
    if (!skippableStatuses.includes(item.status)) {
      return { success: false, error: "Solo se pueden saltar items no publicados" };
    }

    const previousStatus = item.status;

    await prisma.payslipUploadItem.update({
      where: { id: itemId },
      data: { status: "SKIPPED" },
    });

    // Actualizar contadores del batch
    await prisma.payslipBatch.update({
      where: { id: item.batchId },
      data: {
        readyCount: previousStatus === "READY" ? { decrement: 1 } : undefined,
        pendingCount:
          previousStatus === "PENDING_REVIEW" || previousStatus === "PENDING" ? { decrement: 1 } : undefined,
        blockedInactive: previousStatus === "BLOCKED_INACTIVE" ? { decrement: 1 } : undefined,
        errorCount: previousStatus === "ERROR" ? { decrement: 1 } : undefined,
      },
    });

    await updateBatchStatus(item.batchId);
    await logBatchEvent(item.batchId, "ITEM_SKIPPED", "Nómina quitada manualmente", {
      itemId,
      previousStatus,
    });

    revalidatePath(`/dashboard/payslips/${item.batchId}`);

    return { success: true };
  } catch (error) {
    console.error("Error al saltar item:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

export async function updatePayslipBatchMeta(
  batchId: string,
  data: { month?: number | null; year?: number | null; label?: string | null },
): Promise<{ success: boolean; batch?: PayslipBatchListItem; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos para editar este lote" };
    }

    const batch = await prisma.payslipBatch.update({
      where: { id: batchId, orgId },
      data: {
        month: data.month ?? null,
        year: data.year ?? null,
        label: data.label ?? null,
      },
      include: {
        uploadedBy: {
          select: { name: true, email: true },
        },
      },
    });

    await logBatchEvent(batch.id, "BATCH_METADATA_UPDATED", "Metadatos del lote actualizados", {
      month: batch.month,
      year: batch.year,
      label: batch.label,
      updatedById: session.user.id,
    });

    revalidatePath(`/dashboard/payslips/${batchId}`);
    revalidatePath("/dashboard/payslips");

    return {
      success: true,
      batch: {
        id: batch.id,
        month: batch.month,
        year: batch.year,
        label: batch.label,
        originalFileName: batch.originalFileName,
        originalFileType: batch.originalFileType,
        totalFiles: batch.totalFiles,
        readyCount: batch.readyCount,
        pendingCount: batch.pendingCount,
        blockedInactive: batch.blockedInactive,
        publishedCount: batch.publishedCount,
        revokedCount: batch.revokedCount,
        errorCount: batch.errorCount,
        assignedCount: batch.assignedCount,
        status: batch.status,
        createdAt: batch.createdAt,
        publishedAt: batch.publishedAt,
        uploadedBy: {
          name: batch.uploadedBy.name,
          email: batch.uploadedBy.email,
        },
      },
    };
  } catch (error) {
    console.error("Error al actualizar metadatos del lote:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Reintenta el procesamiento OCR de un item
 */
export async function retryOcrItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos para gestionar nóminas" };
    }

    const item = await prisma.payslipUploadItem.findFirst({
      where: { id: itemId, orgId },
    });

    if (!item) {
      return { success: false, error: "Item no encontrado" };
    }

    // Marcar como pendiente de OCR para reprocesamiento
    await prisma.payslipUploadItem.update({
      where: { id: itemId },
      data: {
        status: "PENDING_OCR",
        errorMessage: null,
        detectedDni: null,
        detectedName: null,
        detectedCode: null,
        confidenceScore: 0,
        employeeId: null,
      },
    });

    await logBatchEvent(item.batchId, "ITEM_RESET_TO_OCR", "Nómina reenviada a OCR", {
      itemId,
    });

    // Aquí se debería disparar el reprocesamiento async
    // Por ahora solo marca como pendiente de OCR

    revalidatePath(`/dashboard/payslips/${item.batchId}`);

    return { success: true };
  } catch (error) {
    console.error("Error al reintentar OCR:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

// ============================================
// SERVER ACTIONS: VISTA EMPLEADO ("MIS NÓMINAS")
// ============================================

/**
 * Obtiene las nóminas del empleado actual
 */
export async function getMyPayslips(options: { year?: number; page?: number; pageSize?: number } = {}): Promise<{
  success: boolean;
  payslips?: {
    id: string;
    fileName: string;
    month: number | null;
    year: number | null;
    createdAt: Date;
  }[];
  total?: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const { employeeId, activeOrgId } = await ensureEmployeeHasAccessToActiveOrg(session);

    const { year, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where = {
      employeeId,
      orgId: activeOrgId,
      kind: "PAYSLIP" as const,
      ...(year && { payslipYear: year }),
    };

    const [payslips, total] = await Promise.all([
      prisma.employeeDocument.findMany({
        where,
        select: {
          id: true,
          fileName: true,
          payslipMonth: true,
          payslipYear: true,
          createdAt: true,
        },
        orderBy: [{ payslipYear: "desc" }, { payslipMonth: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.employeeDocument.count({ where }),
    ]);

    return {
      success: true,
      payslips: payslips.map((p) => ({
        id: p.id,
        fileName: p.fileName,
        month: p.payslipMonth,
        year: p.payslipYear,
        createdAt: p.createdAt,
      })),
      total,
    };
  } catch (error) {
    if (error instanceof EmployeeOrgGuardError) {
      const message =
        error.code === "WRONG_ORG"
          ? "Cambia a tu organización de empleado para consultar tus nóminas."
          : "No tienes un perfil de empleado asociado.";
      return { success: false, error: message };
    }
    console.error("Error al obtener mis nóminas:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Obtiene los años disponibles con nóminas para el empleado actual
 */
export async function getMyPayslipYears(): Promise<{ success: boolean; years?: number[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const { employeeId, activeOrgId } = await ensureEmployeeHasAccessToActiveOrg(session);

    const payslips = await prisma.employeeDocument.findMany({
      where: {
        employeeId,
        orgId: activeOrgId,
        kind: "PAYSLIP",
        payslipYear: { not: null },
      },
      select: { payslipYear: true },
      distinct: ["payslipYear"],
      orderBy: { payslipYear: "desc" },
    });

    return {
      success: true,
      years: payslips.map((p) => p.payslipYear!).filter(Boolean),
    };
  } catch (error) {
    if (error instanceof EmployeeOrgGuardError) {
      const message =
        error.code === "WRONG_ORG"
          ? "Cambia a tu organización de empleado para consultar tus nóminas."
          : "No tienes un perfil de empleado asociado.";
      return { success: false, error: message };
    }
    console.error("Error al obtener años de nóminas:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

// ============================================
// HELPERS INTERNOS
// ============================================

/**
 * Actualiza el estado de un batch basándose en sus items
 *
 * Estados:
 * - PROCESSING: En proceso de extracción/OCR (hay PENDING_OCR)
 * - REVIEW: Pendiente de revisión manual (hay PENDING_REVIEW o BLOCKED_INACTIVE)
 * - READY_TO_PUBLISH: Listo para publicar (hay READY, sin pendientes)
 * - COMPLETED: Todas publicadas
 * - PARTIAL: Parcialmente publicado (algunas publicadas, otras pendientes)
 * - ERROR: Todo en error
 * - CANCELLED: Lote cancelado/revocado
 */
async function updateBatchStatus(batchId: string): Promise<void> {
  const batch = await prisma.payslipBatch.findUnique({
    where: { id: batchId },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!batch) return;

  // Si ya está CANCELLED, no cambiar estado
  if (batch.status === "CANCELLED") return;

  // Contar items en cola de OCR (PENDING_OCR)
  const pendingOcrCount = await prisma.payslipUploadItem.count({
    where: { batchId, status: "PENDING_OCR" },
  });

  // Contar items saltados
  const skippedCount = await prisma.payslipUploadItem.count({
    where: { batchId, status: "SKIPPED" },
  });

  // Calcular totales efectivos (excluyendo saltados)
  const effectiveTotal = batch.totalFiles - skippedCount;

  let newStatus = batch.status;

  // Prioridad de estados:

  // 1. Si hay items en OCR → PROCESSING
  if (pendingOcrCount > 0) {
    newStatus = "PROCESSING";
  }
  // 2. Si solo hay errores → ERROR
  else if (
    batch.errorCount > 0 &&
    batch.readyCount === 0 &&
    batch.pendingCount === 0 &&
    batch.publishedCount === 0 &&
    batch.blockedInactive === 0
  ) {
    newStatus = "ERROR";
  }
  // 3. Si todos publicados (o todos los no-saltados publicados) → COMPLETED
  else if (batch.publishedCount > 0 && batch.publishedCount >= effectiveTotal - batch.errorCount) {
    newStatus = "COMPLETED";
  }
  // 4. Si hay publicados pero también hay pendientes → PARTIAL
  else if (batch.publishedCount > 0 && (batch.readyCount > 0 || batch.pendingCount > 0 || batch.blockedInactive > 0)) {
    newStatus = "PARTIAL";
  }
  // 5. Si hay items READY y no hay pendientes de revisión → READY_TO_PUBLISH
  else if (batch.readyCount > 0 && batch.pendingCount === 0 && batch.blockedInactive === 0) {
    newStatus = "READY_TO_PUBLISH";
  }
  // 6. Si hay items pendientes de revisión o bloqueados → REVIEW
  else if (batch.pendingCount > 0 || batch.blockedInactive > 0) {
    newStatus = "REVIEW";
  }
  // 7. Si hay items ready pero también hay errores → REVIEW (para revisión)
  else if (batch.readyCount > 0) {
    newStatus = "READY_TO_PUBLISH";
  }

  if (newStatus !== batch.status) {
    await prisma.payslipBatch.update({
      where: { id: batchId },
      data: { status: newStatus },
    });
  }
}

/**
 * Obtiene empleados para búsqueda en selector
 */
export async function searchEmployeesForPayslip(query: string): Promise<{
  success: boolean;
  employees?: {
    id: string;
    firstName: string;
    lastName: string;
    nifNie: string | null;
    employeeNumber: string | null;
  }[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos" };
    }

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { nifNie: { contains: query, mode: "insensitive" } },
          { employeeNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nifNie: true,
        employeeNumber: true,
      },
      take: 10,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return { success: true, employees };
  } catch (error) {
    console.error("Error al buscar empleados:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

// ============================================
// SERVER ACTIONS: PUBLICACIÓN Y REVOCACIÓN
// ============================================

/**
 * Tipo de resultado para operaciones de publicación
 */
export type PublishResult = {
  success: boolean;
  publishedCount?: number;
  skippedCount?: number;
  error?: string;
};

/**
 * Tipo de resumen para confirmación de publicación
 */
export type BatchPublishSummary = {
  batchId: string;
  month: number | null;
  year: number | null;
  readyCount: number;
  pendingReviewCount: number;
  blockedInactiveCount: number;
  errorCount: number;
  alreadyPublishedCount: number;
};

/**
 * Obtiene resumen del lote para confirmación antes de publicar
 */
export async function getBatchPublishSummary(
  batchId: string,
): Promise<{ success: boolean; summary?: BatchPublishSummary; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!PAYSLIP_PUBLISH_ROLES.includes(role as (typeof PAYSLIP_PUBLISH_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para publicar nóminas" };
    }

    const batch = await prisma.payslipBatch.findFirst({
      where: { id: batchId, orgId },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    return {
      success: true,
      summary: {
        batchId: batch.id,
        month: batch.month,
        year: batch.year,
        readyCount: batch.readyCount,
        pendingReviewCount: batch.pendingCount,
        blockedInactiveCount: batch.blockedInactive,
        errorCount: batch.errorCount,
        alreadyPublishedCount: batch.publishedCount,
      },
    };
  } catch (error) {
    console.error("Error al obtener resumen del lote:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Publica un lote completo (todos los items READY)
 *
 * Esto:
 * 1. Mueve archivos de temporal a definitivo
 * 2. Crea EmployeeDocuments
 * 3. Envía notificaciones a empleados
 * 4. Actualiza estados de items y batch
 */
export async function publishBatch(batchId: string): Promise<PublishResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const userId = session.user.id;
    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!PAYSLIP_PUBLISH_ROLES.includes(role as (typeof PAYSLIP_PUBLISH_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para publicar nóminas" };
    }

    const batch = await prisma.payslipBatch.findFirst({
      where: { id: batchId, orgId },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    // Obtener todos los items READY
    const readyItems = await prisma.payslipUploadItem.findMany({
      where: {
        batchId,
        status: "READY",
        employeeId: { not: null },
      },
      include: {
        employee: true,
      },
    });

    if (readyItems.length === 0) {
      return { success: false, error: "No hay nóminas listas para publicar" };
    }

    // Verificar cuota de almacenamiento antes de publicar
    // Estimación conservadora: 1MB por nómina (mejor rechazar de más que exceder cuota)
    const ESTIMATED_SIZE_PER_PAYSLIP = 1024 * 1024; // 1MB
    const estimatedTotalSize = BigInt(readyItems.length * ESTIMATED_SIZE_PER_PAYSLIP);
    try {
      const quota = await getOrgStorageQuota(orgId);
      if (quota.availableBytes < estimatedTotalSize) {
        return {
          success: false,
          error: `No hay espacio de almacenamiento suficiente para publicar ${readyItems.length} nóminas. Contacta con tu administrador.`,
        };
      }
    } catch (quotaError) {
      // Si falla la verificación de cuota, continuar (no bloquear por error técnico)
      console.warn("[publishBatch] Error verificando cuota, continuando:", quotaError);
    }

    let publishedCount = 0;
    let skippedCount = 0;
    const now = new Date();

    for (const item of readyItems) {
      if (!item.employeeId || !item.employee) {
        skippedCount++;
        continue;
      }

      try {
        // 1. Mover archivo de temporal a definitivo
        const movedFile = await documentStorageService.movePayslipToFinal(
          orgId,
          item.employeeId,
          item.tempFilePath,
          item.originalFileName ?? `nomina_${item.id}.pdf`,
        );

        // 2. Crear EmployeeDocument en una transacción
        await prisma.$transaction(async (tx) => {
          const storedFile = await registerStoredFile({
            orgId,
            employeeId: item.employeeId!,
            path: movedFile.path,
            sizeBytes: movedFile.size ?? 0,
            mimeType: "application/pdf",
            category: FileCategory.PAYROLL,
            retentionPolicy: RetentionPolicy.PAYROLL,
            tx,
          });

          const document = await tx.employeeDocument.create({
            data: {
              employeeId: item.employeeId!,
              orgId,
              kind: "PAYSLIP",
              fileName: movedFile.fileName,
              storageUrl: movedFile.path,
              fileSize: movedFile.size ?? 0,
              mimeType: "application/pdf",
              payslipMonth: batch.month,
              payslipYear: batch.year,
              uploadedById: userId,
              storedFileId: storedFile.id,
            },
          });

          // Actualizar item con estado PUBLISHED
          await tx.payslipUploadItem.update({
            where: { id: item.id },
            data: {
              status: "PUBLISHED",
              documentId: document.id,
              publishedAt: now,
              publishedById: userId,
            },
          });
        });

        // 3. Enviar notificación al empleado
        if (item.employee.userId) {
          const monthName = batch.month ? MONTH_NAMES[batch.month - 1] : "";
          const yearStr = batch.year ? batch.year.toString() : "";
          const title = monthName && yearStr ? `Nómina de ${monthName} ${yearStr}` : "Nueva nómina disponible";

          await createNotification(
            item.employee.userId,
            orgId,
            "PAYSLIP_AVAILABLE",
            title,
            "Tu nómina ya está disponible en tu portal de empleado.",
          );
        }

        publishedCount++;
      } catch (itemError) {
        console.error(`Error publicando item ${item.id}:`, itemError);
        skippedCount++;
      }
    }

    // 4. Actualizar contadores del batch
    await prisma.payslipBatch.update({
      where: { id: batchId },
      data: {
        readyCount: { decrement: publishedCount },
        publishedCount: { increment: publishedCount },
        publishedAt: now,
        publishedById: userId,
      },
    });

    // 5. Actualizar estado del batch
    await updateBatchStatus(batchId);

    revalidatePath(`/dashboard/payslips/${batchId}`);
    revalidatePath("/dashboard/payslips");

    await logBatchEvent(batchId, "PUBLISH_COMPLETED", "Publicación de lote finalizada", {
      publishedCount,
      skippedCount,
    });

    return {
      success: true,
      publishedCount,
      skippedCount,
    };
  } catch (error) {
    console.error("Error al publicar lote:", error);
    await logBatchEvent(batchId, "PUBLISH_ERROR", error instanceof Error ? error.message : "Error al publicar");
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Publica items específicos seleccionados
 */
export async function publishItems(itemIds: string[]): Promise<PublishResult> {
  let selectionBatchIds: string[] = [];
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const userId = session.user.id;
    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!PAYSLIP_PUBLISH_ROLES.includes(role as (typeof PAYSLIP_PUBLISH_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para publicar nóminas" };
    }

    if (itemIds.length === 0) {
      return { success: false, error: "No se especificaron items para publicar" };
    }

    // Obtener los items seleccionados
    const items = await prisma.payslipUploadItem.findMany({
      where: {
        id: { in: itemIds },
        orgId,
        status: "READY",
        employeeId: { not: null },
      },
      include: {
        employee: true,
        batch: true,
      },
    });

    if (items.length === 0) {
      return { success: false, error: "No se encontraron items válidos para publicar" };
    }

    // Verificar cuota de almacenamiento antes de publicar
    // Estimación conservadora: 1MB por nómina (mejor rechazar de más que exceder cuota)
    const ESTIMATED_SIZE_PER_PAYSLIP = 1024 * 1024; // 1MB
    const estimatedTotalSize = BigInt(items.length * ESTIMATED_SIZE_PER_PAYSLIP);
    try {
      const quota = await getOrgStorageQuota(orgId);
      if (quota.availableBytes < estimatedTotalSize) {
        return {
          success: false,
          error: `No hay espacio de almacenamiento suficiente para publicar ${items.length} nóminas. Contacta con tu administrador.`,
        };
      }
    } catch (quotaError) {
      // Si falla la verificación de cuota, continuar (no bloquear por error técnico)
      console.warn("[publishItems] Error verificando cuota, continuando:", quotaError);
    }

    const batchSelection = new Map<string, number>();
    items.forEach((item) => {
      batchSelection.set(item.batchId, (batchSelection.get(item.batchId) ?? 0) + 1);
    });
    selectionBatchIds = Array.from(batchSelection.keys());
    for (const [batchId, count] of batchSelection) {
      await logBatchEvent(batchId, "PUBLISH_PARTIAL_STARTED", "Publicación parcial iniciada", {
        selectedCount: count,
      });
    }

    let publishedCount = 0;
    let skippedCount = 0;
    const now = new Date();
    const batchUpdates: Map<string, number> = new Map();
    const batchStats: Map<string, { published: number; skipped: number }> = new Map();

    for (const item of items) {
      if (!item.employeeId || !item.employee) {
        skippedCount++;
        continue;
      }

      try {
        // 1. Mover archivo de temporal a definitivo
        const movedFile = await documentStorageService.movePayslipToFinal(
          orgId,
          item.employeeId,
          item.tempFilePath,
          item.originalFileName ?? `nomina_${item.id}.pdf`,
        );

        // 2. Crear EmployeeDocument
        await prisma.$transaction(async (tx) => {
          const storedFile = await registerStoredFile({
            orgId,
            employeeId: item.employeeId!,
            path: movedFile.path,
            sizeBytes: movedFile.size ?? 0,
            mimeType: "application/pdf",
            category: FileCategory.PAYROLL,
            retentionPolicy: RetentionPolicy.PAYROLL,
            tx,
          });

          const document = await tx.employeeDocument.create({
            data: {
              employeeId: item.employeeId!,
              orgId,
              kind: "PAYSLIP",
              fileName: movedFile.fileName,
              storageUrl: movedFile.path,
              fileSize: movedFile.size ?? 0,
              mimeType: "application/pdf",
              payslipMonth: item.batch.month,
              payslipYear: item.batch.year,
              uploadedById: userId,
              storedFileId: storedFile.id,
            },
          });

          await tx.payslipUploadItem.update({
            where: { id: item.id },
            data: {
              status: "PUBLISHED",
              documentId: document.id,
              publishedAt: now,
              publishedById: userId,
            },
          });
        });

        // 3. Enviar notificación
        if (item.employee.userId) {
          const monthName = item.batch.month ? MONTH_NAMES[item.batch.month - 1] : "";
          const yearStr = item.batch.year ? item.batch.year.toString() : "";
          const title = monthName && yearStr ? `Nómina de ${monthName} ${yearStr}` : "Nueva nómina disponible";

          await createNotification(
            item.employee.userId,
            orgId,
            "PAYSLIP_AVAILABLE",
            title,
            "Tu nómina ya está disponible en tu portal de empleado.",
          );
        }

        // Acumular actualizaciones por batch
        const currentCount = batchUpdates.get(item.batchId) ?? 0;
        batchUpdates.set(item.batchId, currentCount + 1);
        const currentStats = batchStats.get(item.batchId) ?? { published: 0, skipped: 0 };
        currentStats.published += 1;
        batchStats.set(item.batchId, currentStats);

        publishedCount++;
      } catch (itemError) {
        console.error(`Error publicando item ${item.id}:`, itemError);
        skippedCount++;
        const currentStats = batchStats.get(item.batchId) ?? { published: 0, skipped: 0 };
        currentStats.skipped += 1;
        batchStats.set(item.batchId, currentStats);
      }
    }

    // 4. Actualizar contadores de cada batch afectado
    for (const [batchId, count] of batchUpdates) {
      await prisma.payslipBatch.update({
        where: { id: batchId },
        data: {
          readyCount: { decrement: count },
          publishedCount: { increment: count },
        },
      });
      await updateBatchStatus(batchId);
      const stats = batchStats.get(batchId);
      await logBatchEvent(batchId, "PUBLISH_PARTIAL_COMPLETED", "Publicación parcial finalizada", {
        publishedCount: stats?.published ?? count,
        skippedCount: stats?.skipped ?? 0,
      });
      revalidatePath(`/dashboard/payslips/${batchId}`);
    }

    revalidatePath("/dashboard/payslips");

    return {
      success: true,
      publishedCount,
      skippedCount,
    };
  } catch (error) {
    console.error("Error al publicar items:", error);
    for (const batchId of selectionBatchIds ?? []) {
      await logBatchEvent(
        batchId,
        "PUBLISH_ERROR",
        error instanceof Error ? error.message : "Error al publicar selección",
      );
    }
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Revoca un item específico que ya fue publicado
 *
 * Esto:
 * 1. Marca el documento como revocado (isRevoked = true)
 * 2. Actualiza el estado del item a REVOKED
 * 3. NO elimina el archivo ni el documento (para auditoría)
 * 4. NO notifica al empleado (decisión del plan: revocación silenciosa)
 */
export async function revokePayslipItem(
  itemId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const userId = session.user.id;
    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!PAYSLIP_REVOKE_ROLES.includes(role as (typeof PAYSLIP_REVOKE_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para revocar nóminas" };
    }

    const item = await prisma.payslipUploadItem.findFirst({
      where: { id: itemId, orgId },
      include: { document: true },
    });

    if (!item) {
      return { success: false, error: "Item no encontrado" };
    }

    // Solo se pueden revocar items publicados
    if (item.status !== "PUBLISHED") {
      return { success: false, error: "Solo se pueden revocar nóminas ya publicadas" };
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Marcar documento como revocado
      if (item.documentId) {
        await tx.employeeDocument.update({
          where: { id: item.documentId },
          data: {
            isRevoked: true,
            revokedAt: now,
            revokedById: userId,
            revokeReason: reason ?? null,
          },
        });
      }

      // 2. Actualizar item a REVOKED
      await tx.payslipUploadItem.update({
        where: { id: itemId },
        data: {
          status: "REVOKED",
          revokedAt: now,
          revokedById: userId,
          revokeReason: reason ?? null,
        },
      });

      // 3. Actualizar contadores del batch
      await tx.payslipBatch.update({
        where: { id: item.batchId },
        data: {
          publishedCount: { decrement: 1 },
          revokedCount: { increment: 1 },
        },
      });
    });

    await updateBatchStatus(item.batchId);
    await logBatchEvent(item.batchId, "ITEM_REVOKED", "Nómina revocada", {
      itemId,
      reason: reason ?? null,
    });

    revalidatePath(`/dashboard/payslips/${item.batchId}`);
    revalidatePath("/dashboard/payslips");

    return { success: true };
  } catch (error) {
    console.error("Error al revocar item:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

/**
 * Revoca todo un lote (todos los items publicados)
 */
export async function revokeBatch(
  batchId: string,
  reason?: string,
): Promise<{ success: boolean; revokedCount?: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const userId = session.user.id;
    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!PAYSLIP_REVOKE_ROLES.includes(role as (typeof PAYSLIP_REVOKE_ROLES)[number])) {
      return { success: false, error: "No tienes permisos para revocar nóminas" };
    }

    const batch = await prisma.payslipBatch.findFirst({
      where: { id: batchId, orgId },
    });

    if (!batch) {
      return { success: false, error: "Lote no encontrado" };
    }

    // Obtener todos los items publicados
    const publishedItems = await prisma.payslipUploadItem.findMany({
      where: {
        batchId,
        status: "PUBLISHED",
      },
    });

    if (publishedItems.length === 0) {
      return { success: false, error: "No hay nóminas publicadas para revocar" };
    }

    const now = new Date();
    let revokedCount = 0;

    for (const item of publishedItems) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Marcar documento como revocado
          if (item.documentId) {
            await tx.employeeDocument.update({
              where: { id: item.documentId },
              data: {
                isRevoked: true,
                revokedAt: now,
                revokedById: userId,
                revokeReason: reason ?? null,
              },
            });
          }

          // 2. Actualizar item a REVOKED
          await tx.payslipUploadItem.update({
            where: { id: item.id },
            data: {
              status: "REVOKED",
              revokedAt: now,
              revokedById: userId,
              revokeReason: reason ?? null,
            },
          });
        });
        revokedCount++;
      } catch (itemError) {
        console.error(`Error revocando item ${item.id}:`, itemError);
      }
    }

    // Actualizar contadores del batch
    await prisma.payslipBatch.update({
      where: { id: batchId },
      data: {
        publishedCount: { decrement: revokedCount },
        revokedCount: { increment: revokedCount },
        revokedAt: now,
        revokedById: userId,
        revokeReason: reason ?? null,
        status: "CANCELLED",
      },
    });

    await logBatchEvent(batchId, "BATCH_REVOKED", "Lote revocado", {
      revokedCount,
      reason: reason ?? null,
    });

    revalidatePath(`/dashboard/payslips/${batchId}`);
    revalidatePath("/dashboard/payslips");

    return { success: true, revokedCount };
  } catch (error) {
    console.error("Error al revocar lote:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

// ============================================
// SERVER ACTIONS: SUBIDA INDIVIDUAL DE NÓMINA
// ============================================

/**
 * Sube una nómina individual para un empleado específico
 *
 * Flujo:
 * 1. Validar permisos HR/Admin
 * 2. Validar empleado activo
 * 3. Crear PayslipBatch con kind = MANUAL_SINGLE
 * 4. Crear PayslipUploadItem
 * 5. Si publishNow: publicar inmediatamente
 */
export async function uploadSinglePayslip(input: {
  employeeId: string;
  year: number;
  month: number;
  label?: string;
  fileBuffer: ArrayBuffer;
  fileName: string;
  publishNow?: boolean;
}): Promise<{ success: boolean; batchId?: string; documentId?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "No autorizado" };
    }

    const userId = session.user.id;
    const orgId = session.user.orgId;
    const role = session.user.role;

    if (!(await isPayslipAdmin(role))) {
      return { success: false, error: "No tienes permisos para subir nóminas" };
    }

    if (!input.month || input.month < 1 || input.month > 12 || !input.year || input.year < 1900) {
      return { success: false, error: "Mes o año inválidos" };
    }

    // 1. Validar empleado
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, orgId },
    });

    if (!employee) {
      return { success: false, error: "Empleado no encontrado" };
    }

    if (!employee.active) {
      return { success: false, error: "No se puede subir nómina a un empleado inactivo" };
    }

    // 2. Crear batch con kind = MANUAL_SINGLE
    const batch = await prisma.payslipBatch.create({
      data: {
        orgId,
        uploadedById: userId,
        originalFileName: input.fileName,
        originalFileType: "PDF_MULTIPAGE",
        kind: "MANUAL_SINGLE",
        month: input.month,
        year: input.year,
        label: input.label ?? null,
        totalFiles: 1,
        readyCount: input.publishNow ? 0 : 1,
        publishedCount: input.publishNow ? 1 : 0,
        pendingCount: 0,
        blockedInactive: 0,
        errorCount: 0,
        assignedCount: 0,
        revokedCount: 0,
        status: input.publishNow ? "COMPLETED" : "READY_TO_PUBLISH",
      },
    });
    await logBatchEvent(batch.id, "BATCH_CREATED", "Nómina individual creada", {
      employeeId: input.employeeId,
      month: input.month,
      year: input.year,
      publishNow: input.publishNow ?? false,
      label: input.label ?? null,
    });

    const buffer = Buffer.from(input.fileBuffer);
    const now = new Date();
    let documentId: string | null = null;

    if (input.publishNow) {
      // 3a. Subir directamente a ubicación final y crear documento
      const uploadResult = await documentStorageService.uploadPayslipFinalFile(
        orgId,
        input.employeeId,
        input.fileName,
        buffer,
      );

      const fileSize = uploadResult.size ?? buffer.length;

      const document = await prisma.$transaction(async (tx) => {
        const storedFile = await registerStoredFile({
          orgId,
          employeeId: input.employeeId,
          path: uploadResult.path,
          sizeBytes: fileSize,
          mimeType: "application/pdf",
          category: FileCategory.PAYROLL,
          retentionPolicy: RetentionPolicy.PAYROLL,
          tx,
        });

        return tx.employeeDocument.create({
          data: {
            employeeId: input.employeeId,
            orgId,
            kind: "PAYSLIP",
            fileName: uploadResult.fileName,
            storageUrl: uploadResult.path,
            fileSize,
            mimeType: "application/pdf",
            payslipMonth: input.month,
            payslipYear: input.year,
            uploadedById: userId,
            storedFileId: storedFile.id,
          },
        });
      });

      documentId = document.id;

      // Crear item con estado PUBLISHED
      await prisma.payslipUploadItem.create({
        data: {
          batchId: batch.id,
          orgId,
          tempFilePath: uploadResult.path,
          originalFileName: input.fileName,
          status: "PUBLISHED",
          employeeId: input.employeeId,
          documentId: document.id,
          isAutoMatched: false,
          confidenceScore: 1,
          assignedAt: now,
          assignedById: userId,
          publishedAt: now,
          publishedById: userId,
        },
      });
      await logBatchEvent(batch.id, "ITEM_PUBLISHED", "Nómina individual publicada", {
        employeeId: input.employeeId,
      });

      // Actualizar batch como publicado
      await prisma.payslipBatch.update({
        where: { id: batch.id },
        data: {
          publishedAt: now,
          publishedById: userId,
        },
      });

      // Enviar notificación
      if (employee.userId) {
        const monthName = MONTH_NAMES[input.month - 1];
        await createNotification(
          employee.userId,
          orgId,
          "PAYSLIP_AVAILABLE",
          `Nómina de ${monthName} ${input.year}`,
          "Tu nómina ya está disponible en tu portal de empleado.",
        );
      }
    } else {
      // 3b. Subir a ubicación temporal, crear item como READY
      const uploadResult = await documentStorageService.uploadPayslipTempFile(orgId, batch.id, input.fileName, buffer);

      // Crear item con estado READY
      await prisma.payslipUploadItem.create({
        data: {
          batchId: batch.id,
          orgId,
          tempFilePath: uploadResult.path,
          originalFileName: input.fileName,
          status: "READY",
          employeeId: input.employeeId,
          isAutoMatched: false,
          confidenceScore: 1,
          assignedAt: now,
          assignedById: userId,
        },
      });
      await logBatchEvent(batch.id, "ITEM_READY", "Nómina individual lista para publicar", {
        employeeId: input.employeeId,
      });
    }

    revalidatePath("/dashboard/payslips");
    revalidatePath(`/dashboard/employees/${input.employeeId}`);

    return {
      success: true,
      batchId: batch.id,
      documentId: documentId ?? undefined,
    };
  } catch (error) {
    console.error("Error al subir nómina individual:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}
