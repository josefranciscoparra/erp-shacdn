"use server";

import { revalidatePath } from "next/cache";

import type {
  WhistleblowingStatus,
  WhistleblowingPriority,
  ReporterType,
  ResolutionType,
  WhistleblowingActivityType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { encryptJson, decryptJson } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

// ========================================
// TIPOS
// ========================================

export type WhistleblowingReportSummary = {
  id: string;
  trackingCode: string;
  title: string;
  reporterType: ReporterType;
  reporterDisplayLabel: string | null;
  status: WhistleblowingStatus;
  priority: WhistleblowingPriority;
  categoryName: string;
  submittedAt: Date;
  assignedToName: string | null;
};

export type WhistleblowingReportDetail = {
  id: string;
  trackingCode: string;
  title: string;
  description: string;
  reporterType: ReporterType;
  reporterDisplayLabel: string | null;
  incidentDate: Date | null;
  incidentLocation: string | null;
  status: WhistleblowingStatus;
  priority: WhistleblowingPriority;
  resolution: string | null;
  resolutionType: ResolutionType | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  submittedAt: Date;
  createdAt: Date;
  // Relaciones
  category: { id: string; name: string };
  assignedTo: { id: string; name: string | null; image: string | null } | null;
  resolvedBy: { id: string; name: string | null } | null;
  closedBy: { id: string; name: string | null } | null;
  employee: { id: string; firstName: string; lastName: string } | null;
  documents: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
  }>;
  activities: Array<{
    id: string;
    type: WhistleblowingActivityType;
    description: string;
    oldValue: string | null;
    newValue: string | null;
    performedAt: Date;
    performedBy: { id: string; name: string | null } | null;
  }>;
  // Datos sensibles descifrados (solo para gestores)
  involvedParties: string[] | null;
  reporterMetadata: Record<string, string> | null;
};

export type WhistleblowingCategory = {
  id: string;
  name: string;
  description: string | null;
  requiresEvidence: boolean;
};

// ========================================
// HELPERS
// ========================================

/**
 * Genera un código de seguimiento único: WB-YYYYMMDD-XXXXX
 */
function generateTrackingCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `WB-${dateStr}-${random}`;
}

/**
 * Genera un código de acceso de 8 caracteres alfanuméricos
 */
function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin I, O, 0, 1 para evitar confusiones
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Verifica si el usuario tiene permiso de gestión de denuncias
 */
async function checkWhistleblowingPermission(userId: string, orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { whistleblowingManagerIds: true },
  });

  if (!org) return false;
  return org.whistleblowingManagerIds.includes(userId);
}

/**
 * Registra una actividad en el historial de la denuncia
 */
async function logActivity(
  reportId: string,
  type: WhistleblowingActivityType,
  description: string,
  performedById: string | null,
  oldValue?: string | null,
  newValue?: string | null,
  ipAddress?: string | null,
) {
  await prisma.whistleblowingActivity.create({
    data: {
      reportId,
      type,
      description,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
      performedById,
      ipAddress,
    },
  });
}

// ========================================
// ACCIONES PÚBLICAS (Información de Organización)
// ========================================

export type PublicOrganizationInfo = {
  id: string;
  name: string;
  whistleblowingEnabled: boolean;
};

/**
 * Obtiene información pública de una organización por su slug de whistleblowing
 * (No requiere autenticación - para portal público)
 */
export async function getOrganizationByPublicSlug(
  slug: string,
): Promise<{ success: boolean; organization?: PublicOrganizationInfo; error?: string }> {
  try {
    const org = await prisma.organization.findFirst({
      where: {
        whistleblowingPublicSlug: slug,
        whistleblowingEnabled: true,
      },
      select: {
        id: true,
        name: true,
        whistleblowingEnabled: true,
      },
    });

    if (!org) {
      return { success: false, error: "Organización no encontrada o canal no habilitado" };
    }

    return {
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        whistleblowingEnabled: org.whistleblowingEnabled,
      },
    };
  } catch (error) {
    console.error("Error obteniendo organización:", error);
    return { success: false, error: "Error al obtener información" };
  }
}

