"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Verifica que el módulo de turnos esté habilitado para la organización
 */
export async function checkShiftsEnabled(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { shiftsEnabled: true },
  });

  if (!org) {
    throw new Error("Organización no encontrada");
  }

  return org.shiftsEnabled;
}

/**
 * Obtiene la configuración de turnos de la organización
 */
export async function getOrganizationShiftsConfig(): Promise<{ shiftsEnabled: boolean; shiftMinRestHours: number }> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      console.error("No hay sesión activa");
      return { shiftsEnabled: false, shiftMinRestHours: 12 };
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { shiftsEnabled: true, shiftMinRestMinutes: true },
    });

    if (!org) {
      console.error("Organización no encontrada");
      return { shiftsEnabled: false, shiftMinRestHours: 12 };
    }

    const minRestMinutes = org.shiftMinRestMinutes ?? 12 * 60;

    return { shiftsEnabled: org.shiftsEnabled, shiftMinRestHours: minRestMinutes / 60 };
  } catch (error) {
    console.error("Error al obtener configuración de turnos:", error);
    // Devolver valor por defecto en lugar de lanzar error
    return { shiftsEnabled: false, shiftMinRestHours: 12 };
  }
}

/**
 * Actualiza el estado del módulo de turnos para la organización
 * Solo SUPER_ADMIN, ORG_ADMIN o HR_ADMIN pueden modificar esta configuración
 */
export async function updateOrganizationShiftsStatus(enabled: boolean): Promise<void> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("NO_AUTH");
    }

    // Verificar permisos de administrador (SUPER_ADMIN, ORG_ADMIN o HR_ADMIN)
    const allowedRoles = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      throw new Error("NO_PERMISSION");
    }

    await prisma.organization.update({
      where: { id: session.user.orgId },
      data: { shiftsEnabled: enabled },
    });
  } catch (error) {
    console.error("[updateOrganizationShiftsStatus] Error:", error);
    throw error;
  }
}

/**
 * Actualiza parámetros avanzados del módulo de turnos (p. ej. descanso mínimo)
 */
export async function updateOrganizationShiftsConfig(input: { shiftMinRestHours: number }): Promise<void> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("NO_AUTH");
    }

    const allowedRoles = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      throw new Error("NO_PERMISSION");
    }

    const hours = Number.isFinite(input.shiftMinRestHours) ? input.shiftMinRestHours : 0;
    const sanitizedHours = Math.max(0, hours);
    const minutes = Math.round(sanitizedHours * 60);

    await prisma.organization.update({
      where: { id: session.user.orgId },
      data: { shiftMinRestMinutes: minutes },
    });
  } catch (error) {
    console.error("[updateOrganizationShiftsConfig] Error:", error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de uso del módulo de turnos
 */
export async function getShiftsStats(): Promise<{
  totalEmployees: number;
  employeesWithShifts: number;
  totalZones: number;
  usagePercentage: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      console.error("No hay sesión activa");
      return {
        totalEmployees: 0,
        employeesWithShifts: 0,
        totalZones: 0,
        usagePercentage: "0",
      };
    }

    const { orgId } = session.user;

    // Total de empleados activos
    const totalEmployees = await prisma.employee.count({
      where: { orgId, active: true },
    });

    // Empleados con turnos asignados (únicos)
    // Nota: Asumiendo que existe un modelo Shift con campo employeeId
    // Si no existe, esto se ajustará cuando se implemente el modelo
    let employeesWithShifts = 0;
    try {
      // Intentar contar empleados con turnos (puede fallar si el modelo no existe aún)
      const shiftsData = await prisma.$queryRaw<Array<{ employeeId: string }>>`
        SELECT DISTINCT "employeeId"
        FROM shifts
        WHERE "orgId" = ${orgId}
      `;
      employeesWithShifts = shiftsData.length;
    } catch {
      // Si falla, significa que el modelo Shift no existe todavía
      employeesWithShifts = 0;
    }

    // Total de zonas activas
    // Nota: Asumiendo que existe un modelo Zone
    let totalZones = 0;
    try {
      totalZones = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count
        FROM zones
        WHERE "orgId" = ${orgId} AND active = true
      `.then((result) => Number(result[0]?.count ?? 0));
    } catch {
      // Si falla, el modelo Zone no existe todavía
      totalZones = 0;
    }

    // Calcular porcentaje de uso
    const usagePercentage = totalEmployees > 0 ? ((employeesWithShifts / totalEmployees) * 100).toFixed(1) : "0";

    return {
      totalEmployees,
      employeesWithShifts,
      totalZones,
      usagePercentage,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de turnos:", error);
    // Devolver valores por defecto en lugar de lanzar error
    return {
      totalEmployees: 0,
      employeesWithShifts: 0,
      totalZones: 0,
      usagePercentage: "0",
    };
  }
}
