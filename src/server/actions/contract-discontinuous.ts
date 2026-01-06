"use server";

/**
 * Server Actions para Contratos Fijos Discontinuos
 *
 * Funcionalidades:
 * - Pausar contrato (congela devengo de vacaciones)
 * - Reanudar contrato (reactiva devengo)
 * - Obtener resumen de discontinuidad
 * - Obtener historial de pausas
 *
 * Permisos: Solo ADMIN y HR_MANAGER pueden pausar/reanudar
 */

import { revalidatePath } from "next/cache";

import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  validateContractResume,
  getDiscontinuousSummary as getDiscontinuousSummaryCalc,
} from "@/lib/vacation-calculator";

// =====================================================
// TIPOS
// =====================================================

export interface PauseContractResult {
  success: boolean;
  error?: string;
  contract?: {
    id: string;
    discontinuousStatus: string;
    pausedAt: Date;
  };
}

export interface ResumeContractResult {
  success: boolean;
  error?: string;
  contract?: {
    id: string;
    discontinuousStatus: string;
    resumedAt: Date;
  };
}

export interface ContractPauseHistoryEntry {
  id: string;
  action: "PAUSE" | "RESUME";
  startDate: Date;
  endDate: Date | null;
  reason: string | null;
  performedBy: string;
  performedAt: Date;
  performedByName?: string;
}

// =====================================================
// VALIDACIÓN DE PERMISOS
// =====================================================

interface PermissionsResult {
  valid: boolean;
  userId: string;
  orgId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  error?: string;
}

async function validatePermissions(): Promise<PermissionsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { valid: false, userId: "", orgId: "", userEmail: "", userName: "", userRole: "", error: "No autenticado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, orgId: true, role: true, email: true, name: true },
  });

  if (!user) {
    return {
      valid: false,
      userId: "",
      orgId: "",
      userEmail: "",
      userName: "",
      userRole: "",
      error: "Usuario no encontrado",
    };
  }

  const effectivePermissions = await computeEffectivePermissions({
    role: user.role,
    orgId: user.orgId,
    userId: user.id,
  });

  if (!effectivePermissions.has("manage_contracts")) {
    return {
      valid: false,
      userId: user.id,
      orgId: user.orgId,
      userEmail: user.email,
      userName: user.name ?? "",
      userRole: user.role,
      error: "No tienes permisos para realizar esta acción. Solo Admin y RRHH pueden pausar/reanudar contratos.",
    };
  }

  return {
    valid: true,
    userId: user.id,
    orgId: user.orgId,
    userEmail: user.email,
    userName: user.name ?? "",
    userRole: user.role,
  };
}

// =====================================================
// SERVER ACTIONS
// =====================================================

/**
 * Pausa un contrato fijo discontinuo
 * - Solo para contratos tipo FIJO_DISCONTINUO
 * - Solo si el contrato está actualmente ACTIVE
 * - Registra en historial con fecha de inicio
 */
