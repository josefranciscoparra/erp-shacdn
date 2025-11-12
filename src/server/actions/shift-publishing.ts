"use server";

import type { Shift, ShiftStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";
import { canUserPlanShifts, canUserApproveShifts } from "./shift-permissions";

/**
 * Información de validación antes de publicar
 */
export interface PublishValidation {
  canPublish: boolean;
  requiresApproval: boolean;
  errors: string[];
  warnings: string[];
  shifts: Array<{
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    status: ShiftStatus;
    coveragePercentage: number;
    hasIssues: boolean;
    issues: string[];
  }>;
}

/**
 * Resultado de publicación
 */
export interface PublishResult {
  success: boolean;
  publishedCount: number;
  pendingApprovalCount: number;
  failedCount: number;
  errors: string[];
  publishedIds: string[];
  pendingIds: string[];
}

/**
 * Validar turnos antes de publicar
 */
export async function validateBeforePublish(shiftIds: string[]): Promise<PublishValidation> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Obtener configuración
  const config = await prisma.shiftConfiguration.findUnique({
    where: { orgId: user.orgId },
  });

  const requiresApproval = config?.publishRequiresApproval ?? true;

  // Obtener turnos
  const shifts = await prisma.shift.findMany({
    where: {
      id: { in: shiftIds },
      orgId: user.orgId,
    },
    include: {
      assignments: true,
      position: true,
      costCenter: true,
    },
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const shiftsInfo: PublishValidation["shifts"] = [];

  // Validar cada turno
  for (const shift of shifts) {
    const issues: string[] = [];
    const coveragePercentage = (shift.assignments.length / shift.requiredHeadcount) * 100;

    // Verificar permisos
    const canPlan = await canUserPlanShifts(user.userId, shift.costCenterId);
    if (!canPlan) {
      errors.push(`No autorizado para publicar turno ${shift.id}`);
      continue;
    }

    // Verificar estado
    if (shift.status === "PUBLISHED") {
      warnings.push(`Turno del ${shift.date.toLocaleDateString()} ya está publicado`);
    } else if (shift.status === "CLOSED") {
      errors.push(`Turno del ${shift.date.toLocaleDateString()} está cerrado`);
      continue;
    }

    // Verificar cobertura
    if (config?.enforceMinimumCoverage && coveragePercentage < 100) {
      issues.push(`Cobertura incompleta (${coveragePercentage.toFixed(0)}%)`);
      warnings.push(`Turno del ${shift.date.toLocaleDateString()} tiene cobertura incompleta`);
    }

    shiftsInfo.push({
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: shift.status,
      coveragePercentage,
      hasIssues: issues.length > 0,
      issues,
    });
  }

  return {
    canPublish: errors.length === 0,
    requiresApproval,
    errors,
    warnings,
    shifts: shiftsInfo,
  };
}

/**
 * Publicar turnos (directamente o enviando a aprobación)
 */
export async function publishShifts(shiftIds: string[], skipValidation = false): Promise<PublishResult> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Validar antes de publicar
  if (!skipValidation) {
    const validation = await validateBeforePublish(shiftIds);
    if (!validation.canPublish) {
      return {
        success: false,
        publishedCount: 0,
        pendingApprovalCount: 0,
        failedCount: shiftIds.length,
        errors: validation.errors,
        publishedIds: [],
        pendingIds: [],
      };
    }
  }

  // Obtener configuración
  const config = await prisma.shiftConfiguration.findUnique({
    where: { orgId: user.orgId },
  });

  const requiresApproval = config?.publishRequiresApproval ?? true;

  const publishedIds: string[] = [];
  const pendingIds: string[] = [];
  const errors: string[] = [];

  // Procesar cada turno
  for (const shiftId of shiftIds) {
    try {
      const shift = await prisma.shift.findFirst({
        where: {
          id: shiftId,
          orgId: user.orgId,
        },
      });

      if (!shift) {
        errors.push(`Turno ${shiftId} no encontrado`);
        continue;
      }

      // Verificar permisos
      const canPlan = await canUserPlanShifts(user.userId, shift.costCenterId);
      if (!canPlan) {
        errors.push(`No autorizado para publicar turno ${shiftId}`);
        continue;
      }

      // Determinar nuevo estado
      const newStatus: ShiftStatus = requiresApproval ? "PENDING_APPROVAL" : "PUBLISHED";

      // Actualizar turno
      await prisma.shift.update({
        where: { id: shiftId },
        data: {
          status: newStatus,
          ...(newStatus === "PUBLISHED" && {
            publishedAt: new Date(),
            publishedById: user.userId,
          }),
        },
      });

      if (newStatus === "PUBLISHED") {
        publishedIds.push(shiftId);
      } else {
        pendingIds.push(shiftId);
      }
    } catch (error) {
      errors.push(
        `Error al publicar turno ${shiftId}: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    }
  }

  return {
    success: errors.length === 0,
    publishedCount: publishedIds.length,
    pendingApprovalCount: pendingIds.length,
    failedCount: errors.length,
    errors,
    publishedIds,
    pendingIds,
  };
}

/**
 * Aprobar turnos pendientes
 */
export async function approveShifts(
  shiftIds: string[],
  notes?: string,
): Promise<{ success: boolean; approvedCount: number; errors: string[] }> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de aprobación
  const canApprove = await canUserApproveShifts(user.userId);
  if (!canApprove) {
    throw new Error("No autorizado para aprobar turnos");
  }

  const approvedIds: string[] = [];
  const errors: string[] = [];

  for (const shiftId of shiftIds) {
    try {
      const shift = await prisma.shift.findFirst({
        where: {
          id: shiftId,
          orgId: user.orgId,
          status: "PENDING_APPROVAL",
        },
      });

      if (!shift) {
        errors.push(`Turno ${shiftId} no encontrado o no está pendiente de aprobación`);
        continue;
      }

      await prisma.shift.update({
        where: { id: shiftId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          approvedById: user.userId,
          approvedAt: new Date(),
          approvalNotes: notes,
        },
      });

      approvedIds.push(shiftId);
    } catch (error) {
      errors.push(`Error al aprobar turno ${shiftId}: ${error instanceof Error ? error.message : "Error desconocido"}`);
    }
  }

  return {
    success: errors.length === 0,
    approvedCount: approvedIds.length,
    errors,
  };
}

/**
 * Rechazar turnos pendientes
 */
export async function rejectShifts(
  shiftIds: string[],
  reason: string,
): Promise<{ success: boolean; rejectedCount: number; errors: string[] }> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos de aprobación
  const canApprove = await canUserApproveShifts(user.userId);
  if (!canApprove) {
    throw new Error("No autorizado para rechazar turnos");
  }

  const rejectedIds: string[] = [];
  const errors: string[] = [];

  for (const shiftId of shiftIds) {
    try {
      const shift = await prisma.shift.findFirst({
        where: {
          id: shiftId,
          orgId: user.orgId,
          status: "PENDING_APPROVAL",
        },
      });

      if (!shift) {
        errors.push(`Turno ${shiftId} no encontrado o no está pendiente de aprobación`);
        continue;
      }

      await prisma.shift.update({
        where: { id: shiftId },
        data: {
          status: "DRAFT",
          approvedById: user.userId,
          approvedAt: new Date(),
          approvalNotes: `RECHAZADO: ${reason}`,
        },
      });

      rejectedIds.push(shiftId);
    } catch (error) {
      errors.push(
        `Error al rechazar turno ${shiftId}: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    }
  }

  return {
    success: errors.length === 0,
    rejectedCount: rejectedIds.length,
    errors,
  };
}

/**
 * Obtener turnos pendientes de aprobación
 */
export async function getPendingApprovalShifts(filters?: { costCenterId?: string; dateFrom?: Date; dateTo?: Date }) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  // Verificar permisos
  const canApprove = await canUserApproveShifts(user.userId);
  if (!canApprove) {
    throw new Error("No autorizado para ver aprobaciones");
  }

  return await prisma.shift.findMany({
    where: {
      orgId: user.orgId,
      status: "PENDING_APPROVAL",
      ...(filters?.costCenterId && { costCenterId: filters.costCenterId }),
      ...(filters?.dateFrom &&
        filters?.dateTo && {
          date: {
            gte: filters.dateFrom,
            lte: filters.dateTo,
          },
        }),
    },
    include: {
      position: true,
      costCenter: true,
      assignments: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { date: "asc" }],
  });
}

/**
 * Despublicar turnos (volver a DRAFT)
 */
export async function unpublishShifts(
  shiftIds: string[],
): Promise<{ success: boolean; unpublishedCount: number; errors: string[] }> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("No autenticado");

  const unpublishedIds: string[] = [];
  const errors: string[] = [];

  for (const shiftId of shiftIds) {
    try {
      const shift = await prisma.shift.findFirst({
        where: {
          id: shiftId,
          orgId: user.orgId,
        },
      });

      if (!shift) {
        errors.push(`Turno ${shiftId} no encontrado`);
        continue;
      }

      // Verificar permisos
      const canPlan = await canUserPlanShifts(user.userId, shift.costCenterId);
      if (!canPlan) {
        errors.push(`No autorizado para despublicar turno ${shiftId}`);
        continue;
      }

      // No permitir despublicar turnos cerrados
      if (shift.status === "CLOSED") {
        errors.push(`No se puede despublicar turno ${shiftId} (está cerrado)`);
        continue;
      }

      await prisma.shift.update({
        where: { id: shiftId },
        data: {
          status: "DRAFT",
          publishedAt: null,
          approvedById: null,
          approvedAt: null,
          approvalNotes: null,
        },
      });

      unpublishedIds.push(shiftId);
    } catch (error) {
      errors.push(
        `Error al despublicar turno ${shiftId}: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    }
  }

  return {
    success: errors.length === 0,
    unpublishedCount: unpublishedIds.length,
    errors,
  };
}
