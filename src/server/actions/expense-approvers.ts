"use server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

// Schema de validación para agregar aprobador
const AddApproverSchema = z.object({
  userId: z.string().cuid(),
  isPrimary: z.boolean().optional().default(false),
});

// Schema de validación para reordenar aprobadores
const ReorderApproversSchema = z.array(z.string().cuid());

// Schema de validación para asignar aprobador a empleado
const SetEmployeeApproverSchema = z.object({
  employeeId: z.string().cuid(),
  userId: z.string().cuid().nullable(),
});

/**
 * Obtiene la lista de aprobadores organizacionales
 * Ordenados por isPrimary desc, order asc
 */
export async function getOrganizationApprovers() {
  const session = await auth();

  if (!session?.user?.orgId) {
    return {
      success: false,
      error: "No autorizado",
    };
  }

  const approvers = await prisma.expenseApprover.findMany({
    where: { orgId: session.user.orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
  });

  return {
    success: true,
    approvers,
  };
}

/**
 * Agrega un nuevo aprobador organizacional
 * Solo accesible para ORG_ADMIN y HR_ADMIN
 */
export async function addOrganizationApprover(data: z.infer<typeof AddApproverSchema>) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return {
      success: false,
      error: "No autorizado",
    };
  }

  // Verificar permisos
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(session.user.role)) {
    return {
      success: false,
      error: "No tienes permisos para gestionar aprobadores de gastos",
    };
  }

  const validatedData = AddApproverSchema.parse(data);

  // Validar que el usuario existe y pertenece a la misma organización
  const targetUser = await prisma.user.findUnique({
    where: { id: validatedData.userId },
  });

  if (!targetUser) {
    return { success: false, error: "Usuario no encontrado" };
  }

  if (targetUser.orgId !== session.user.orgId) {
    return { success: false, error: "El usuario no pertenece a tu organización" };
  }

  // Validar que el usuario tiene rol adecuado
  if (!["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(targetUser.role)) {
    return {
      success: false,
      error: "El usuario debe tener rol MANAGER o superior para ser aprobador",
    };
  }

  // Verificar que el usuario tenga un empleado asociado
  const hasEmployee = await prisma.employee.findFirst({
    where: { userId: targetUser.id },
  });

  if (!hasEmployee) {
    return {
      success: false,
      error: "Solo se pueden agregar como aprobadores usuarios con perfil de empleado asociado",
    };
  }

  // Verificar que no esté ya como aprobador (unique constraint)
  const existing = await prisma.expenseApprover.findUnique({
    where: {
      userId_orgId: {
        userId: validatedData.userId,
        orgId: session.user.orgId,
      },
    },
  });

  if (existing) {
    return {
      success: false,
      error: "Este usuario ya es aprobador de gastos",
    };
  }

  // Si se marca como primario, desmarcar otros
  if (validatedData.isPrimary) {
    await prisma.expenseApprover.updateMany({
      where: { orgId: session.user.orgId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  // Obtener el siguiente order (máximo + 1)
  const maxOrder = await prisma.expenseApprover.aggregate({
    where: { orgId: session.user.orgId },
    _max: { order: true },
  });

  // eslint-disable-next-line no-underscore-dangle
  const maxResult = maxOrder._max;
  const maxOrderValue = maxResult.order ?? -1;
  const nextOrder = maxOrderValue + 1;

  // Crear el aprobador
  const approver = await prisma.expenseApprover.create({
    data: {
      userId: validatedData.userId,
      orgId: session.user.orgId,
      isPrimary: validatedData.isPrimary,
      order: nextOrder,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  });

  return {
    success: true,
    approver,
  };
}

/**
 * Elimina un aprobador organizacional
 * Solo accesible para ORG_ADMIN y HR_ADMIN
 */
export async function removeOrganizationApprover(expenseApproverId: string) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return {
      success: false,
      error: "No autorizado",
    };
  }

  // Verificar permisos
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(session.user.role)) {
    return {
      success: false,
      error: "No tienes permisos para gestionar aprobadores de gastos",
    };
  }

  // Verificar que el aprobador existe y pertenece a la organización
  const approver = await prisma.expenseApprover.findUnique({
    where: { id: expenseApproverId },
  });

  if (!approver) {
    return { success: false, error: "Aprobador no encontrado" };
  }

  if (approver.orgId !== session.user.orgId) {
    return { success: false, error: "El aprobador no pertenece a tu organización" };
  }

  // Verificar que no sea el último aprobador
  const count = await prisma.expenseApprover.count({
    where: { orgId: session.user.orgId },
  });

  if (count <= 1) {
    return {
      success: false,
      error: "No puedes eliminar el último aprobador. Debe haber al menos uno configurado.",
    };
  }

  // Verificar si tiene gastos pendientes
  const pendingExpensesCount = await prisma.expenseApproval.count({
    where: {
      approverId: approver.userId,
      decision: "PENDING",
      expense: {
        orgId: session.user.orgId,
      },
    },
  });

  if (pendingExpensesCount > 0) {
    return {
      success: false,
      error: `Este aprobador tiene ${pendingExpensesCount} gasto(s) pendiente(s) de aprobar. Por favor, reasigna o aprueba estos gastos antes de eliminarlo.`,
      pendingCount: pendingExpensesCount,
    };
  }

  // Eliminar el aprobador
  await prisma.expenseApprover.delete({
    where: { id: expenseApproverId },
  });

  return {
    success: true,
  };
}

/**
 * Marca un aprobador como primario
 * Desmarca automáticamente otros aprobadores primarios
 */
export async function setPrimaryApprover(expenseApproverId: string) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return {
      success: false,
      error: "No autorizado",
    };
  }

  // Verificar permisos
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(session.user.role)) {
    return {
      success: false,
      error: "No tienes permisos para gestionar aprobadores de gastos",
    };
  }

  // Verificar que el aprobador existe y pertenece a la organización
  const approver = await prisma.expenseApprover.findUnique({
    where: { id: expenseApproverId },
  });

  if (!approver) {
    return { success: false, error: "Aprobador no encontrado" };
  }

  if (approver.orgId !== session.user.orgId) {
    return { success: false, error: "El aprobador no pertenece a tu organización" };
  }

  // Desmarcar todos los primarios
  await prisma.expenseApprover.updateMany({
    where: { orgId: session.user.orgId, isPrimary: true },
    data: { isPrimary: false },
  });

  // Marcar el nuevo primario
  const updatedApprover = await prisma.expenseApprover.update({
    where: { id: expenseApproverId },
    data: { isPrimary: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  });

  return {
    success: true,
    approver: updatedApprover,
  };
}

