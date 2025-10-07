"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, eachDayOfInterval, isWeekend } from "date-fns";

// Helper: Calcular días laborables en un período
// Considera: inicio de contrato, fines de semana
// TODO: En el futuro, excluir también festivos y vacaciones
function calculateWorkableDays(
  periodStart: Date,
  periodEnd: Date,
  contractStartDate: Date | null
): number {
  // El período efectivo empieza en la fecha más tardía entre el inicio del período y el inicio del contrato
  const effectiveStart = contractStartDate && contractStartDate > periodStart
    ? contractStartDate
    : periodStart;

  // Si el contrato empieza después del período, no hay días laborables
  if (effectiveStart > periodEnd) return 0;

  const days = eachDayOfInterval({ start: effectiveStart, end: periodEnd });

  // Contar solo días laborables (lunes a viernes)
  // TODO: Aquí se podrán excluir festivos y días de vacaciones en el futuro
  const workableDays = days.filter(day => !isWeekend(day)).length;

  return workableDays;
}

// Tipos de filtros
export interface TimeTrackingFilters {
  employeeId?: string;
  departmentId?: string;
  costCenterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT";
}

// Helper para verificar permisos de administrador
async function checkAdminPermissions() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      orgId: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Verificar que tenga permisos (admin, HR, o manager)
  if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "MANAGER"].includes(user.role)) {
    throw new Error("No tienes permisos para ver esta información");
  }

  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

// Obtener lista de empleados para time tracking
export async function getEmployeesForTimeTracking() {
  try {
    const { orgId } = await checkAdminPermissions();

    const today = new Date();
    const dayStart = startOfDay(today);

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        active: true,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        employmentContracts: {
          where: {
            active: true,
          },
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 1,
        },
        timeEntries: {
          where: {
            timestamp: {
              gte: dayStart,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
        workdaySummaries: {
          where: {
            date: dayStart,
          },
          take: 1,
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return employees.map((employee) => {
      const lastEntry = employee.timeEntries[0];
      const todaySummary = employee.workdaySummaries[0];
      const contract = employee.employmentContracts[0];

      let status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK" = "CLOCKED_OUT";

      if (lastEntry) {
        switch (lastEntry.entryType) {
          case "CLOCK_IN":
          case "BREAK_END":
            status = "CLOCKED_IN";
            break;
          case "BREAK_START":
            status = "ON_BREAK";
            break;
          case "CLOCK_OUT":
          default:
            status = "CLOCKED_OUT";
            break;
        }
      }

      return {
        id: employee.id,
        name: employee.user?.name || "Sin nombre",
        email: employee.user?.email || "",
        image: employee.user?.image,
        department: contract?.department?.name || "Sin departamento",
        status,
        lastAction: lastEntry?.timestamp || null,
        todayWorkedMinutes: todaySummary ? Number(todaySummary.totalWorkedMinutes) : 0,
      };
    });
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    throw error;
  }
}

// Obtener resumen semanal de un empleado
export async function getEmployeeWeeklySummary(
  employeeId: string,
  dateFrom?: Date,
  dateTo?: Date
) {
  try {
    const { orgId } = await checkAdminPermissions();

    // Obtener contrato activo para horas esperadas
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    const activeContract = employee?.employmentContracts[0];
    const weeklyHours = activeContract?.weeklyHours ? Number(activeContract.weeklyHours) : 40;
    const dailyHours = weeklyHours / 5; // Asumiendo 5 días laborables por semana
    const contractStartDate = activeContract?.startDate || null;

    const where: any = {
      orgId,
      employeeId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      orderBy: {
        date: "asc",
      },
    });

    // Agrupar por semana
    const weeklyData = new Map<string, {
      weekStart: Date;
      weekEnd: Date;
      totalWorkedMinutes: number;
      totalBreakMinutes: number;
      daysWorked: number;
      daysCompleted: number;
      daysIncomplete: number;
      daysAbsent: number;
    }>();

    summaries.forEach(summary => {
      const weekStart = startOfWeek(new Date(summary.date), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(summary.date), { weekStartsOn: 1 });
      const weekKey = weekStart.toISOString();

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          weekStart,
          weekEnd,
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          daysWorked: 0,
          daysCompleted: 0,
          daysIncomplete: 0,
          daysAbsent: 0,
        });
      }

      const week = weeklyData.get(weekKey)!;
      week.totalWorkedMinutes += Number(summary.totalWorkedMinutes);
      week.totalBreakMinutes += Number(summary.totalBreakMinutes);
      week.daysWorked++;

      if (summary.status === "COMPLETED") week.daysCompleted++;
      if (summary.status === "INCOMPLETE") week.daysIncomplete++;
      if (summary.status === "ABSENT") week.daysAbsent++;
    });

    return Array.from(weeklyData.values()).map(week => {
      // Calcular días laborables esperados en esta semana (considerando inicio de contrato)
      const expectedDays = calculateWorkableDays(week.weekStart, week.weekEnd, contractStartDate);
      const expectedHours = expectedDays * dailyHours;

      const actualHours = week.totalWorkedMinutes / 60;
      const compliance = expectedHours > 0 ? (actualHours / expectedHours) * 100 : 0;
      const averageDaily = week.daysWorked > 0 ? actualHours / week.daysWorked : 0;

      let status: "complete" | "incomplete" | "absent";
      if (compliance >= 95) status = "complete";
      else if (compliance >= 70) status = "incomplete";
      else status = "absent";

      return {
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        totalWorkedMinutes: week.totalWorkedMinutes,
        totalBreakMinutes: week.totalBreakMinutes,
        expectedHours: Math.round(expectedHours * 100) / 100,
        actualHours: Math.round(actualHours * 100) / 100,
        compliance: Math.round(compliance),
        daysWorked: week.daysWorked,
        expectedDays,
        daysCompleted: week.daysCompleted,
        daysIncomplete: week.daysIncomplete,
        daysAbsent: week.daysAbsent,
        averageDaily: Math.round(averageDaily * 100) / 100,
        status,
      };
    });
  } catch (error) {
    console.error("Error al obtener resumen semanal:", error);
    throw error;
  }
}