/**
 * Obtiene categorías públicas por slug de organización (sin autenticación)
 */
export async function getPublicWhistleblowingCategories(
  slug: string,
): Promise<{ success: boolean; categories: WhistleblowingCategory[]; error?: string }> {
  try {
    const org = await prisma.organization.findFirst({
      where: {
        whistleblowingPublicSlug: slug,
        whistleblowingEnabled: true,
      },
      select: { id: true },
    });

    if (!org) {
      return { success: false, categories: [], error: "Organización no encontrada" };
    }

    const categories = await prisma.whistleblowingCategory.findMany({
      where: {
        orgId: org.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        requiresEvidence: true,
      },
      orderBy: { order: "asc" },
    });

    return { success: true, categories };
  } catch (error) {
    console.error("Error obteniendo categorías públicas:", error);
    return { success: false, categories: [], error: "Error al obtener categorías" };
  }
}

// ========================================
// ACCIONES PÚBLICAS (Categorías - Autenticado)
// ========================================

/**
 * Obtiene las categorías activas de denuncia para una organización
 */
export async function getWhistleblowingCategories(
  orgId?: string,
): Promise<{ success: boolean; categories: WhistleblowingCategory[]; error?: string }> {
  try {
    const session = await auth();
    const effectiveOrgId = orgId ?? session?.user?.orgId;

    if (!effectiveOrgId) {
      return { success: false, categories: [], error: "Organización no encontrada" };
    }

    const categories = await prisma.whistleblowingCategory.findMany({
      where: {
        orgId: effectiveOrgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        requiresEvidence: true,
      },
      orderBy: { order: "asc" },
    });

    return { success: true, categories };
  } catch (error) {
    console.error("Error obteniendo categorías:", error);
    return { success: false, categories: [], error: "Error al obtener categorías" };
  }
}

// ========================================
// ACCIONES PÚBLICAS (Crear denuncias)
// ========================================

export type CreateReportInput = {
  categoryId: string;
  title: string;
  description: string;
  incidentDate?: Date | null;
  incidentLocation?: string | null;
  involvedParties?: string[];
  reporterMetadata?: Record<string, string>;
};

/**
 * Crea una denuncia como empleado autenticado
 */
export async function createWhistleblowingReport(
  data: CreateReportInput,
): Promise<{ success: boolean; trackingCode?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar que la organización tiene habilitado el canal
    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { whistleblowingEnabled: true },
    });

    if (!org?.whistleblowingEnabled) {
      return { success: false, error: "El canal de denuncias no está habilitado" };
    }

    // Obtener el empleado del usuario
    const employee = await prisma.employee.findFirst({
      where: {
        userId: session.user.id,
        orgId: session.user.orgId,
      },
      select: { id: true },
    });

    const trackingCode = generateTrackingCode();

    // Cifrar datos sensibles
    const encryptedInvolvedParties = data.involvedParties?.length ? encryptJson(data.involvedParties) : null;
    const encryptedMetadata = data.reporterMetadata ? encryptJson(data.reporterMetadata) : null;

    const report = await prisma.whistleblowingReport.create({
      data: {
        trackingCode,
        reporterType: "EMPLOYEE",
        reporterDisplayLabel: "Empleado interno",
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        incidentDate: data.incidentDate,
        incidentLocation: data.incidentLocation,
        involvedParties: encryptedInvolvedParties,
        reporterMetadata: encryptedMetadata,
        employeeId: employee?.id,
        orgId: session.user.orgId,
      },
    });

    // Registrar actividad
    await logActivity(report.id, "CREATED", "Denuncia creada por empleado interno", session.user.id);

    revalidatePath("/dashboard/whistleblowing");
    return { success: true, trackingCode };
  } catch (error) {
    console.error("Error creando denuncia:", error);
    return { success: false, error: "Error al crear la denuncia" };
  }
}

