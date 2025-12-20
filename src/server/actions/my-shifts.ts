"use server";

import { startOfMonth, endOfMonth, format, differenceInHours } from "date-fns";

import type { MyShiftsMetrics } from "@/app/(main)/dashboard/me/shifts/_lib/my-shifts-types";
import type { Shift } from "@/app/(main)/dashboard/shifts/_lib/types";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveScheduleForRange, getWeekSchedule } from "@/services/schedules/schedule-engine";

import { getTodaySummaryLite, getWeeklySummaryLite } from "./time-tracking";

/**
 * Convierte minutos (ej: 540) a hora (ej: "09:00")
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function isActiveWorkEntryType(entryType: string | null): boolean {
  return entryType === "CLOCK_IN" || entryType === "BREAK_END" || entryType === "PROJECT_SWITCH";
}

/**
 * Obtiene las métricas del dashboard de turnos calculadas en el servidor
 */
export async function getMyShiftsDashboardMetrics(): Promise<MyShiftsMetrics | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true, employmentContracts: { where: { active: true }, take: 1 } },
    });

    if (!employee) return null;

    const today = new Date();

    // 1. Calcular Horas de la Semana (Planificadas vs Trabajadas)
    // Planificadas (Asignadas)
    const weekSchedule = await getWeekSchedule(employee.id, today);
    const weekHoursAssigned = weekSchedule.totalExpectedMinutes / 60;

    // Trabajadas (Completadas) - Incluyendo tiempo en vivo
    const [weeklySummary, todaySummary] = await Promise.all([getWeeklySummaryLite(), getTodaySummaryLite()]);

    let totalWorkedMinutes = weeklySummary.totalWorkedMinutes;

    if (isActiveWorkEntryType(todaySummary.lastEntryType) && todaySummary.lastEntryTime) {
      const now = new Date();
      const startTime = new Date(todaySummary.lastEntryTime);
      const secondsFromStart = (now.getTime() - startTime.getTime()) / 1000;
      const minutesFromStart = secondsFromStart / 60;
      totalWorkedMinutes += minutesFromStart;
    }

    const weekHoursWorked = totalWorkedMinutes / 60;

    // Progreso: Trabajado / Asignado
    const weekProgress = weekHoursAssigned > 0 ? Math.round((weekHoursWorked / weekHoursAssigned) * 100) : 0;

    // Balance: Trabajado - Asignado (¿Cuánto me he desviado de lo planificado?)
    const weekBalance = weekHoursWorked - weekHoursAssigned;
    let weekBalanceStatus: "under" | "ok" | "over" = "ok";
    if (weekBalance < -2) weekBalanceStatus = "under";
    else if (weekBalance > 2) weekBalanceStatus = "over";

    // 2. Próximo Turno
    // Buscar en los próximos 30 días
    const next30Days = await getEffectiveScheduleForRange(
      employee.id,
      today,
      new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
    );

    let nextShift: Shift | null = null;
    let hoursUntilNextShift = 0;

    const now = new Date();

    for (const schedule of next30Days) {
      // Si es un día pasado completo, saltar
      // Pero ojo, hoy puede tener turnos futuros
      const scheduleDate = new Date(schedule.date);
      const isToday =
        scheduleDate.getDate() === now.getDate() &&
        scheduleDate.getMonth() === now.getMonth() &&
        scheduleDate.getFullYear() === now.getFullYear();

      if (scheduleDate < now && !isToday) continue;

      // Prioridad 1: Ausencias (si es hoy o futuro)
      if (schedule.absence) {
        const abs = schedule.absence as any;
        // Si es ausencia de día completo, y es hoy o futuro
        if (!abs.isPartial) {
          // Si es hoy, ya está ocurriendo. Si es futuro, cuenta horas.
          const shiftStart = new Date(schedule.date);
          shiftStart.setHours(0, 0, 0, 0);

          // Si ya pasó (ayer), nada. Si es hoy, empieza "ya".
          if (isToday || shiftStart > now) {
            nextShift = {
              id: `absence-${format(schedule.date, "yyyy-MM-dd")}`,
              employeeId: employee.id,
              date: format(schedule.date, "yyyy-MM-dd"),
              startTime: "00:00",
              endTime: "00:00", // Indica día completo
              status: "published",
              role: abs.type ?? "Ausencia", // Vacaciones, Baja, etc.
              notes: abs.reason,
            };
            hoursUntilNextShift = isToday ? 0 : differenceInHours(shiftStart, now);
            break;
          }
        } else if (abs.startTime !== undefined) {
          // Ausencia parcial
          const absStart = new Date(schedule.date);
          absStart.setHours(Math.floor(abs.startTime / 60), abs.startTime % 60, 0, 0);

          if (absStart > now) {
            nextShift = {
              id: `absence-${format(schedule.date, "yyyy-MM-dd")}`,
              employeeId: employee.id,
              date: format(schedule.date, "yyyy-MM-dd"),
              startTime: minutesToTime(abs.startTime),
              endTime: minutesToTime(abs.endTime),
              status: "published",
              role: abs.type ?? "Ausencia",
              notes: abs.reason,
            };
            hoursUntilNextShift = differenceInHours(absStart, now);
            break;
          }
        }
      }

      // Prioridad 2: Turnos de trabajo
      if (schedule.timeSlots && schedule.timeSlots.length > 0) {
        const workSlots = schedule.timeSlots
          .filter((s) => s.slotType === "WORK")
          .sort((a, b) => a.startMinutes - b.startMinutes);

        for (const slot of workSlots) {
          const slotStart = new Date(schedule.date);
          slotStart.setHours(Math.floor(slot.startMinutes / 60), slot.startMinutes % 60, 0, 0);

          if (slotStart > now) {
            nextShift = {
              id: `shift-${format(schedule.date, "yyyy-MM-dd")}-${slot.startMinutes}`,
              employeeId: employee.id,
              date: format(schedule.date, "yyyy-MM-dd"),
              startTime: minutesToTime(slot.startMinutes),
              endTime: minutesToTime(slot.endMinutes),
              status: "published",
              role: schedule.periodName ?? "Turno",
              notes: slot.description,
            };
            hoursUntilNextShift = differenceInHours(slotStart, now);
            break;
          }
        }
        if (nextShift) break;
      }
    }

    // 3. Turnos este mes
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const monthSchedules = await getEffectiveScheduleForRange(employee.id, monthStart, monthEnd);

    let monthTotalShifts = 0;
    let monthTotalMinutes = 0;

    for (const s of monthSchedules) {
      // Contar días con actividad (trabajo o ausencia relevante)
      let hasActivity = false;

      // Sumar minutos de trabajo
      if (s.timeSlots.length > 0) {
        const workMinutes = s.timeSlots
          .filter((sl) => sl.slotType === "WORK")
          .reduce((acc, sl) => acc + (sl.endMinutes - sl.startMinutes), 0);

        if (workMinutes > 0) {
          monthTotalMinutes += workMinutes;
          hasActivity = true;
        }
      }

      // Sumar tiempo de ausencias (si son vacaciones pagadas, etc. - Asumimos que cuentan para "Turnos este mes" si el usuario lo ve en el calendario)
      // OJO: La métrica suele ser "Horas de Trabajo". Si es vacación, técnicamente no es turno de trabajo.
      // Mantengamos la lógica de "Total Hours" = Horas esperadas/planificadas de trabajo.

      if (hasActivity) monthTotalShifts++;
    }

    return {
      weekHoursAssigned: weekHoursWorked, // REEMPLAZAMOS: Ahora mostramos LO TRABAJADO (Completed)
      weekHoursContracted: weekHoursAssigned, // REEMPLAZAMOS: Ahora mostramos LO PLANIFICADO (Assigned) como meta
      weekProgress,

      nextShift,
      hoursUntilNextShift,

      monthTotalShifts,
      monthTotalHours: monthTotalMinutes / 60,

      weekBalance,
      weekBalanceStatus,
    };
  } catch (error) {
    console.error("Error calculating metrics:", error);
    return null;
  }
}