// Obtener resumen mensual de un empleado
export async function getEmployeeMonthlySummary(
  employeeId: string,
  dateFrom?: Date,
  dateTo?: Date
) {
  try {
    const { orgId } = await checkAdminPermissions();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    const activeContract = employee?.employmentContracts[0];
    const weeklyHours = activeContract?.weeklyHours ? Number(activeContract.weeklyHours) : 40;
    const dailyHours = weeklyHours / 5;
    const contractStartDate = activeContract?.startDate || null;

    const where: any = {
      orgId,
      employeeId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      orderBy: {
        date: "asc",
      },
    });

    // Agrupar por mes
    const monthlyData = new Map<string, {
      month: Date;
      totalWorkedMinutes: number;
      totalBreakMinutes: number;
      daysWorked: number;
      daysCompleted: number;
      daysIncomplete: number;
      daysAbsent: number;
    }>();

    summaries.forEach(summary => {
      const month = startOfMonth(new Date(summary.date));
      const monthKey = month.toISOString();

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month,
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          daysWorked: 0,
          daysCompleted: 0,
          daysIncomplete: 0,
          daysAbsent: 0,
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.totalWorkedMinutes += Number(summary.totalWorkedMinutes);
      monthData.totalBreakMinutes += Number(summary.totalBreakMinutes);
      monthData.daysWorked++;

      if (summary.status === "COMPLETED") monthData.daysCompleted++;
      if (summary.status === "INCOMPLETE") monthData.daysIncomplete++;
      if (summary.status === "ABSENT") monthData.daysAbsent++;
    });

    return Array.from(monthlyData.values()).map(month => {
      // Calcular días laborables esperados en este mes (considerando inicio de contrato)
      const monthEnd = endOfMonth(month.month);
      const expectedDays = calculateWorkableDays(month.month, monthEnd, contractStartDate);
      const expectedHours = expectedDays * dailyHours;

      const actualHours = month.totalWorkedMinutes / 60;
      const averageDaily = month.daysWorked > 0 ? actualHours / month.daysWorked : 0;
      const averageWeekly = actualHours / 4.33; // Promedio de semanas por mes
      const compliance = expectedHours > 0 ? (actualHours / expectedHours) * 100 : 0;

      return {
        month: month.month,
        totalWorkedMinutes: month.totalWorkedMinutes,
        totalBreakMinutes: month.totalBreakMinutes,
        actualHours: Math.round(actualHours * 100) / 100,
        expectedHours: Math.round(expectedHours * 100) / 100,
        averageDaily: Math.round(averageDaily * 100) / 100,
        averageWeekly: Math.round(averageWeekly * 100) / 100,
        compliance: Math.round(compliance),
        daysWorked: month.daysWorked,
        expectedDays,
        daysCompleted: month.daysCompleted,
        daysIncomplete: month.daysIncomplete,
        daysAbsent: month.daysAbsent,
      };
    });
  } catch (error) {
    console.error("Error al obtener resumen mensual:", error);
    throw error;
  }
}

