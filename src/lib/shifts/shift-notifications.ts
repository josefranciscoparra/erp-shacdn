/**
 * Sistema de notificaciones para turnos
 * Sprint 5.5
 */

import { prisma } from "@/lib/prisma";

/**
 * Tipos de notificación de turnos
 */
export enum ShiftNotificationType {
  LATE_ARRIVAL = "SHIFT_LATE_ARRIVAL",
  EARLY_DEPARTURE = "SHIFT_EARLY_DEPARTURE",
  ABSENCE = "SHIFT_ABSENCE",
  OUTSIDE_SHIFT = "SHIFT_OUTSIDE_SHIFT",
  SHIFT_PUBLISHED = "SHIFT_PUBLISHED",
  SHIFT_CANCELLED = "SHIFT_CANCELLED",
  SHIFT_MODIFIED = "SHIFT_MODIFIED",
}

/**
 * Crear notificación de retraso
 */
export async function notifyLateArrival(employeeId: string, shiftId: string, delayMinutes: number, managerId?: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { costCenter: true, position: true },
  });

  if (!shift) return;

  // Obtener managers del centro
  const managers = managerId ? [managerId] : await getShiftManagers(shift.orgId, shift.costCenterId);

  for (const manager of managers) {
    await prisma.notification.create({
      data: {
        userId: manager,
        orgId: shift.orgId,
        title: "Retraso en turno",
        message: `El empleado llegó ${delayMinutes} minutos tarde a su turno de ${shift.startTime} en ${shift.costCenter.name}`,
        type: ShiftNotificationType.LATE_ARRIVAL,
        category: "SHIFTS",
        priority: delayMinutes > 30 ? "HIGH" : "MEDIUM",
        metadata: {
          shiftId,
          employeeId,
          delayMinutes,
        },
      },
    });
  }
}

/**
 * Crear notificación de ausencia
 */
export async function notifyAbsence(employeeId: string, shiftId: string, managerId?: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { costCenter: true, position: true },
  });

  if (!shift) return;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) return;

  // Obtener managers del centro
  const managers = managerId ? [managerId] : await getShiftManagers(shift.orgId, shift.costCenterId);

  for (const manager of managers) {
    await prisma.notification.create({
      data: {
        userId: manager,
        orgId: shift.orgId,
        title: "Ausencia en turno",
        message: `${employee.firstName} ${employee.lastName} no fichó en su turno de ${shift.startTime} en ${shift.costCenter.name}`,
        type: ShiftNotificationType.ABSENCE,
        category: "SHIFTS",
        priority: "HIGH",
        metadata: {
          shiftId,
          employeeId,
        },
      },
    });
  }
}

/**
 * Crear notificación de trabajo fuera de turno
 */
export async function notifyOutsideShift(employeeId: string, shiftId: string, managerId?: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { costCenter: true },
  });

  if (!shift) return;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) return;

  // Obtener managers del centro
  const managers = managerId ? [managerId] : await getShiftManagers(shift.orgId, shift.costCenterId);

  for (const manager of managers) {
    await prisma.notification.create({
      data: {
        userId: manager,
        orgId: shift.orgId,
        title: "Trabajo fuera de turno",
        message: `${employee.firstName} ${employee.lastName} fichó fuera de su horario de turno en ${shift.costCenter.name}`,
        type: ShiftNotificationType.OUTSIDE_SHIFT,
        category: "SHIFTS",
        priority: "MEDIUM",
        metadata: {
          shiftId,
          employeeId,
        },
      },
    });
  }
}

/**
 * Notificar empleado sobre turno publicado
 */
export async function notifyShiftPublished(employeeId: string, shiftId: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { costCenter: true, position: true },
  });

  if (!shift) return;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });

  if (!employee?.user) return;

  await prisma.notification.create({
    data: {
      userId: employee.user.id,
      orgId: shift.orgId,
      title: "Nuevo turno asignado",
      message: `Se te ha asignado un turno el ${shift.date.toLocaleDateString()} de ${shift.startTime} a ${shift.endTime} en ${shift.costCenter.name}`,
      type: ShiftNotificationType.SHIFT_PUBLISHED,
      category: "SHIFTS",
      priority: "NORMAL",
      metadata: {
        shiftId,
        date: shift.date.toISOString(),
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
    },
  });
}

/**
 * Obtener managers responsables de un centro
 */
async function getShiftManagers(orgId: string, costCenterId: string): Promise<string[]> {
  // Obtener planners con permiso de aprobación para el centro
  const planners = await prisma.shiftPlanner.findMany({
    where: {
      orgId,
      OR: [
        { costCenterId, canApprove: true },
        { isGlobal: true, canApprove: true },
      ],
    },
    select: {
      userId: true,
    },
  });

  // También incluir admins de la organización
  const admins = await prisma.user.findMany({
    where: {
      orgId,
      role: {
        in: ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"],
      },
    },
    select: {
      id: true,
    },
  });

  return [...planners.map((p) => p.userId), ...admins.map((a) => a.id)];
}

/**
 * Procesar notificaciones de anomalías en lote
 * (llamado por el cron job)
 */
export async function processShiftAnomalyNotifications(date: Date) {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      shift: {
        date: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
        status: "CLOSED",
      },
      OR: [
        { wasAbsent: true },
        { hasDelay: true, delayMinutes: { gt: 15 } }, // Solo retrasos > 15 min
        { workedOutsideShift: true },
      ],
    },
    include: {
      shift: true,
    },
  });

  let notificationsCreated = 0;

  for (const assignment of assignments) {
    if (assignment.wasAbsent) {
      await notifyAbsence(assignment.employeeId, assignment.shift.id);
      notificationsCreated++;
    }

    if (assignment.hasDelay && assignment.delayMinutes > 15) {
      await notifyLateArrival(assignment.employeeId, assignment.shift.id, assignment.delayMinutes);
      notificationsCreated++;
    }

    if (assignment.workedOutsideShift) {
      await notifyOutsideShift(assignment.employeeId, assignment.shift.id);
      notificationsCreated++;
    }
  }

  return notificationsCreated;
}
