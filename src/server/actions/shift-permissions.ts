"use server";

import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Verificar si un usuario puede planificar turnos en un centro específico
 */
export async function canUserPlanShifts(userId: string, costCenterId?: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  // SUPER_ADMIN y ORG_ADMIN: siempre pueden
  if (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN") return true;

  // HR_ADMIN: siempre en su organización
  if (user.role === "HR_ADMIN") return true;

  // ShiftPlanner asignado: si isGlobal=true O si costCenterId coincide
  const planner = await prisma.shiftPlanner.findFirst({
    where: {
      userId,
      orgId: user.orgId,
      OR: [{ isGlobal: true }, costCenterId ? { costCenterId } : {}],
    },
  });

  return planner !== null;
}

/**
 * Verificar si un usuario puede aprobar publicaciones de turnos
 */
export async function canUserApproveShifts(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  // Roles administrativos: siempre
  const adminRoles: Role[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"];
  if (adminRoles.includes(user.role)) {
    return true;
  }

  // ShiftPlanner con flag canApprove
  const planner = await prisma.shiftPlanner.findFirst({
    where: {
      userId,
      orgId: user.orgId,
      canApprove: true,
    },
  });

  return planner !== null;
}

/**
 * Verificar si un usuario puede ver turnos de un centro
 */
export async function canUserViewShifts(userId: string, costCenterId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });

  if (!user) return false;

  // Administradores y managers: siempre
  const adminRoles: Role[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "MANAGER"];
  if (adminRoles.includes(user.role)) {
    return true;
  }

  // Empleados: solo si tienen contrato SHIFT_BASED en ese centro
  if (user.employee) {
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId: user.employee.id,
        costCenterId,
        workScheduleMode: "SHIFT_BASED",
        active: true,
      },
    });
    return contract !== null;
  }

  return false;
}

/**
 * Obtener permisos completos de un usuario para turnos
 */
export async function getUserShiftPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      shiftPlannerRoles: {
        include: {
          costCenter: true,
        },
      },
    },
  });

  if (!user) {
    return {
      canPlan: false,
      canApprove: false,
      canViewAll: false,
      plannerRoles: [],
    };
  }

  const adminRoles: Role[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"];
  const isAdmin = adminRoles.includes(user.role);

  return {
    canPlan: isAdmin || user.shiftPlannerRoles.length > 0,
    canApprove: isAdmin || user.shiftPlannerRoles.some((role) => role.canApprove),
    canViewAll: isAdmin,
    plannerRoles: user.shiftPlannerRoles,
  };
}