// Obtener resumen anual de un empleado
export async function getEmployeeYearlySummary(
  employeeId: string,
  dateFrom?: Date,
  dateTo?: Date
) {
  try {
    const { orgId } = await checkAdminPermissions();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    const activeContract = employee?.employmentContracts[0];
    const weeklyHours = activeContract?.weeklyHours ? Number(activeContract.weeklyHours) : 40;
    const dailyHours = weeklyHours / 5;
    const contractStartDate = activeContract?.startDate || null;

    const where: any = {
      orgId,
      employeeId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      orderBy: {
        date: "asc",
      },
    });

    // Agrupar por año
    const yearlyData = new Map<string, {
      year: number;
      totalWorkedMinutes: number;
      totalBreakMinutes: number;
      daysWorked: number;
      daysCompleted: number;
      daysIncomplete: number;
      daysAbsent: number;
    }>();

    summaries.forEach(summary => {
      const year = new Date(summary.date).getFullYear();
      const yearKey = year.toString();

      if (!yearlyData.has(yearKey)) {
        yearlyData.set(yearKey, {
          year,
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          daysWorked: 0,
          daysCompleted: 0,
          daysIncomplete: 0,
          daysAbsent: 0,
        });
      }

      const yearData = yearlyData.get(yearKey)!;
      yearData.totalWorkedMinutes += Number(summary.totalWorkedMinutes);
      yearData.totalBreakMinutes += Number(summary.totalBreakMinutes);
      yearData.daysWorked++;

      if (summary.status === "COMPLETED") yearData.daysCompleted++;
      if (summary.status === "INCOMPLETE") yearData.daysIncomplete++;
      if (summary.status === "ABSENT") yearData.daysAbsent++;
    });

    return Array.from(yearlyData.values()).map(year => {
      // Calcular días laborables esperados en este año (considerando inicio de contrato)
      const yearStart = startOfYear(new Date(year.year, 0, 1));
      const yearEnd = endOfYear(new Date(year.year, 11, 31));
      const expectedDays = calculateWorkableDays(yearStart, yearEnd, contractStartDate);
      const expectedHours = expectedDays * dailyHours;

      const actualHours = year.totalWorkedMinutes / 60;
      const averageMonthly = actualHours / 12;
      const attendanceRate = year.daysWorked > 0
        ? (year.daysCompleted / year.daysWorked) * 100
        : 0;

      return {
        year: year.year,
        totalWorkedMinutes: year.totalWorkedMinutes,
        totalBreakMinutes: year.totalBreakMinutes,
        actualHours: Math.round(actualHours),
        expectedHours: Math.round(expectedHours * 100) / 100,
        averageMonthly: Math.round(averageMonthly),
        attendanceRate: Math.round(attendanceRate),
        daysWorked: year.daysWorked,
        expectedDays,
        daysCompleted: year.daysCompleted,
        daysIncomplete: year.daysIncomplete,
        daysAbsent: year.daysAbsent,
      };
    });
  } catch (error) {
    console.error("Error al obtener resumen anual:", error);
    throw error;
  }
}