/**
 * Crea una denuncia anónima desde el portal público
 */
export async function createAnonymousReport(
  orgSlug: string,
  data: CreateReportInput & { reporterType: "EXTERNAL" | "ANONYMOUS" },
): Promise<{
  success: boolean;
  trackingCode?: string;
  accessCode?: string;
  error?: string;
}> {
  try {
    // Buscar organización por slug público
    const org = await prisma.organization.findFirst({
      where: {
        whistleblowingPublicSlug: orgSlug,
        whistleblowingEnabled: true,
      },
      select: { id: true },
    });

    if (!org) {
      return { success: false, error: "Organización no encontrada o canal no habilitado" };
    }

    const trackingCode = generateTrackingCode();
    const accessCode = generateAccessCode();
    const accessCodeHash = await bcrypt.hash(accessCode, 10);

    // Cifrar datos sensibles
    const encryptedInvolvedParties = data.involvedParties?.length ? encryptJson(data.involvedParties) : null;
    const encryptedMetadata = data.reporterMetadata ? encryptJson(data.reporterMetadata) : null;

    const reporterLabel = data.reporterType === "ANONYMOUS" ? "Anónimo" : "Externo (proveedor/cliente)";

    const report = await prisma.whistleblowingReport.create({
      data: {
        trackingCode,
        accessCodeHash,
        reporterType: data.reporterType,
        reporterDisplayLabel: reporterLabel,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        incidentDate: data.incidentDate,
        incidentLocation: data.incidentLocation,
        involvedParties: encryptedInvolvedParties,
        reporterMetadata: encryptedMetadata,
        orgId: org.id,
      },
    });

    // Registrar actividad (sin usuario)
    await logActivity(report.id, "CREATED", `Denuncia creada como ${reporterLabel}`, null);

    return { success: true, trackingCode, accessCode };
  } catch (error) {
    console.error("Error creando denuncia anónima:", error);
    return { success: false, error: "Error al crear la denuncia" };
  }
}

/**
 * Consulta el estado de una denuncia con código de seguimiento y acceso
 */
export async function checkAnonymousReportStatus(
  trackingCode: string,
  accessCode: string,
): Promise<{
  success: boolean;
  status?: WhistleblowingStatus;
  statusLabel?: string;
  error?: string;
}> {
  try {
    const report = await prisma.whistleblowingReport.findUnique({
      where: { trackingCode },
      select: {
        accessCodeHash: true,
        status: true,
      },
    });

    if (!report || !report.accessCodeHash) {
      return { success: false, error: "Denuncia no encontrada" };
    }

    const isValid = await bcrypt.compare(accessCode, report.accessCodeHash);
    if (!isValid) {
      return { success: false, error: "Código de acceso incorrecto" };
    }

    const statusLabels: Record<WhistleblowingStatus, string> = {
      SUBMITTED: "Recibida - Pendiente de revisión",
      IN_REVIEW: "En investigación",
      RESOLVED: "Resuelta",
      CLOSED: "Cerrada",
    };

    return {
      success: true,
      status: report.status,
      statusLabel: statusLabels[report.status],
    };
  } catch (error) {
    console.error("Error verificando estado:", error);
    return { success: false, error: "Error al verificar el estado" };
  }
}

// ========================================
// ACCIONES DE GESTIÓN (requieren permiso)
// ========================================

export type GetReportsFilters = {
  status?: WhistleblowingStatus;
  priority?: WhistleblowingPriority;
  categoryId?: string;
  search?: string;
};

/**
 * Obtiene la lista de denuncias para gestión
 */
