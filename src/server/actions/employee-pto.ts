"use server";

import { Decimal } from "@prisma/client/runtime/library";
import { isSameDay } from "date-fns";

import { prisma } from "@/lib/prisma";

import { createNotification } from "./notifications";
import { calculateOrUpdatePtoBalance, recalculatePtoBalance } from "./pto-balance";
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

/**
 * Obtiene el aprobador por defecto para un empleado
 * Prioridad: Manager del contrato > HR_ADMIN
 */
async function getDefaultApprover(employeeId: string, orgId: string): Promise<string> {
  // Buscar el manager del empleado en su contrato activo
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
      weeklyHours: {
        gt: new Decimal(0),
      },
    },
    include: {
      manager: {
        include: {
          user: true,
        },
      },
    },
  });

  if (contract?.manager?.user) {
    return contract.manager.user.id;
  }

  // Si no tiene manager, buscar un usuario con rol HR_ADMIN
  const hrAdmin = await prisma.user.findFirst({
    where: {
      orgId,
      role: "HR_ADMIN",
      active: true,
    },
  });

  if (hrAdmin) {
    return hrAdmin.id;
  }

  throw new Error("No se encontró un aprobador disponible");
}

/**
 * Calcula días hábiles entre dos fechas, excluyendo fines de semana y festivos
 */