/**
 * Reordena la lista de aprobadores
 * Recibe array de IDs en el nuevo orden deseado
 */
export async function reorderApprovers(approverIds: z.infer<typeof ReorderApproversSchema>) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return {
      success: false,
      error: "No autorizado",
    };
  }

  // Verificar permisos
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(session.user.role)) {
    return {
      success: false,
      error: "No tienes permisos para gestionar aprobadores de gastos",
    };
  }

  const validatedIds = ReorderApproversSchema.parse(approverIds);

  // Verificar que todos los IDs existen y pertenecen a la organización
  const approvers = await prisma.expenseApprover.findMany({
    where: {
      id: { in: validatedIds },
      orgId: session.user.orgId,
    },
  });

  if (approvers.length !== validatedIds.length) {
    return {
      success: false,
      error: "Algunos aprobadores no fueron encontrados o no pertenecen a tu organización",
    };
  }

  // Actualizar el order de cada uno según su posición en el array
  await Promise.all(
    validatedIds.map((id, index) =>
      prisma.expenseApprover.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );

  // Retornar lista actualizada
  const updatedApprovers = await prisma.expenseApprover.findMany({
    where: { orgId: session.user.orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
  });

  return {
    success: true,
    approvers: updatedApprovers,
  };
}

/**
 * Asigna un aprobador específico a un empleado
 * Si userId es null, elimina el aprobador específico (usará aprobadores org)
 */
export async function setEmployeeApprover(data: z.infer<typeof SetEmployeeApproverSchema>) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return {
      success: false,
      error: "No autorizado",
    };
  }

  const validatedData = SetEmployeeApproverSchema.parse(data);

  // Verificar permisos
  const isAdmin = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(session.user.role);

  if (isAdmin) {
    // Los admins pueden gestionar cualquier empleado, no necesitan ser empleados
  } else if (session.user.role === "MANAGER") {
    // Los managers solo pueden gestionar empleados bajo su supervisión
    // Y necesitan tener un empleado asociado
    if (!session.user.employeeId) {
      return {
        success: false,
        error: "Los managers deben tener un empleado asociado para gestionar otros empleados",
      };
    }

    const canManage = await isManagerOfEmployee(session.user.id, validatedData.employeeId);
    if (!canManage) {
      return {
        success: false,
        error: "No tienes permisos para asignar aprobadores a este empleado",
      };
    }
  } else {
    return {
      success: false,
      error: "No tienes permisos para asignar aprobadores",
    };
  }

  // Verificar que el empleado existe y pertenece a la organización
  const employee = await prisma.employee.findUnique({
    where: { id: validatedData.employeeId },
  });

  if (!employee) {
    return { success: false, error: "Empleado no encontrado" };
  }

  if (employee.orgId !== session.user.orgId) {
    return { success: false, error: "El empleado no pertenece a tu organización" };
  }

  // Si userId es null, eliminar aprobador específico
  if (validatedData.userId === null) {
    const updatedEmployee = await prisma.employee.update({
      where: { id: validatedData.employeeId },
      data: { expenseApproverId: null },
      include: {
        expenseApprover: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          },
        },
      },
    });

    return {
      success: true,
      employee: updatedEmployee,
      message: "El empleado ahora usará los aprobadores organizacionales",
    };
  }

  // Si userId existe, validar que existe y pertenece a la org
  const targetUser = await prisma.user.findUnique({
    where: { id: validatedData.userId },
  });

  if (!targetUser) {
    return { success: false, error: "Usuario no encontrado" };
  }

  if (targetUser.orgId !== session.user.orgId) {
    return { success: false, error: "El usuario no pertenece a tu organización" };
  }

  // Validar que el usuario tiene rol adecuado
  if (!["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(targetUser.role)) {
    return {
      success: false,
      error: "El usuario debe tener rol MANAGER o superior para ser aprobador",
    };
  }

  // Asignar el aprobador específico
  const updatedEmployee = await prisma.employee.update({
    where: { id: validatedData.employeeId },
    data: { expenseApproverId: validatedData.userId },
    include: {
      expenseApprover: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  });

  return {
    success: true,
    employee: updatedEmployee,
  };
}

/**
 * Obtiene el/los aprobador(es) de un empleado
 * Retorna aprobador específico si existe, si no, retorna aprobadores organizacionales
 */
export async function getEmployeeApprover(employeeId: string) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return {
      success: false,
      error: "No autorizado",
    };
  }

  // Verificar que el empleado existe y pertenece a la organización
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      expenseApprover: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  });

  if (!employee) {
    return { success: false, error: "Empleado no encontrado" };
  }

  if (employee.orgId !== session.user.orgId) {
    return { success: false, error: "El empleado no pertenece a tu organización" };
  }

  // Caso A: Tiene aprobador específico
  if (employee.expenseApproverId && employee.expenseApprover) {
    return {
      success: true,
      type: "specific" as const,
      approver: employee.expenseApprover,
    };
  }

  // Caso B: Usar aprobadores organizacionales
  const orgApprovers = await prisma.expenseApprover.findMany({
    where: { orgId: session.user.orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
  });

  return {
    success: true,
    type: "organizational" as const,
    approvers: orgApprovers,
  };
}

/**
 * Helper: Verifica si un usuario es manager de un empleado
 */
async function isManagerOfEmployee(userId: string, employeeId: string): Promise<boolean> {
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      active: true,
      manager: {
        userId,
      },
    },
  });

  return !!contract;
}