export async function getWhistleblowingReports(
  filters?: GetReportsFilters,
): Promise<{ success: boolean; reports: WhistleblowingReportSummary[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, reports: [], error: "No autenticado" };
    }

    // Verificar permiso
    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, reports: [], error: "Sin permiso de gestión" };
    }

    const where: Record<string, unknown> = {
      orgId: session.user.orgId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.search) {
      where.OR = [
        { trackingCode: { contains: filters.search, mode: "insensitive" } },
        { title: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const reports = await prisma.whistleblowingReport.findMany({
      where,
      select: {
        id: true,
        trackingCode: true,
        title: true,
        reporterType: true,
        reporterDisplayLabel: true,
        status: true,
        priority: true,
        submittedAt: true,
        category: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return {
      success: true,
      reports: reports.map((r) => ({
        id: r.id,
        trackingCode: r.trackingCode,
        title: r.title,
        reporterType: r.reporterType,
        reporterDisplayLabel: r.reporterDisplayLabel,
        status: r.status,
        priority: r.priority,
        categoryName: r.category.name,
        submittedAt: r.submittedAt,
        assignedToName: r.assignedTo?.name ?? null,
      })),
    };
  } catch (error) {
    console.error("Error obteniendo denuncias:", error);
    return { success: false, reports: [], error: "Error al obtener denuncias" };
  }
}

/**
 * Obtiene el detalle completo de una denuncia
 */
export async function getWhistleblowingReportDetail(
  reportId: string,
): Promise<{ success: boolean; report?: WhistleblowingReportDetail; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    // Verificar permiso
    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, error: "Sin permiso de gestión" };
    }

    const report = await prisma.whistleblowingReport.findFirst({
      where: {
        id: reportId,
        orgId: session.user.orgId,
      },
      include: {
        category: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, image: true } },
        resolvedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: "desc" },
        },
        activities: {
          select: {
            id: true,
            type: true,
            description: true,
            oldValue: true,
            newValue: true,
            performedAt: true,
            performedBy: { select: { id: true, name: true } },
          },
          orderBy: { performedAt: "desc" },
        },
      },
    });

    if (!report) {
      return { success: false, error: "Denuncia no encontrada" };
    }

    // Descifrar datos sensibles (solo si NO es anónimo o si el gestor tiene acceso)
    let involvedParties: string[] | null = null;
    let reporterMetadata: Record<string, string> | null = null;

    // Para denuncias anónimas, NO mostrar metadata aunque exista
    if (report.reporterType !== "ANONYMOUS") {
      involvedParties = decryptJson<string[]>(report.involvedParties);
      reporterMetadata = decryptJson<Record<string, string>>(report.reporterMetadata);
    }

    return {
      success: true,
      report: {
        id: report.id,
        trackingCode: report.trackingCode,
        title: report.title,
        description: report.description,
        reporterType: report.reporterType,
        reporterDisplayLabel: report.reporterDisplayLabel,
        incidentDate: report.incidentDate,
        incidentLocation: report.incidentLocation,
        status: report.status,
        priority: report.priority,
        resolution: report.resolution,
        resolutionType: report.resolutionType,
        resolvedAt: report.resolvedAt,
        closedAt: report.closedAt,
        submittedAt: report.submittedAt,
        createdAt: report.createdAt,
        category: report.category,
        assignedTo: report.assignedTo,
        resolvedBy: report.resolvedBy,
        closedBy: report.closedBy,
        employee: report.employee,
        documents: report.documents,
        activities: report.activities,
        involvedParties,
        reporterMetadata,
      },
    };
  } catch (error) {
    console.error("Error obteniendo detalle:", error);
    return { success: false, error: "Error al obtener detalle" };
  }
}

/**
 * Asigna un gestor a una denuncia
 */