export async function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  employeeId: string,
  orgId: string,
): Promise<{ workingDays: number; holidays: Array<{ date: Date; name: string }> }> {
  // Obtener el centro de coste del empleado para saber qué calendarios aplican
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      employmentContracts: {
        where: { active: true },
        include: {
          costCenter: {
            include: {
              calendars: {
                where: { active: true },
                include: {
                  events: {
                    where: {
                      eventType: "HOLIDAY",
                      date: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        take: 1,
      },
    },
  });

  // Recopilar festivos
  const holidaysMap = new Map<string, { date: Date; name: string }>();

  const calendars = employee?.employmentContracts[0]?.costCenter?.calendars ?? [];

  for (const calendar of calendars) {
    for (const event of calendar.events) {
      const dateStr = event.date.toISOString().split("T")[0];
      if (!holidaysMap.has(dateStr)) {
        holidaysMap.set(dateStr, {
          date: event.date,
          name: event.name,
        });
      }
    }
  }

  // Contar días hábiles
  let workingDays = 0;
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split("T")[0];

    // Excluir sábados (6) y domingos (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Excluir festivos
      if (!holidaysMap.has(dateStr)) {
        workingDays++;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    workingDays,
    holidays: Array.from(holidaysMap.values()),
  };
}

/**
 * Obtiene el balance de PTO del empleado autenticado
 */
export async function getMyPtoBalance() {
  try {
    const { employeeId, orgId, hasActiveContract, hasProvisionalContract, activeContract } =
      await getAuthenticatedEmployee();
    const currentYear = new Date().getFullYear();

    if (!hasActiveContract || !activeContract) {
      return {
        id: "NO_CONTRACT",
        year: currentYear,
        annualAllowance: 0,
        daysUsed: 0,
        daysPending: 0,
        daysAvailable: 0,
        hasActiveContract: false,
        hasProvisionalContract,
      };
    }

    // Calcular o actualizar el balance
    const balance = await calculateOrUpdatePtoBalance(employeeId, orgId, currentYear);

    return {
      ...balance,
      hasActiveContract: true,
      hasProvisionalContract,
    };
  } catch (error) {
    console.error("Error al obtener balance de PTO:", error);
    throw error;
  }
}

/**
 * Obtiene los tipos de ausencia disponibles
 */
export async function getAbsenceTypes() {
  try {
    const { orgId } = await getAuthenticatedEmployee();

    const types = await prisma.absenceType.findMany({
      where: {
        orgId,
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return types;
  } catch (error) {
    console.error("Error al obtener tipos de ausencia:", error);
    throw error;
  }
}

/**
 * Obtiene las solicitudes de PTO del empleado autenticado
 */
export async function getMyPtoRequests() {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    const requests = await prisma.ptoRequest.findMany({
      where: {
        employeeId,
        orgId,
      },
      include: {
        absenceType: true,
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    return requests.map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: r.endDate,
      workingDays: Number(r.workingDays),
      status: r.status,
      reason: r.reason,
      attachmentUrl: r.attachmentUrl,
      submittedAt: r.submittedAt,
      approvedAt: r.approvedAt,
      rejectedAt: r.rejectedAt,
      cancelledAt: r.cancelledAt,
      approverComments: r.approverComments,
      rejectionReason: r.rejectionReason,
      cancellationReason: r.cancellationReason,
      absenceType: r.absenceType,
      approver: r.approver,
    }));
  } catch (error) {
    console.error("Error al obtener solicitudes de PTO:", error);
    throw error;
  }
}

/**
 * Crea una nueva solicitud de PTO
 */
export async function createPtoRequest(data: {
  absenceTypeId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  attachmentUrl?: string;
}) {
  try {
    const { employeeId, orgId, employee } = await getAuthenticatedEmployee({
      requireActiveContract: true,
    });

    // Validar fechas
    if (data.startDate > data.endDate) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    // Obtener tipo de ausencia
    const absenceType = await prisma.absenceType.findUnique({
      where: { id: data.absenceTypeId },
    });

    if (!absenceType || !absenceType.active) {
      throw new Error("Tipo de ausencia no válido");
    }

    // Calcular días hábiles
    const { workingDays, holidays } = await calculateWorkingDays(data.startDate, data.endDate, employeeId, orgId);

    // Validar días de anticipación
    const daysUntilStart = Math.ceil((data.startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (absenceType.minDaysAdvance > 0 && daysUntilStart < absenceType.minDaysAdvance) {
      throw new Error(`Esta ausencia requiere ${absenceType.minDaysAdvance} días de anticipación`);
    }

    // Validar que no haya solapamiento con otras solicitudes aprobadas
    const overlappingRequests = await prisma.ptoRequest.findFirst({
      where: {
        employeeId,
        orgId,
        status: "APPROVED",
        OR: [
          {
            startDate: {
              lte: data.endDate,
            },
            endDate: {
              gte: data.startDate,
            },
          },
        ],
      },
    });

    if (overlappingRequests) {
      throw new Error("Ya tienes una solicitud aprobada en estas fechas");
    }

    // Si afecta al balance, validar días disponibles
    if (absenceType.affectsBalance) {
      const currentYear = new Date().getFullYear();
      const balance = await calculateOrUpdatePtoBalance(employeeId, orgId, currentYear);

      if (balance.daysAvailable < workingDays) {
        throw new Error(
          `No tienes suficientes días disponibles (te faltan ${workingDays - balance.daysAvailable} días)`,
        );
      }
    }

    // Obtener aprobador
    const approverId = await getDefaultApprover(employeeId, orgId);

    // Crear la solicitud
    const request = await prisma.ptoRequest.create({
      data: {
        orgId,
        employeeId,
        absenceTypeId: data.absenceTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        workingDays: new Decimal(workingDays),
        reason: data.reason,
        attachmentUrl: data.attachmentUrl,
        status: absenceType.requiresApproval ? "PENDING" : "APPROVED",
        approverId: absenceType.requiresApproval ? approverId : undefined,
        approvedAt: absenceType.requiresApproval ? undefined : new Date(),
      },
      include: {
        absenceType: true,
        approver: {
          select: {
            name: true,
          },
        },
      },
    });

    // Recalcular balance
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(employeeId, orgId, currentYear);

    // Crear notificación para el aprobador
    if (absenceType.requiresApproval && approverId) {
      await createNotification(
        approverId,
        orgId,
        "PTO_SUBMITTED",
        "Nueva solicitud de vacaciones",
        `${employee.firstName} ${employee.lastName} ha solicitado ${workingDays} días de ${absenceType.name}`,
        request.id,
      );
    }

    return {
      success: true,
      request: {
        id: request.id,
        workingDays,
        holidays,
      },
    };
  } catch (error) {
    console.error("Error al crear solicitud de PTO:", error);
    throw error;
  }
}

/**
 * Cancela una solicitud de PTO pendiente
 */
export async function cancelPtoRequest(requestId: string, reason?: string) {
  try {
    const { employeeId, orgId, employee } = await getAuthenticatedEmployee();

    // Obtener la solicitud
    const request = await prisma.ptoRequest.findUnique({
      where: {
        id: requestId,
        employeeId, // Seguridad: solo puede cancelar sus propias solicitudes
      },
      include: {
        absenceType: true,
      },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada");
    }

    if (request.status !== "PENDING") {
      throw new Error("Solo se pueden cancelar solicitudes pendientes");
    }

    // Actualizar la solicitud
    await prisma.ptoRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    // Recalcular balance
    const currentYear = new Date().getFullYear();
    await recalculatePtoBalance(employeeId, orgId, currentYear);

    // Notificar al aprobador
    if (request.approverId) {
      await createNotification(
        request.approverId,
        orgId,
        "PTO_CANCELLED",
        "Solicitud cancelada",
        `${employee.firstName} ${employee.lastName} ha cancelado su solicitud de ${request.absenceType.name}`,
        requestId,
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error al cancelar solicitud:", error);
    throw error;
  }
}
