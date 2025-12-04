"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

/**
 * Obtiene la lista de empleados inactivos (dados de baja) de la organización
 */
export async function getInactiveEmployees() {
  try {
    const { orgId, role } = await getAuthenticatedUser();

    if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role)) {
      return { success: false, error: "No tienes permisos para esta acción" };
    }

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        active: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeNumber: true,
        nifNie: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return { success: true, employees };
  } catch (error) {
    console.error("Error fetching inactive employees:", error);
    return { success: false, error: "Error al obtener empleados inactivos" };
  }
}

/**
 * Elimina permanentemente un empleado y todos sus datos asociados.
 * Si el empleado tiene usuario, también se elimina.
 * Esta acción es IRREVERSIBLE.
 *
 * Elimina en orden:
 * 1. Employee - cascada elimina: contracts, documents, timeEntries, workdaySummaries, etc.
 * 2. User asociado (si existe) - cascada elimina: sessions, notifications, consents, etc.
 */
export async function deleteEmployeePermanently(employeeId: string) {
  try {
    const { orgId, role, userId, email, name } = await getAuthenticatedUser();

    // Solo SUPER_ADMIN, ORG_ADMIN y HR_ADMIN pueden eliminar empleados permanentemente
    if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role)) {
      return { success: false, error: "No tienes permisos para eliminar empleados" };
    }

    // Verificar que el empleado existe y pertenece a la organización
    const employeeToDelete = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        orgId,
      },
      include: {
        user: true,
        employmentContracts: {
          select: { id: true, contractType: true, startDate: true, endDate: true },
        },
      },
    });

    if (!employeeToDelete) {
      return { success: false, error: "Empleado no encontrado" };
    }

    // Solo permitir eliminar empleados inactivos (dados de baja)
    if (employeeToDelete.active) {
      return {
        success: false,
        error: "Solo se pueden eliminar empleados dados de baja. Primero da de baja al empleado.",
      };
    }

    const employeeName = `${employeeToDelete.firstName} ${employeeToDelete.lastName}`;

    // Preparar snapshot de datos para el audit log
    const entityData = {
      employee: {
        id: employeeToDelete.id,
        firstName: employeeToDelete.firstName,
        lastName: employeeToDelete.lastName,
        email: employeeToDelete.email,
        nifNie: employeeToDelete.nifNie,
        employeeNumber: employeeToDelete.employeeNumber,
      },
      user: employeeToDelete.user
        ? {
            id: employeeToDelete.user.id,
            email: employeeToDelete.user.email,
            name: employeeToDelete.user.name,
            role: employeeToDelete.user.role,
          }
        : null,
      contractsCount: employeeToDelete.employmentContracts.length,
    };

    // Usar transacción para asegurar atomicidad
    await prisma.$transaction(async (tx) => {
      // 1. Crear audit log ANTES de eliminar
      await tx.auditLog.create({
        data: {
          action: "DELETE_EMPLOYEE_PERMANENT",
          category: "EMPLOYEE",
          entityId: employeeId,
          entityType: "Employee",
          entityData,
          description: `Eliminación permanente del empleado ${employeeName} (${employeeToDelete.nifNie})${employeeToDelete.user ? ` y su usuario ${employeeToDelete.user.email}` : ""}`,
          performedById: userId,
          performedByEmail: email,
          performedByName: name,
          performedByRole: role,
          orgId,
        },
      });

      // 2. Eliminar el Employee
      // Esto eliminará en cascada: contracts, documents, timeEntries, workdaySummaries,
      // ptoBalances, ptoRequests, expenses, signers, manualTimeEntryRequests, etc.
      await tx.employee.delete({
        where: { id: employeeId },
      });

      // 3. Si tiene User asociado, eliminarlo también
      // Esto eliminará en cascada: sessions, notifications, consents, messages, etc.
      if (employeeToDelete.user) {
        await tx.user.delete({
          where: { id: employeeToDelete.user.id },
        });
      }
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/employees");

    return {
      success: true,
      message: `Empleado ${employeeName} eliminado permanentemente`,
    };
  } catch (error) {
    console.error("❌ Error deleting employee permanently:");
    console.error("Message:", error instanceof Error ? error.message : error);
    console.error("Full error:", error);
    return {
      success: false,
      error: "Error al eliminar empleado. Verifica que no tenga dependencias activas.",
    };
  }
}

/**
 * Obtiene estadísticas de empleados para el panel de administración
 */
export async function getEmployeeStats() {
  try {
    const { orgId, role } = await getAuthenticatedUser();

    if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role)) {
      return { success: false, error: "No tienes permisos" };
    }

    const [totalEmployees, activeEmployees, inactiveEmployees] = await Promise.all([
      prisma.employee.count({ where: { orgId } }),
      prisma.employee.count({ where: { orgId, active: true } }),
      prisma.employee.count({ where: { orgId, active: false } }),
    ]);

    return {
      success: true,
      stats: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
      },
    };
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    return { success: false, error: "Error al obtener estadísticas" };
  }
}

/**
 * Obtiene el histórico de acciones administrativas (solo SUPER_ADMIN)
 */
export async function getAuditLogs(limit = 50, offset = 0) {
  try {
    const { orgId, role } = await getAuthenticatedUser();

    // Solo SUPER_ADMIN puede ver el histórico
    if (role !== "SUPER_ADMIN") {
      return { success: false, error: "No tienes permisos para ver el histórico" };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where: { orgId } }),
    ]);

    return { success: true, logs, total };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return { success: false, error: "Error al obtener histórico" };
  }
}