export async function assignReportManager(
  reportId: string,
  managerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, error: "Sin permiso de gestión" };
    }

    // Verificar que el manager también tiene permiso
    const managerHasPermission = await checkWhistleblowingPermission(managerId, session.user.orgId);
    if (!managerHasPermission) {
      return { success: false, error: "El usuario seleccionado no es gestor" };
    }

    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { name: true },
    });

    await prisma.whistleblowingReport.update({
      where: { id: reportId },
      data: {
        assignedToId: managerId,
        assignedAt: new Date(),
      },
    });

    await logActivity(
      reportId,
      "ASSIGNED",
      `Asignado a ${manager?.name ?? "gestor"}`,
      session.user.id,
      null,
      manager?.name,
    );

    revalidatePath("/dashboard/whistleblowing");
    revalidatePath(`/dashboard/whistleblowing/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error("Error asignando gestor:", error);
    return { success: false, error: "Error al asignar gestor" };
  }
}

/**
 * Cambia el estado de una denuncia
 */
export async function updateReportStatus(
  reportId: string,
  status: WhistleblowingStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, error: "Sin permiso de gestión" };
    }

    const report = await prisma.whistleblowingReport.findFirst({
      where: { id: reportId, orgId: session.user.orgId },
      select: { status: true },
    });

    if (!report) {
      return { success: false, error: "Denuncia no encontrada" };
    }

    const statusLabels: Record<WhistleblowingStatus, string> = {
      SUBMITTED: "Enviada",
      IN_REVIEW: "En investigación",
      RESOLVED: "Resuelta",
      CLOSED: "Cerrada",
    };

    await prisma.whistleblowingReport.update({
      where: { id: reportId },
      data: { status },
    });

    await logActivity(
      reportId,
      "STATUS_CHANGED",
      `Estado cambiado a ${statusLabels[status]}`,
      session.user.id,
      statusLabels[report.status],
      statusLabels[status],
    );

    revalidatePath("/dashboard/whistleblowing");
    revalidatePath(`/dashboard/whistleblowing/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error("Error actualizando estado:", error);
    return { success: false, error: "Error al actualizar estado" };
  }
}

/**
 * Cambia la prioridad de una denuncia
 */
export async function updateReportPriority(
  reportId: string,
  priority: WhistleblowingPriority,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, error: "Sin permiso de gestión" };
    }

    const report = await prisma.whistleblowingReport.findFirst({
      where: { id: reportId, orgId: session.user.orgId },
      select: { priority: true },
    });

    if (!report) {
      return { success: false, error: "Denuncia no encontrada" };
    }

    await prisma.whistleblowingReport.update({
      where: { id: reportId },
      data: { priority },
    });

    await logActivity(
      reportId,
      "PRIORITY_CHANGED",
      `Prioridad cambiada a ${priority}`,
      session.user.id,
      report.priority,
      priority,
    );

    revalidatePath("/dashboard/whistleblowing");
    revalidatePath(`/dashboard/whistleblowing/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error("Error actualizando prioridad:", error);
    return { success: false, error: "Error al actualizar prioridad" };
  }
}

/**
 * Resuelve una denuncia con tipo de resolución y comentario
 */
export async function resolveReport(
  reportId: string,
  resolutionType: ResolutionType,
  resolution: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, error: "Sin permiso de gestión" };
    }

    const resolutionLabels: Record<ResolutionType, string> = {
      SUBSTANTIATED: "Fundada",
      UNSUBSTANTIATED: "No fundada",
      PARTIALLY_SUBSTANTIATED: "Parcialmente fundada",
      NO_ACTION: "Sin acción requerida",
    };

    await prisma.whistleblowingReport.update({
      where: { id: reportId },
      data: {
        status: "RESOLVED",
        resolutionType,
        resolution,
        resolvedAt: new Date(),
        resolvedById: session.user.id,
      },
    });

    await logActivity(
      reportId,
      "RESOLVED",
      `Resuelta como: ${resolutionLabels[resolutionType]}. ${resolution}`,
      session.user.id,
    );

    revalidatePath("/dashboard/whistleblowing");
    revalidatePath(`/dashboard/whistleblowing/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error("Error resolviendo denuncia:", error);
    return { success: false, error: "Error al resolver denuncia" };
  }
}

/**
 * Cierra una denuncia
 */
