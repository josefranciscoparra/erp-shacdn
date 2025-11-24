"use server";

import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { getAuthenticatedEmployee, getAuthenticatedUser } from "./shared/get-authenticated-employee";

// Schemas
const CreateProcedureSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  estimatedAmount: z.number().positive().optional(),
  employeeId: z.string().optional(), // Mantenemos para compatibilidad hacia atrás o uso simple
  employeeIds: z.array(z.string()).optional(), // Nuevo campo para selección múltiple
});

const UpdateProcedureSchema = CreateProcedureSchema.partial().extend({
  status: z
    .enum(["DRAFT", "PENDING_AUTHORIZATION", "AUTHORIZED", "JUSTIFICATION_PENDING", "JUSTIFIED", "CLOSED", "REJECTED"])
    .optional(),
  approvedAmount: z.number().positive().optional(),
});

/**
 * Crea un nuevo expediente de gasto
 */
export async function createProcedure(data: z.infer<typeof CreateProcedureSchema>) {
  try {
    const { employee, userId } = await getAuthenticatedEmployee();
    // Necesitamos el rol para verificar permisos
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, id: true } });

    if (!user) throw new Error("Usuario no encontrado");

    const validatedData = CreateProcedureSchema.parse(data);

    const isManager = ["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(user.role);

    // Lista de empleados destino
    let targetEmployeeIds: string[] = [];

    if (validatedData.employeeIds && validatedData.employeeIds.length > 0) {
      // Caso múltiple (Prioritario si viene relleno)
      if (!isManager) {
        return { success: false, error: "No tienes permisos para crear expedientes para otros empleados" };
      }
      targetEmployeeIds = validatedData.employeeIds;
    } else if (validatedData.employeeId) {
      // Caso simple (Compatibilidad)
      if (!isManager && validatedData.employeeId !== employee.id) {
        return { success: false, error: "No tienes permisos para crear expedientes para otros empleados" };
      }
      targetEmployeeIds = [validatedData.employeeId];
    } else {
      // Caso sin especificar (Auto-asignación o Borrador sin asignar)
      if (isManager) {
        // Managers pueden dejarlo sin asignar (Borrador sin beneficiario) -> Lista vacía o null?
        // Si la lista está vacía y es manager, creamos UN solo expediente sin asignar.
        targetEmployeeIds = [];
      } else {
        // Empleados normales siempre crean para sí mismos
        targetEmployeeIds = [employee.id];
      }
    }

    // Si es manager y no hay empleados, creamos uno solo sin asignar
    if (isManager && targetEmployeeIds.length === 0) {
      const count = await prisma.expenseProcedure.count({
        where: { orgId: employee.orgId },
      });
      const code = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

      const procedure = await prisma.expenseProcedure.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          code,
          status: "DRAFT",
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          estimatedAmount: validatedData.estimatedAmount ? new Decimal(validatedData.estimatedAmount) : null,
          organization: { connect: { id: employee.orgId } },
          createdBy: { connect: { id: user.id } },
          // Sin employee connect
        },
      });

      // 🔹 AUDITORÍA: Registrar creación
      await prisma.expenseProcedureHistory.create({
        data: {
          procedureId: procedure.id,
          action: "CREATED",
          newStatus: "DRAFT",
          actorId: user.id,
          details: "Creación inicial (Borrador sin asignar)",
        },
      });

      return {
        success: true,
        procedure: {
          ...procedure,
          estimatedAmount: procedure.estimatedAmount?.toNumber() ?? null,
          approvedAmount: procedure.approvedAmount?.toNumber() ?? null,
        },
      };
    }

    // Creación en bucle (o transacción) para los empleados seleccionados
    const createdProcedures = [];

    // Usamos una transacción para asegurar consistencia en contadores si es posible,
    // pero para códigos secuenciales con Prisma a veces es mejor uno a uno o usar una secuencia DB real.
    // Lo haremos iterativo simple por ahora.
    for (const targetId of targetEmployeeIds) {
      const count = await prisma.expenseProcedure.count({
        where: { orgId: employee.orgId },
      });
      const code = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

      // Obtener datos del empleado para añadir al nombre si es masivo?
      // Opcional: "Viaje X - Juan Perez". De momento dejamos nombre original.

      const procedure = await prisma.expenseProcedure.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          code,
          status: "DRAFT",
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          estimatedAmount: validatedData.estimatedAmount ? new Decimal(validatedData.estimatedAmount) : null,
          organization: { connect: { id: employee.orgId } },
          createdBy: { connect: { id: user.id } },
          employee: { connect: { id: targetId } },
        },
      });

      // 🔹 AUDITORÍA: Registrar creación
      await prisma.expenseProcedureHistory.create({
        data: {
          procedureId: procedure.id,
          action: "CREATED",
          newStatus: "DRAFT",
          actorId: user.id,
          details: "Creación inicial",
        },
      });

      createdProcedures.push(procedure);
    }

    // Retornamos el primero para compatibilidad, o un indicador de éxito
    const firstProcedure = createdProcedures[0];

    return {
      success: true,
      count: createdProcedures.length,
      procedure: {
        ...firstProcedure,
        estimatedAmount: firstProcedure.estimatedAmount?.toNumber() ?? null,
        approvedAmount: firstProcedure.approvedAmount?.toNumber() ?? null,
      },
    };
  } catch (error) {
    console.error("Error creating procedure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear el expediente",
    };
  }
}

