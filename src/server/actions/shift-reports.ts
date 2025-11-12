/**
 * Server Actions para Informes de Turnos
 * Sprint 6
 */

"use server";

import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from "date-fns";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Obtener estadísticas generales de turnos para una organización
 */
export async function getShiftStatsForOrg(startDate: Date, endDate: Date) {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  const orgId = session.user.orgId;

  // Total de turnos en el período
  const totalShifts = await prisma.shift.count({
    where: {
      orgId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Turnos por estado
  const shiftsByStatus = await prisma.shift.groupBy({
    by: ["status"],
    where: {
      orgId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
  });

  // Total de asignaciones
  const totalAssignments = await prisma.shiftAssignment.count({
    where: {
      shift: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
  });

  // Asignaciones con anomalías
  const assignmentsWithAnomalies = await prisma.shiftAssignment.count({
    where: {
      shift: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      OR: [{ wasAbsent: true }, { hasDelay: true }, { hasEarlyDeparture: true }, { workedOutsideShift: true }],
    },
  });

  // Ausencias
  const absences = await prisma.shiftAssignment.count({
    where: {
      shift: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      wasAbsent: true,
    },
  });

  // Retrasos
  const delays = await prisma.shiftAssignment.count({
    where: {
      shift: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      hasDelay: true,
    },
  });

  // Promedio de minutos de retraso
  const avgDelayResult = await prisma.shiftAssignment.aggregate({
    where: {
      shift: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      hasDelay: true,
    },
    _avg: {
      delayMinutes: true,
    },
  });

  // Total de horas planificadas vs trabajadas
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      shift: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: "CLOSED",
      },
    },
    include: {
      shift: true,
    },
  });

  let totalPlannedMinutes = 0;
  let totalWorkedMinutes = 0;

  for (const assignment of assignments) {
    totalPlannedMinutes += assignment.plannedMinutes;
    totalWorkedMinutes += assignment.actualWorkedMinutes ?? 0;
  }

  return {
    totalShifts,
    shiftsByStatus: shiftsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    ),
    totalAssignments,
    assignmentsWithAnomalies,
    absences,
    delays,
    avgDelayMinutes: avgDelayResult["_avg"].delayMinutes ?? 0,
    totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 10) / 10,
    totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 10) / 10,
    complianceRate:
      totalAssignments > 0 ? Math.round(((totalAssignments - assignmentsWithAnomalies) / totalAssignments) * 100) : 100,
    absenceRate: totalAssignments > 0 ? Math.round((absences / totalAssignments) * 100) : 0,
  };
}

/**
 * Obtener informe detallado por empleado
 */
export async function getShiftReportByEmployee(employeeId: string, startDate: Date, endDate: Date) {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: true,
    },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado");
  }

  // Obtener todas las asignaciones del empleado en el período
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      shift: {
        include: {
          costCenter: true,
          position: true,
        },
      },
    },
    orderBy: {
      shift: {
        date: "desc",
      },
    },
  });

  // Calcular estadísticas
  const totalShifts = assignments.length;
  const completedShifts = assignments.filter((a) => a.status === "COMPLETED").length;
  const absences = assignments.filter((a) => a.wasAbsent).length;
  const delays = assignments.filter((a) => a.hasDelay).length;
  const earlyDepartures = assignments.filter((a) => a.hasEarlyDeparture).length;

  const totalPlannedMinutes = assignments.reduce((sum, a) => sum + a.plannedMinutes, 0);
  const totalWorkedMinutes = assignments.reduce((sum, a) => sum + (a.actualWorkedMinutes ?? 0), 0);

  const avgDelayMinutes =
    delays > 0 ? assignments.filter((a) => a.hasDelay).reduce((sum, a) => sum + a.delayMinutes, 0) / delays : 0;

  return {
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      department: employee.department?.name,
    },
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: differenceInDays(endDate, startDate) + 1,
    },
    stats: {
      totalShifts,
      completedShifts,
      absences,
      delays,
      earlyDepartures,
      totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 10) / 10,
      totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 10) / 10,
      avgDelayMinutes: Math.round(avgDelayMinutes * 10) / 10,
      complianceRate:
        totalShifts > 0 ? Math.round(((completedShifts - delays - earlyDepartures) / totalShifts) * 100) : 100,
      absenceRate: totalShifts > 0 ? Math.round((absences / totalShifts) * 100) : 0,
    },
    assignments: assignments.map((a) => ({
      id: a.id,
      date: a.shift.date.toISOString(),
      startTime: a.shift.startTime,
      endTime: a.shift.endTime,
      costCenter: a.shift.costCenter.name,
      position: a.shift.position?.name,
      status: a.status,
      plannedMinutes: a.plannedMinutes,
      actualWorkedMinutes: a.actualWorkedMinutes,
      wasAbsent: a.wasAbsent,
      hasDelay: a.hasDelay,
      delayMinutes: a.delayMinutes,
      hasEarlyDeparture: a.hasEarlyDeparture,
      earlyDepartureMinutes: a.earlyDepartureMinutes,
      workedOutsideShift: a.workedOutsideShift,
    })),
  };
}