export async function closeReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, error: "Sin permiso de gestión" };
    }

    await prisma.whistleblowingReport.update({
      where: { id: reportId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: session.user.id,
      },
    });

    await logActivity(reportId, "CLOSED", "Denuncia cerrada", session.user.id);

    revalidatePath("/dashboard/whistleblowing");
    revalidatePath(`/dashboard/whistleblowing/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error("Error cerrando denuncia:", error);
    return { success: false, error: "Error al cerrar denuncia" };
  }
}

/**
 * Añade una nota interna a una denuncia (usando Activity)
 */
export async function addInternalNote(
  reportId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, error: "Sin permiso de gestión" };
    }

    await logActivity(reportId, "INTERNAL_NOTE", content, session.user.id);

    revalidatePath(`/dashboard/whistleblowing/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error("Error añadiendo nota:", error);
    return { success: false, error: "Error al añadir nota" };
  }
}

/**
 * Obtiene estadísticas básicas de denuncias
 */
export async function getWhistleblowingStats(): Promise<{
  success: boolean;
  stats?: {
    total: number;
    submitted: number;
    inReview: number;
    resolved: number;
    closed: number;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    const hasPermission = await checkWhistleblowingPermission(session.user.id, session.user.orgId);
    if (!hasPermission) {
      return { success: false, error: "Sin permiso de gestión" };
    }

    const counts = await prisma.whistleblowingReport.groupBy({
      by: ["status"],
      where: { orgId: session.user.orgId },
      _count: { status: true },
    });

    const stats = {
      total: 0,
      submitted: 0,
      inReview: 0,
      resolved: 0,
      closed: 0,
    };

    for (const c of counts) {
      const count = c._count.status;
      stats.total += count;
      switch (c.status) {
        case "SUBMITTED":
          stats.submitted = count;
          break;
        case "IN_REVIEW":
          stats.inReview = count;
          break;
        case "RESOLVED":
          stats.resolved = count;
          break;
        case "CLOSED":
          stats.closed = count;
          break;
      }
    }

    return { success: true, stats };
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return { success: false, error: "Error al obtener estadísticas" };
  }
}
// ========================================
// ACCIONES DE CONFIGURACIÓN (Settings)
// ========================================

export type WhistleblowingConfig = {
  enabled: boolean;
  publicSlug: string | null;
  managerIds: string[];
};

/**
 * Obtiene la configuración actual de whistleblowing para la organización
 */
export async function getOrganizationWhistleblowingConfig(): Promise<WhistleblowingConfig> {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("NO_AUTH");
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: {
      whistleblowingEnabled: true,
      whistleblowingPublicSlug: true,
      whistleblowingManagerIds: true,
    },
  });

  if (!org) {
    throw new Error("ORG_NOT_FOUND");
  }

  return {
    enabled: org.whistleblowingEnabled,
    publicSlug: org.whistleblowingPublicSlug,
    managerIds: org.whistleblowingManagerIds,
  };
}

/**
 * Activa o desactiva el canal de denuncias
 */
export async function updateOrganizationWhistleblowingStatus(enabled: boolean): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.orgId) {
    throw new Error("NO_AUTH");
  }

  // Verificar permiso manage_organization
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new Error("NO_PERMISSION");
  }

  // Si se está habilitando y no hay slug, generar uno
  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { whistleblowingPublicSlug: true, name: true },
  });

  const updateData: { whistleblowingEnabled: boolean; whistleblowingPublicSlug?: string } = {
    whistleblowingEnabled: enabled,
  };

  // Generar slug si no existe y se está habilitando
  if (enabled && !org?.whistleblowingPublicSlug) {
    const baseSlug = (org?.name ?? "org")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    updateData.whistleblowingPublicSlug = `${baseSlug}-${randomSuffix}`;
  }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: updateData,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Actualiza el slug público del canal de denuncias
 */