export async function pauseContract(contractId: string, reason?: string): Promise<PauseContractResult> {
  try {
    // Validar permisos
    const permissions = await validatePermissions();
    if (!permissions.valid) {
      return { success: false, error: permissions.error };
    }

    // Obtener contrato
    const contract = await prisma.employmentContract.findUnique({
      where: { id: contractId },
      include: { employee: true },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validar que el contrato pertenezca a la organización del usuario
    if (contract.orgId !== permissions.orgId) {
      return { success: false, error: "No tienes acceso a este contrato" };
    }

    // Validar tipo de contrato
    if (contract.contractType !== "FIJO_DISCONTINUO") {
      return {
        success: false,
        error: "Solo se pueden pausar contratos de tipo Fijo Discontinuo",
      };
    }

    // Validar estado actual
    if (contract.discontinuousStatus === "PAUSED") {
      return { success: false, error: "El contrato ya está pausado" };
    }

    const lastEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId: contract.employeeId,
        orgId: contract.orgId,
        isCancelled: false,
      },
      select: {
        entryType: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    if (lastEntry && lastEntry.entryType !== "CLOCK_OUT") {
      return {
        success: false,
        error: "No puedes pausar un contrato con un fichaje abierto. Cierra el fichaje antes de pausar.",
      };
    }

    const now = new Date();

    // Actualizar contrato y crear entrada en historial en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar estado del contrato
      const updatedContract = await tx.employmentContract.update({
        where: { id: contractId },
        data: {
          discontinuousStatus: "PAUSED",
        },
      });

      // Crear entrada en historial
      await tx.contractPauseHistory.create({
        data: {
          contractId,
          action: "PAUSE",
          startDate: now,
          endDate: null, // Se establecerá cuando se reanude
          reason: reason ?? null,
          performedBy: permissions.userId,
          performedAt: now,
        },
      });

      // Registrar en auditoría
      const employeeName = `${contract.employee.firstName} ${contract.employee.lastName}`;
      await tx.auditLog.create({
        data: {
          orgId: contract.orgId,
          action: "CONTRACT_PAUSED",
          category: "CONTRACT",
          entityId: contractId,
          entityType: "EmploymentContract",
          entityData: {
            previousStatus: contract.discontinuousStatus ?? "ACTIVE",
            newStatus: "PAUSED",
            reason: reason ?? null,
            employeeId: contract.employeeId,
            employeeName,
          },
          description: `Contrato fijo discontinuo pausado para ${employeeName}${reason ? `: ${reason}` : ""}`,
          performedById: permissions.userId,
          performedByEmail: permissions.userEmail,
          performedByName: permissions.userName,
          performedByRole: permissions.userRole,
        },
      });

      return updatedContract;
    });

    // Revalidar paths
    revalidatePath(`/dashboard/contracts/${contractId}`);
    revalidatePath(`/dashboard/employees/${contract.employeeId}`);

    return {
      success: true,
      contract: {
        id: result.id,
        discontinuousStatus: result.discontinuousStatus ?? "PAUSED",
        pausedAt: now,
      },
    };
  } catch (error) {
    console.error("Error al pausar contrato:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al pausar el contrato",
    };
  }
}

/**
 * Reanuda un contrato fijo discontinuo
 * - Solo para contratos tipo FIJO_DISCONTINUO
 * - Solo si el contrato está actualmente PAUSED
 * - Valida que no haya fichajes durante el período pausado
 * - Actualiza la entrada de pausa con la fecha de fin
 */