/**
 * Obtener informe por centro de coste
 */
export async function getShiftReportByCostCenter(costCenterId: string, startDate: Date, endDate: Date) {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  const costCenter = await prisma.costCenter.findUnique({
    where: { id: costCenterId },
  });

  if (!costCenter) {
    throw new Error("Centro de coste no encontrado");
  }

  // Obtener todos los turnos del centro en el período
  const shifts = await prisma.shift.findMany({
    where: {
      costCenterId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      assignments: {
        include: {
          employee: true,
        },
      },
      position: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  // Calcular estadísticas
  const totalShifts = shifts.length;
  const publishedShifts = shifts.filter((s) => s.status === "PUBLISHED" || s.status === "CLOSED").length;

  const allAssignments = shifts.flatMap((s) => s.assignments);
  const totalAssignments = allAssignments.length;
  const absences = allAssignments.filter((a) => a.wasAbsent).length;
  const delays = allAssignments.filter((a) => a.hasDelay).length;

  const totalPlannedMinutes = allAssignments.reduce((sum, a) => sum + a.plannedMinutes, 0);
  const totalWorkedMinutes = allAssignments.reduce((sum, a) => sum + (a.actualWorkedMinutes ?? 0), 0);

  // Turnos por día de la semana
  const shiftsByWeekday = shifts.reduce(
    (acc, shift) => {
      const weekday = shift.date.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      acc[weekday] = (acc[weekday] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  // Empleados únicos que trabajaron
  const uniqueEmployees = new Set(allAssignments.map((a) => a.employeeId));

  return {
    costCenter: {
      id: costCenter.id,
      name: costCenter.name,
      code: costCenter.code,
    },
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: differenceInDays(endDate, startDate) + 1,
    },
    stats: {
      totalShifts,
      publishedShifts,
      totalAssignments,
      uniqueEmployees: uniqueEmployees.size,
      absences,
      delays,
      totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 10) / 10,
      totalWorkedHours: Math.round((totalWorkedMinutes / 60) * 10) / 10,
      complianceRate:
        totalAssignments > 0 ? Math.round(((totalAssignments - absences - delays) / totalAssignments) * 100) : 100,
      absenceRate: totalAssignments > 0 ? Math.round((absences / totalAssignments) * 100) : 0,
    },
    shiftsByWeekday,
    shifts: shifts.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      position: s.position?.name,
      status: s.status,
      requiredEmployees: s.requiredEmployees,
      assignedEmployees: s.assignments.length,
      assignments: s.assignments.map((a) => ({
        employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
        status: a.status,
        wasAbsent: a.wasAbsent,
        hasDelay: a.hasDelay,
        delayMinutes: a.delayMinutes,
      })),
    })),
  };
}

/**
 * Obtener datos para gráfico de cumplimiento diario
 */
export async function getComplianceChartData(startDate: Date, endDate: Date, costCenterId?: string) {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  const orgId = session.user.orgId;

  // Obtener asignaciones agrupadas por día
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      shift: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(costCenterId && { costCenterId }),
        status: "CLOSED",
      },
    },
    include: {
      shift: true,
    },
  });

  // Agrupar por fecha
  const dataByDate = assignments.reduce(
    (acc, assignment) => {
      const dateKey = assignment.shift.date.toISOString().split("T")[0];

      acc[dateKey] ??= {
        date: dateKey,
        total: 0,
        completed: 0,
        absences: 0,
        delays: 0,
        earlyDepartures: 0,
      };

      acc[dateKey].total++;
      if (assignment.status === "COMPLETED") acc[dateKey].completed++;
      if (assignment.wasAbsent) acc[dateKey].absences++;
      if (assignment.hasDelay) acc[dateKey].delays++;
      if (assignment.hasEarlyDeparture) acc[dateKey].earlyDepartures++;

      return acc;
    },
    {} as Record<string, any>,
  );

  // Convertir a array y calcular porcentaje de cumplimiento
  return Object.values(dataByDate).map((day: any) => ({
    date: day.date,
    total: day.total,
    completed: day.completed,
    absences: day.absences,
    delays: day.delays,
    earlyDepartures: day.earlyDepartures,
    complianceRate:
      day.total > 0 ? Math.round(((day.completed - day.delays - day.earlyDepartures) / day.total) * 100) : 100,
  }));
}

