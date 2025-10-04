"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

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
  if (!["ADMIN", "HR", "MANAGER"].includes(user.role)) {
    throw new Error("No tienes permisos para ver esta información");
  }

  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
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

    return summaries;
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
        department: employee.department?.name || "Sin departamento",
        costCenter: employee.costCenter?.name || "Sin centro de coste",
        status,
        lastAction,
        todayWorkedMinutes: todaySummary?.totalWorkedMinutes || 0,
        todayBreakMinutes: todaySummary?.totalBreakMinutes || 0,
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
      (acc, s) => acc + s.totalWorkedMinutes,
      0
    );
    const totalBreakMinutes = summaries.reduce(
      (acc, s) => acc + s.totalBreakMinutes,
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