/**
 * Obtiene expedientes (Mis expedientes o Gestión)
 */
export async function getProcedures(
  filters: {
    mine?: boolean;
    status?: string;
    employeeId?: string;
  } = {},
) {
  const { employee, userId } = await getAuthenticatedEmployee();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  if (!user) throw new Error("Usuario no encontrado");

  const whereClause: any = {
    orgId: employee.orgId,
  };

  if (filters.mine) {
    whereClause.employeeId = employee.id;
  } else if (filters.employeeId) {
    whereClause.employeeId = filters.employeeId;
  }

  if (filters.status) {
    whereClause.status = filters.status;
  }

  // Si no es "mine", validar que tenga permisos de ver
  if (!filters.mine && !["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    // Si es empleado normal, solo puede ver los suyos aunque no ponga mine=true
    whereClause.employeeId = employee.id;
  }

  const procedures = await prisma.expenseProcedure.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      expenses: {
        select: {
          id: true,
          totalAmount: true,
          status: true,
        },
      },
      _count: {
        select: { expenses: true },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return { success: true, procedures };
}

/**
 * Obtiene detalle de un expediente
 */
export async function getProcedureById(id: string) {
  const { employee, userId } = await getAuthenticatedEmployee();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  if (!user) throw new Error("Usuario no encontrado");

  const procedure = await prisma.expenseProcedure.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      expenses: {
        include: {
          attachments: true,
          costCenter: true,
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!procedure) {
    return { success: false, error: "Expediente no encontrado" };
  }

  // Permisos
  if (
    procedure.employeeId !== employee.id &&
    !["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(user.role)
  ) {
    return { success: false, error: "No tienes acceso a este expediente" };
  }

  return { success: true, procedure };
}

/**
 * Actualiza estado del expediente (Autorización, etc)
 */
export async function updateProcedureStatus(
  id: string,
  status: "AUTHORIZED" | "REJECTED" | "CLOSED" | "JUSTIFIED" | "PENDING_AUTHORIZATION",
) {
  const { employee, userId } = await getAuthenticatedEmployee();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  if (!user) throw new Error("Usuario no encontrado");

  // Validar permisos de aprobación
  // TODO: Usar sistema de permisos más robusto. Por ahora Managers+
  if (!["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { success: false, error: "No tienes permisos para cambiar el estado de expedientes" };
  }

  const procedure = await prisma.expenseProcedure.findUnique({
    where: { id },
  });

  if (!procedure) {
    return { success: false, error: "Expediente no encontrado" };
  }

  const updated = await prisma.expenseProcedure.update({
    where: { id },
    data: { status },
  });

  // 🔹 AUDITORÍA: Registrar cambio de estado
  await prisma.expenseProcedureHistory.create({
    data: {
      procedureId: id,
      action: "STATUS_CHANGE",
      previousStatus: procedure.status,
      newStatus: status,
      actorId: userId, // Usar userId directo (user.id era undefined porque no se seleccionó)
      details: `Cambio de estado: ${procedure.status} -> ${status}`,
    },
  });

  // Notificar al empleado
  if (procedure.employeeId && procedure.employeeId !== employee.id) {
    // Si no es el propio usuario y tiene empleado asignado
    const employeeUser = await prisma.employee.findUnique({
      where: { id: procedure.employeeId },
      select: { userId: true },
    });

    if (employeeUser?.userId) {
      await createNotification(
        employeeUser.userId,
        employee.orgId,
        "SYSTEM_ANNOUNCEMENT", // Reusando tipo o crear uno nuevo PROCEDURE_UPDATE
        `Estado de expediente actualizado`,
        `El expediente ${procedure.code ?? procedure.name} ha pasado a estado: ${status}`,
      );
    }
  }

  return {
    success: true,
    procedure: {
      ...updated,
      estimatedAmount: updated.estimatedAmount?.toNumber() ?? null,
      approvedAmount: updated.approvedAmount?.toNumber() ?? null,
    },
  };
}

/**
 * Actualiza un expediente de gasto
 */
export async function updateProcedure(id: string, data: z.infer<typeof UpdateProcedureSchema>) {
  try {
    const { employee, userId } = await getAuthenticatedEmployee();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, id: true } });

    if (!user) throw new Error("Usuario no encontrado");

    const validatedData = UpdateProcedureSchema.parse(data);
    const isManager = ["MANAGER", "HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(user.role);

    // Verificar existencia y permisos
    const existingProcedure = await prisma.expenseProcedure.findUnique({
      where: { id },
    });

    if (!existingProcedure) return { success: false, error: "Expediente no encontrado" };

    // Solo el creador, el beneficiario o un manager pueden editar
    const canEdit =
      isManager || existingProcedure.createdById === user.id || existingProcedure.employeeId === employee.id;

    if (!canEdit) {
      return { success: false, error: "No tienes permisos para editar este expediente" };
    }

    // Preparar datos de actualización
    const updateData: any = {
      name: validatedData.name,
      description: validatedData.description,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      estimatedAmount: validatedData.estimatedAmount ? new Decimal(validatedData.estimatedAmount) : null,
      status: validatedData.status,
      approvedAmount: validatedData.approvedAmount ? new Decimal(validatedData.approvedAmount) : null,
    };

    // Gestionar cambio de empleado (Solo managers)
    if (validatedData.employeeId !== undefined) {
      if (!isManager) {
        // Si no es manager, no puede cambiar el beneficiario
        // Ignoramos el campo o lanzamos error? Mejor ignorar silenciosamente si es el mismo, pero error si intenta cambiarlo
        if (validatedData.employeeId !== existingProcedure.employeeId) {
          return { success: false, error: "Solo los administradores pueden reasignar expedientes" };
        }
      } else {
        // Es manager, puede cambiarlo
        if (validatedData.employeeId) {
          updateData.employee = { connect: { id: validatedData.employeeId } };
        } else {
          // Si viene null o vacío, desconectamos (expediente sin beneficiario)
          updateData.employee = { disconnect: true };
        }
      }
    }

    const procedure = await prisma.expenseProcedure.update({
      where: { id },
      data: updateData,
    });

    // 🔹 AUDITORÍA: Registrar actualización
    // Si cambia el estado, lo marcamos como STATUS_CHANGE, si no, UPDATED
    const action =
      validatedData.status && validatedData.status !== existingProcedure.status ? "STATUS_CHANGE" : "UPDATED";

    await prisma.expenseProcedureHistory.create({
      data: {
        procedureId: id,
        action,
        previousStatus: existingProcedure.status,
        newStatus: procedure.status,
        actorId: user.id,
        details:
          action === "UPDATED"
            ? "Actualización de datos generales"
            : `Cambio de estado manual: ${existingProcedure.status} -> ${procedure.status}`,
      },
    });

    return {
      success: true,
      procedure: {
        ...procedure,
        estimatedAmount: procedure.estimatedAmount?.toNumber() ?? null,
        approvedAmount: procedure.approvedAmount?.toNumber() ?? null,
      },
    };
  } catch (error) {
    console.error("Error updating procedure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al actualizar el expediente",
    };
  }
}

/**
 * Obtiene el historial de auditoría de un expediente
 */
export async function getProcedureHistory(procedureId: string) {
  const { userId } = await getAuthenticatedEmployee();

  // Validar acceso (simple) - Si puede ver el expediente, puede ver su historial
  // Ya se valida al cargar la página principal, aquí asumimos seguridad por contexto o añadimos doble check si necesario.

  const history = await prisma.expenseProcedureHistory.findMany({
    where: { procedureId },
    include: {
      actor: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return { success: true, history };
}