export async function resumeContract(contractId: string): Promise<ResumeContractResult> {
  try {
    // Validar permisos
    const permissions = await validatePermissions();
    if (!permissions.valid) {
      return { success: false, error: permissions.error };
    }

    // Validar que el contrato pueda ser reanudado
    const validation = await validateContractResume(contractId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Obtener contrato
    const contract = await prisma.employmentContract.findUnique({
      where: { id: contractId },
      include: {
        employee: true,
        pauseHistory: {
          where: {
            action: "PAUSE",
            endDate: null,
          },
          orderBy: { startDate: "desc" },
          take: 1,
        },
      },
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    // Validar que el contrato pertenezca a la organización del usuario
    if (contract.orgId !== permissions.orgId) {
      return { success: false, error: "No tienes acceso a este contrato" };
    }

    const now = new Date();
    const openPause = contract.pauseHistory[0];

    // Actualizar contrato e historial en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar estado del contrato
      const updatedContract = await tx.employmentContract.update({
        where: { id: contractId },
        data: {
          discontinuousStatus: "ACTIVE",
        },
      });

      // Actualizar la pausa abierta con la fecha de fin
      if (openPause) {
        await tx.contractPauseHistory.update({
          where: { id: openPause.id },
          data: {
            endDate: now,
          },
        });
      }

      // Crear entrada de RESUME en historial
      await tx.contractPauseHistory.create({
        data: {
          contractId,
          action: "RESUME",
          startDate: now,
          endDate: null,
          reason: null,
          performedBy: permissions.userId,
          performedAt: now,
        },
      });

      // Registrar en auditoría
      const employeeName = `${contract.employee.firstName} ${contract.employee.lastName}`;
      await tx.auditLog.create({
        data: {
          orgId: contract.orgId,
          action: "CONTRACT_RESUMED",
          category: "CONTRACT",
          entityId: contractId,
          entityType: "EmploymentContract",
          entityData: {
            previousStatus: "PAUSED",
            newStatus: "ACTIVE",
            pauseStartDate: openPause?.startDate?.toISOString() ?? null,
            pauseEndDate: now.toISOString(),
            employeeId: contract.employeeId,
            employeeName,
          },
          description: `Contrato fijo discontinuo reanudado para ${employeeName}`,
          performedById: permissions.userId,
          performedByEmail: permissions.userEmail,
          performedByName: permissions.userName,
          performedByRole: permissions.userRole,
        },
      });

      return updatedContract;
    });

    // Revalidar paths
    revalidatePath(`/dashboard/contracts/${contractId}`);
    revalidatePath(`/dashboard/employees/${contract.employeeId}`);

    return {
      success: true,
      contract: {
        id: result.id,
        discontinuousStatus: result.discontinuousStatus ?? "ACTIVE",
        resumedAt: now,
      },
    };
  } catch (error) {
    console.error("Error al reanudar contrato:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al reanudar el contrato",
    };
  }
}

/**
 * Obtiene el resumen de discontinuidad de un contrato
 * - Estado actual (ACTIVE/PAUSED)
 * - Última pausa
 * - Períodos pausados
 * - Total de días pausados y activos
 */
export async function getDiscontinuousSummary(contractId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("No autenticado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Verificar acceso al contrato
    const contract = await prisma.employmentContract.findUnique({
      where: { id: contractId },
      select: { orgId: true },
    });

    if (!contract) {
      throw new Error("Contrato no encontrado");
    }

    if (contract.orgId !== user.orgId) {
      throw new Error("No tienes acceso a este contrato");
    }

    return await getDiscontinuousSummaryCalc(contractId);
  } catch (error) {
    console.error("Error al obtener resumen de discontinuidad:", error);
    throw error;
  }
}

/**
 * Obtiene el historial de pausas de un contrato
 * Incluye el nombre de quien realizó cada acción
 */
export async function getContractPauseHistory(contractId: string): Promise<ContractPauseHistoryEntry[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("No autenticado");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Verificar acceso al contrato
    const contract = await prisma.employmentContract.findUnique({
      where: { id: contractId },
      select: { orgId: true },
    });

    if (!contract) {
      throw new Error("Contrato no encontrado");
    }

    if (contract.orgId !== user.orgId) {
      throw new Error("No tienes acceso a este contrato");
    }

    const history = await prisma.contractPauseHistory.findMany({
      where: { contractId },
      orderBy: { performedAt: "desc" },
    });

    // Obtener nombres de usuarios que realizaron las acciones
    const userIds = [...new Set(history.map((h) => h.performedBy))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return history.map((entry) => ({
      id: entry.id,
      action: entry.action as "PAUSE" | "RESUME",
      startDate: entry.startDate,
      endDate: entry.endDate,
      reason: entry.reason,
      performedBy: entry.performedBy,
      performedAt: entry.performedAt,
      performedByName: userMap.get(entry.performedBy) ?? "Usuario desconocido",
    }));
  } catch (error) {
    console.error("Error al obtener historial de pausas:", error);
    throw error;
  }
}

/**
 * Verifica si un empleado tiene su contrato pausado
 * Útil para validaciones en fichajes y otras operaciones
 */
export async function isContractPaused(employeeId: string): Promise<boolean> {
  try {
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId,
        active: true,
        contractType: "FIJO_DISCONTINUO",
      },
      select: {
        discontinuousStatus: true,
      },
    });

    return contract?.discontinuousStatus === "PAUSED";
  } catch (error) {
    console.error("Error al verificar estado de contrato:", error);
    return false;
  }
}