export async function updateWhistleblowingPublicSlug(slug: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.orgId) {
    throw new Error("NO_AUTH");
  }

  // Verificar permiso
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new Error("NO_PERMISSION");
  }

  // Validar formato del slug
  const cleanSlug = slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");

  if (cleanSlug.length < 3) {
    return { success: false, error: "El identificador debe tener al menos 3 caracteres" };
  }

  // Verificar que no exista ya
  const existing = await prisma.organization.findFirst({
    where: {
      whistleblowingPublicSlug: cleanSlug,
      NOT: { id: session.user.orgId },
    },
  });

  if (existing) {
    return { success: false, error: "Este identificador ya está en uso" };
  }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: { whistleblowingPublicSlug: cleanSlug },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Añade un gestor de whistleblowing
 */
export async function addWhistleblowingManager(userId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.orgId) {
    return { success: false, error: "No autenticado" };
  }

  // Verificar permiso
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || (currentUser.role !== "ORG_ADMIN" && currentUser.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Sin permisos" };
  }

  // Verificar que el usuario existe y pertenece a la organización
  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      orgId: session.user.orgId,
    },
  });

  if (!targetUser) {
    return { success: false, error: "Usuario no encontrado" };
  }

  // Obtener gestores actuales
  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { whistleblowingManagerIds: true },
  });

  if (!org) {
    return { success: false, error: "Organización no encontrada" };
  }

  if (org.whistleblowingManagerIds.includes(userId)) {
    return { success: false, error: "El usuario ya es gestor" };
  }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: {
      whistleblowingManagerIds: [...org.whistleblowingManagerIds, userId],
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Elimina un gestor de whistleblowing
 */
export async function removeWhistleblowingManager(userId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.orgId) {
    return { success: false, error: "No autenticado" };
  }

  // Verificar permiso
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!currentUser || (currentUser.role !== "ORG_ADMIN" && currentUser.role !== "SUPER_ADMIN")) {
    return { success: false, error: "Sin permisos" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { whistleblowingManagerIds: true },
  });

  if (!org) {
    return { success: false, error: "Organizacion no encontrada" };
  }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: {
      whistleblowingManagerIds: org.whistleblowingManagerIds.filter((id) => id !== userId),
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Tipo para manager de whistleblowing
 */
export type WhistleblowingManager = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/**
 * Obtiene los datos completos de los gestores de whistleblowing actuales
 */
export async function getWhistleblowingManagers(): Promise<{
  success: boolean;
  managers: WhistleblowingManager[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return { success: false, managers: [], error: "No autenticado" };
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { whistleblowingManagerIds: true },
    });

    if (!org) {
      return { success: false, managers: [], error: "Organizacion no encontrada" };
    }

    if (org.whistleblowingManagerIds.length === 0) {
      return { success: true, managers: [] };
    }

    const managers = await prisma.user.findMany({
      where: {
        id: { in: org.whistleblowingManagerIds },
        orgId: session.user.orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return { success: true, managers };
  } catch (error) {
    console.error("[getWhistleblowingManagers] Error:", error);
    return { success: false, managers: [], error: "Error al obtener gestores" };
  }
}

/**
 * Obtiene los usuarios disponibles para ser gestores (no son gestores actualmente)
 */
export async function getAvailableWhistleblowingManagers(): Promise<{
  success: boolean;
  users: WhistleblowingManager[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, users: [], error: "No autenticado" };
    }

    // Verificar permiso
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || (currentUser.role !== "ORG_ADMIN" && currentUser.role !== "SUPER_ADMIN")) {
      return { success: false, users: [], error: "Sin permisos" };
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { whistleblowingManagerIds: true },
    });

    if (!org) {
      return { success: false, users: [], error: "Organizacion no encontrada" };
    }

    // Obtener usuarios de la organizacion que no son gestores actualmente
    const users = await prisma.user.findMany({
      where: {
        orgId: session.user.orgId,
        id: { notIn: org.whistleblowingManagerIds },
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, users };
  } catch (error) {
    console.error("[getAvailableWhistleblowingManagers] Error:", error);
    return { success: false, users: [], error: "Error al obtener usuarios" };
  }
}