/**
 * Obtiene los turnos del usuario logueado para un mes específico.
 * Utiliza el motor de horarios V2.0 para calcular el horario efectivo.
 */
export async function getMyMonthlyShifts(date: Date): Promise<{ success: boolean; shifts: Shift[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, shifts: [], error: "No autenticado" };
    }

    const userId = session.user.id;

    // Obtener el empleado asociado al usuario
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!employee) {
      return { success: false, shifts: [], error: "No tienes un perfil de empleado asociado" };
    }

    const employeeId = employee.id;
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const shifts: Shift[] = [];

    // Usar la función optimizada que hace batch queries (4 queries totales en vez de 30*N)
    const schedules = await getEffectiveScheduleForRange(employeeId, monthStart, monthEnd);

    for (const schedule of schedules) {
      const dateKey = format(schedule.date, "yyyy-MM-dd");

      // Caso 1: Vacaciones / Ausencias
      if (schedule.absence) {
        // Detectar si es parcial revisando si tiene propiedades de tiempo definidas
        // El tipo EffectiveSchedule puede no tener tipado estricto de isPartial expuesto aquí,
        // pero el objeto runtime sí lo tiene según schedule-engine.ts
        const abs = schedule.absence as any;
        const isPartial = abs.isPartial && abs.startTime !== undefined && abs.endTime !== undefined;

        shifts.push({
          id: `absence-${dateKey}`,
          employeeId,
          date: dateKey,
          startTime: isPartial ? minutesToTime(abs.startTime) : "00:00",
          endTime: isPartial ? minutesToTime(abs.endTime) : "00:00",
          costCenterId: "default",
          zoneId: "default",
          status: "published",
          role: isPartial ? "Ausencia" : "Vacaciones",
          notes: abs.reason,
        });
      }

      // Caso 2: Turnos de trabajo (Slots)
      if (schedule.timeSlots && schedule.timeSlots.length > 0) {
        // Agrupar slots contiguos o mostrar individualmente?
        // La UI soporta lista de turnos. Mostremos cada bloque de trabajo.
        const workSlots = schedule.timeSlots.filter((s) => s.slotType === "WORK");

        for (const slot of workSlots) {
          shifts.push({
            id: `shift-${dateKey}-${slot.startMinutes}`,
            employeeId,
            date: dateKey,
            startTime: minutesToTime(slot.startMinutes),
            endTime: minutesToTime(slot.endMinutes),
            costCenterId: "default",
            zoneId: "default",
            status: "published",
            role: schedule.periodName ?? "Turno asignado",
            notes: slot.description,
          });
        }
      }
    }

    return { success: true, shifts };
  } catch (error) {
    console.error("Error obteniendo turnos mensuales:", error);
    return { success: false, shifts: [], error: "Error al cargar el calendario" };
  }
}

/**
 * Obtiene el perfil de empleado del usuario actual para la UI de turnos
 */
export async function getMyEmployeeProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!employee) return null;

    // Adaptar al formato que espera la UI (EmployeeShift)
    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      contractHours: Number(employee.employmentContracts[0]?.weeklyHours || 40),
      usesShiftSystem: true, // Asumimos true si está aquí
      costCenterId: employee.employmentContracts[0]?.costCenterId ?? undefined,
      absences: [], // Se cargan vía turnos de tipo vacación
    };
  } catch (error) {
    console.error("Error obteniendo perfil empleado:", error);
    return null;
  }
}
