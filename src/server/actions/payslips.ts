"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { PAYSLIP_ADMIN_ROLES } from "@/lib/payslip/config";
import { prisma } from "@/lib/prisma";

// ============================================
// TIPOS
// ============================================

export type PayslipBatchListItem = {
  id: string;
  month: number | null;
  year: number | null;
  originalFileName: string;
  originalFileType: string;
  totalFiles: number;
  assignedCount: number;
  pendingCount: number;
  errorCount: number;
  status: string;
  createdAt: Date;
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
  status: string;
  errorMessage: string | null;
  employeeId: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string | null;
    employeeNumber: string | null;
  } | null;
  documentId: string | null;
  createdAt: Date;
  assignedAt: Date | null;
  assignedById: string | null;
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
      ...(status && { status: status as "PROCESSING" | "REVIEW" | "COMPLETED" | "PARTIAL" | "ERROR" }),
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
        originalFileName: b.originalFileName,
        originalFileType: b.originalFileType,
        totalFiles: b.totalFiles,
        assignedCount: b.assignedCount,
        pendingCount: b.pendingCount,
        errorCount: b.errorCount,
        status: b.status,
        createdAt: b.createdAt,
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

    const itemWhere = {
      batchId,
      ...(status && { status: status as "PENDING" | "ASSIGNED" | "ERROR" | "SKIPPED" }),
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
              dni: true,
              employeeNumber: true,
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
        originalFileName: batch.originalFileName,
        originalFileType: batch.originalFileType,
        totalFiles: batch.totalFiles,
        assignedCount: batch.assignedCount,
        pendingCount: batch.pendingCount,
        errorCount: batch.errorCount,
        status: batch.status,
        createdAt: batch.createdAt,
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
        status: item.status,
        errorMessage: item.errorMessage,
        employeeId: item.employeeId,
        employee: item.employee,
        documentId: item.documentId,
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

/**
 * Asigna un item de nómina a un empleado
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

    if (item.status === "ASSIGNED") {
      return { success: false, error: "Este item ya está asignado" };
    }

    // Verificar que el empleado existe y pertenece a la organización
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, orgId },
    });

    if (!employee) {
      return { success: false, error: "Empleado no encontrado" };
    }

    // Actualizar item
    await prisma.payslipUploadItem.update({
      where: { id: itemId },
      data: {
        employeeId,
        status: "ASSIGNED",
        assignedAt: new Date(),
        assignedById: userId,
      },
    });

    // Actualizar contadores del batch
    await prisma.payslipBatch.update({
      where: { id: item.batchId },
      data: {
        assignedCount: { increment: 1 },
        pendingCount: { decrement: 1 },
      },
    });

    // Actualizar estado del batch si es necesario
    await updateBatchStatus(item.batchId);

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

    if (item.status !== "PENDING" && item.status !== "ERROR") {
      return { success: false, error: "Solo se pueden saltar items pendientes o con error" };
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
        pendingCount: previousStatus === "PENDING" ? { decrement: 1 } : undefined,
        errorCount: previousStatus === "ERROR" ? { decrement: 1 } : undefined,
      },
    });

    await updateBatchStatus(item.batchId);

    revalidatePath(`/dashboard/payslips/${item.batchId}`);

    return { success: true };
  } catch (error) {
    console.error("Error al saltar item:", error);
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

    // Marcar como pendiente para reprocesamiento
    await prisma.payslipUploadItem.update({
      where: { id: itemId },
      data: {
        status: "PENDING",
        errorMessage: null,
        detectedDni: null,
        detectedName: null,
        detectedCode: null,
        confidenceScore: 0,
      },
    });

    // Aquí se debería disparar el reprocesamiento async
    // Por ahora solo marca como pendiente

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

    const userId = session.user.id;
    const orgId = session.user.orgId;

    // Obtener el empleado asociado al usuario
    const employee = await prisma.employee.findFirst({
      where: { userId, orgId },
    });

    if (!employee) {
      return { success: false, error: "No tienes un perfil de empleado asociado" };
    }

    const { year, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where = {
      employeeId: employee.id,
      orgId,
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

    const userId = session.user.id;
    const orgId = session.user.orgId;

    const employee = await prisma.employee.findFirst({
      where: { userId, orgId },
    });

    if (!employee) {
      return { success: false, error: "No tienes un perfil de empleado asociado" };
    }

    const payslips = await prisma.employeeDocument.findMany({
      where: {
        employeeId: employee.id,
        orgId,
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
    console.error("Error al obtener años de nóminas:", error);
    return { success: false, error: "Error interno del servidor" };
  }
}

// ============================================
// HELPERS INTERNOS
// ============================================

/**
 * Actualiza el estado de un batch basándose en sus items
 */
async function updateBatchStatus(batchId: string): Promise<void> {
  const batch = await prisma.payslipBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) return;

  let newStatus = batch.status;

  if (batch.errorCount > 0 && batch.pendingCount === 0 && batch.assignedCount === 0) {
    newStatus = "ERROR";
  } else if (batch.pendingCount === 0 && batch.errorCount === 0) {
    newStatus = "COMPLETED";
  } else if (batch.assignedCount > 0 && (batch.pendingCount > 0 || batch.errorCount > 0)) {
    newStatus = "PARTIAL";
  } else if (batch.pendingCount > 0) {
    newStatus = "REVIEW";
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
  employees?: { id: string; firstName: string; lastName: string; dni: string | null; employeeNumber: string | null }[];
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
          { dni: { contains: query, mode: "insensitive" } },
          { employeeNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dni: true,
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