// ========================================
// ACCIONES PARA EMPLEADOS (Mis denuncias)
// ========================================

export type MyWhistleblowingReport = {
  id: string;
  trackingCode: string;
  title: string;
  status: WhistleblowingStatus;
  priority: WhistleblowingPriority;
  categoryName: string;
  submittedAt: Date;
};

export type MyWhistleblowingReportDetail = {
  id: string;
  trackingCode: string;
  title: string;
  description: string;
  status: WhistleblowingStatus;
  priority: WhistleblowingPriority;
  categoryName: string;
  incidentDate: Date | null;
  incidentLocation: string | null;
  submittedAt: Date;
  resolution: string | null;
  resolutionType: ResolutionType | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
};

/**
 * Obtiene las denuncias enviadas por el empleado autenticado
 */
export async function getMyWhistleblowingReports(): Promise<{
  success: boolean;
  reports: MyWhistleblowingReport[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, reports: [], error: "No autenticado" };
    }

    // Buscar el employeeId del usuario
    const employee = await prisma.employee.findFirst({
      where: {
        userId: session.user.id,
        orgId: session.user.orgId,
      },
      select: { id: true },
    });

    if (!employee) {
      return { success: false, reports: [], error: "No tienes perfil de empleado" };
    }

    const reports = await prisma.whistleblowingReport.findMany({
      where: {
        employeeId: employee.id,
        orgId: session.user.orgId,
      },
      select: {
        id: true,
        trackingCode: true,
        title: true,
        status: true,
        priority: true,
        submittedAt: true,
        category: {
          select: { name: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return {
      success: true,
      reports: reports.map((r) => ({
        id: r.id,
        trackingCode: r.trackingCode,
        title: r.title,
        status: r.status,
        priority: r.priority,
        categoryName: r.category.name,
        submittedAt: r.submittedAt,
      })),
    };
  } catch (error) {
    console.error("Error obteniendo mis denuncias:", error);
    return { success: false, reports: [], error: "Error al obtener denuncias" };
  }
}

/**
 * Obtiene el detalle de una denuncia específica del empleado autenticado
 */
export async function getMyWhistleblowingReportDetail(reportId: string): Promise<{
  success: boolean;
  report?: MyWhistleblowingReportDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return { success: false, error: "No autenticado" };
    }

    // Buscar el employeeId del usuario
    const employee = await prisma.employee.findFirst({
      where: {
        userId: session.user.id,
        orgId: session.user.orgId,
      },
      select: { id: true },
    });

    if (!employee) {
      return { success: false, error: "No tienes perfil de empleado" };
    }

    // Buscar la denuncia verificando que pertenece al empleado
    const report = await prisma.whistleblowingReport.findFirst({
      where: {
        id: reportId,
        employeeId: employee.id,
        orgId: session.user.orgId,
      },
      select: {
        id: true,
        trackingCode: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        incidentDate: true,
        incidentLocation: true,
        submittedAt: true,
        resolution: true,
        resolutionType: true,
        resolvedAt: true,
        closedAt: true,
        category: {
          select: { name: true },
        },
      },
    });

    if (!report) {
      return { success: false, error: "Denuncia no encontrada" };
    }

    return {
      success: true,
      report: {
        id: report.id,
        trackingCode: report.trackingCode,
        title: report.title,
        description: report.description,
        status: report.status,
        priority: report.priority,
        categoryName: report.category.name,
        incidentDate: report.incidentDate,
        incidentLocation: report.incidentLocation,
        submittedAt: report.submittedAt,
        resolution: report.resolution,
        resolutionType: report.resolutionType,
        resolvedAt: report.resolvedAt,
        closedAt: report.closedAt,
      },
    };
  } catch (error) {
    console.error("Error obteniendo detalle de mi denuncia:", error);
    return { success: false, error: "Error al obtener detalle" };
  }
}