/**
 * Obtener ranking de empleados por cumplimiento
 */
export async function getEmployeeComplianceRanking(startDate: Date, endDate: Date, limit: number = 10) {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("No autorizado");
  }

  const orgId = session.user.orgId;

  // Obtener todas las asignaciones del período
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      shift: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: "CLOSED",
      },
    },
    include: {
      employee: true,
    },
  });

  // Agrupar por empleado
  const statsByEmployee = assignments.reduce(
    (acc, assignment) => {
      const empId = assignment.employeeId;

      acc[empId] ??= {
        employee: assignment.employee,
        totalShifts: 0,
        absences: 0,
        delays: 0,
        earlyDepartures: 0,
        totalDelayMinutes: 0,
      };

      acc[empId].totalShifts++;
      if (assignment.wasAbsent) acc[empId].absences++;
      if (assignment.hasDelay) {
        acc[empId].delays++;
        acc[empId].totalDelayMinutes += assignment.delayMinutes;
      }
      if (assignment.hasEarlyDeparture) acc[empId].earlyDepartures++;

      return acc;
    },
    {} as Record<string, any>,
  );

  // Convertir a array y calcular métricas
  const ranking = Object.values(statsByEmployee).map((stats: any) => ({
    employeeId: stats.employee.id,
    employeeName: `${stats.employee.firstName} ${stats.employee.lastName}`,
    employeeNumber: stats.employee.employeeNumber,
    totalShifts: stats.totalShifts,
    absences: stats.absences,
    delays: stats.delays,
    earlyDepartures: stats.earlyDepartures,
    avgDelayMinutes: stats.delays > 0 ? Math.round((stats.totalDelayMinutes / stats.delays) * 10) / 10 : 0,
    complianceRate:
      stats.totalShifts > 0
        ? Math.round(
            ((stats.totalShifts - stats.absences - stats.delays - stats.earlyDepartures) / stats.totalShifts) * 100,
          )
        : 100,
    absenceRate: stats.totalShifts > 0 ? Math.round((stats.absences / stats.totalShifts) * 100) : 0,
  }));

  // Ordenar por tasa de cumplimiento descendente
  ranking.sort((a, b) => b.complianceRate - a.complianceRate);

  return ranking.slice(0, limit);
}