// Obtener historial de fichajes de un empleado
export async function getEmployeeTimeTrackingHistory(
  employeeId: string,
  filters: Omit<TimeTrackingFilters, "employeeId"> = {}
) {
  try {
    const { orgId } = await checkAdminPermissions();

    const where: any = {
      orgId,
      employeeId,
    };

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = startOfDay(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = endOfDay(filters.dateTo);
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
            employmentContracts: {
              where: {
                active: true,
              },
              include: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                costCenter: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        timeEntries: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return summaries.map(s => {
      const contract = s.employee.employmentContracts[0];

      // Recalcular el estado basándose en las horas trabajadas
      let status = s.status;
      if (s.clockOut) {
        const weeklyHours = contract?.weeklyHours ? Number(contract.weeklyHours) : 40;
        const dailyHours = weeklyHours / 5;
        const workedHours = Number(s.totalWorkedMinutes) / 60;
        const compliance = (workedHours / dailyHours) * 100;

        if (compliance >= 95) {
          status = "COMPLETED";
        } else {
          status = "INCOMPLETE";
        }
      }

      return {
        id: s.id,
        date: s.date,
        clockIn: s.clockIn,
        clockOut: s.clockOut,
        totalWorkedMinutes: Number(s.totalWorkedMinutes),
        totalBreakMinutes: Number(s.totalBreakMinutes),
        status,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        orgId: s.orgId,
        employeeId: s.employeeId,
        employee: {
          id: s.employee.id,
          user: s.employee.user,
          department: contract?.department || null,
          costCenter: contract?.costCenter || null,
        },
        timeEntries: s.timeEntries,
        totalWorkedHours: Math.round((Number(s.totalWorkedMinutes) / 60) * 100) / 100,
        totalBreakHours: Math.round((Number(s.totalBreakMinutes) / 60) * 100) / 100,
      };
    });
  } catch (error) {
    console.error("Error al obtener historial del empleado:", error);
    throw error;
  }
}

// Obtener todos los fichajes con filtros
export async function getTimeTrackingRecords(filters: TimeTrackingFilters = {}) {
  try {
    const { orgId } = await checkAdminPermissions();

    const where: any = {
      orgId,
    };

    // Aplicar filtros
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.departmentId) {
      where.employee = {
        departmentId: filters.departmentId,
      };
    }

    if (filters.costCenterId) {
      where.employee = {
        ...where.employee,
        costCenterId: filters.costCenterId,
      };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = startOfDay(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = endOfDay(filters.dateTo);
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            employmentContracts: {
              where: {
                active: true,
              },
              include: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                costCenter: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        timeEntries: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: [
        {
          date: "desc",
        },
        {
          employee: {
            user: {
              name: "asc",
            },
          },
        },
      ],
    });

    return summaries.map(s => {
      const contract = s.employee.employmentContracts[0];
      return {
        id: s.id,
        date: s.date,
        clockIn: s.clockIn,
        clockOut: s.clockOut,
        totalWorkedMinutes: Number(s.totalWorkedMinutes),
        totalBreakMinutes: Number(s.totalBreakMinutes),
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        orgId: s.orgId,
        employeeId: s.employeeId,
        employee: {
          id: s.employee.id,
          user: s.employee.user,
          department: contract?.department || null,
          costCenter: contract?.costCenter || null,
        },
        timeEntries: s.timeEntries,
      };
    });
  } catch (error) {
    console.error("Error al obtener fichajes:", error);
    throw error;
  }
}

// Obtener empleados activos trabajando ahora
export async function getCurrentlyWorkingEmployees() {
  try {
    const { orgId } = await checkAdminPermissions();

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Obtener todos los empleados con sus últimos fichajes de hoy
    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        user: {
          active: true,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        employmentContracts: {
          where: {
            active: true,
          },
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            costCenter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 1,
        },
        timeEntries: {
          where: {
            timestamp: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
        },
        workdaySummaries: {
          where: {
            date: dayStart,
          },
          take: 1,
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    // Determinar el estado actual de cada empleado
    const employeesWithStatus = employees.map((employee) => {
      const lastEntry = employee.timeEntries[0];
      const todaySummary = employee.workdaySummaries[0];
      const contract = employee.employmentContracts[0];

      let status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK" = "CLOCKED_OUT";
      let lastAction = null;

      if (lastEntry) {
        lastAction = lastEntry.timestamp;
        switch (lastEntry.entryType) {
          case "CLOCK_IN":
          case "BREAK_END":
            status = "CLOCKED_IN";
            break;
          case "BREAK_START":
            status = "ON_BREAK";
            break;
          case "CLOCK_OUT":
          default:
            status = "CLOCKED_OUT";
            break;
        }
      }

      return {
        id: employee.id,
        name: employee.user.name,
        email: employee.user.email,
        department: contract?.department?.name || "Sin departamento",
        costCenter: contract?.costCenter?.name || "Sin centro de coste",
        status,
        lastAction,
        todayWorkedMinutes: todaySummary ? Number(todaySummary.totalWorkedMinutes) : 0,
        todayBreakMinutes: todaySummary ? Number(todaySummary.totalBreakMinutes) : 0,
        clockIn: todaySummary?.clockIn,
        clockOut: todaySummary?.clockOut,
      };
    });

    return employeesWithStatus;
  } catch (error) {
    console.error("Error al obtener empleados trabajando:", error);
    throw error;
  }
}

// Obtener estadísticas generales
export async function getTimeTrackingStats(
  dateFrom?: Date,
  dateTo?: Date
) {
  try {
    const { orgId } = await checkAdminPermissions();

    const where: any = {
      orgId,
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = startOfDay(dateFrom);
      }
      if (dateTo) {
        where.date.lte = endOfDay(dateTo);
      }
    }

    const summaries = await prisma.workdaySummary.findMany({
      where,
    });

    const totalWorkedMinutes = summaries.reduce(
      (acc, s) => acc + Number(s.totalWorkedMinutes),
      0
    );
    const totalBreakMinutes = summaries.reduce(
      (acc, s) => acc + Number(s.totalBreakMinutes),
      0
    );

    const statusCounts = {
      IN_PROGRESS: summaries.filter((s) => s.status === "IN_PROGRESS").length,
      COMPLETED: summaries.filter((s) => s.status === "COMPLETED").length,
      INCOMPLETE: summaries.filter((s) => s.status === "INCOMPLETE").length,
      ABSENT: summaries.filter((s) => s.status === "ABSENT").length,
    };

    return {
      totalRecords: summaries.length,
      totalWorkedHours: Math.round(totalWorkedMinutes / 60),
      totalBreakHours: Math.round(totalBreakMinutes / 60),
      statusCounts,
      averageWorkedMinutesPerDay:
        summaries.length > 0
          ? Math.round(totalWorkedMinutes / summaries.length)
          : 0,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    throw error;
  }
}

// Obtener lista de empleados para filtros
export async function getEmployeesForFilter() {
  try {
    const { orgId } = await checkAdminPermissions();

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        user: {
          active: true,
        },
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return employees.map((emp) => ({
      id: emp.id,
      name: emp.user.name || emp.user.email,
    }));
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    throw error;
  }
}

// Obtener lista de departamentos para filtros
export async function getDepartmentsForFilter() {
  try {
    const { orgId } = await checkAdminPermissions();

    const departments = await prisma.department.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return departments;
  } catch (error) {
    console.error("Error al obtener departamentos:", error);
    throw error;
  }
}

// Obtener lista de centros de coste para filtros
export async function getCostCentersForFilter() {
  try {
    const { orgId } = await checkAdminPermissions();

    const costCenters = await prisma.costCenter.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return costCenters;
  } catch (error) {
    console.error("Error al obtener centros de coste:", error);
    throw error;
  }
}

// Exportar a CSV
export async function exportTimeTrackingToCSV(filters: TimeTrackingFilters = {}) {
  try {
    const summaries = await getTimeTrackingRecords(filters);

    // Crear CSV
    const headers = [
      "Fecha",
      "Empleado",
      "Email",
      "Departamento",
      "Centro de Coste",
      "Entrada",
      "Salida",
      "Horas Trabajadas",
      "Minutos Pausa",
      "Estado",
    ];

    const rows = summaries.map((summary) => [
      new Date(summary.date).toLocaleDateString("es-ES"),
      summary.employee.user.name || "Sin nombre",
      summary.employee.user.email,
      summary.employee.department?.name || "Sin departamento",
      summary.employee.costCenter?.name || "Sin centro de coste",
      summary.clockIn
        ? new Date(summary.clockIn).toLocaleTimeString("es-ES")
        : "--:--:--",
      summary.clockOut
        ? new Date(summary.clockOut).toLocaleTimeString("es-ES")
        : "--:--:--",
      `${Math.floor(summary.totalWorkedMinutes / 60)}h ${summary.totalWorkedMinutes % 60}m`,
      `${summary.totalBreakMinutes}m`,
      summary.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    return csvContent;
  } catch (error) {
    console.error("Error al exportar CSV:", error);
    throw error;
  }
}
