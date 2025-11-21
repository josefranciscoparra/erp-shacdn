"use server";

import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

import type { Shift } from "@/app/(main)/dashboard/shifts/_lib/types";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule } from "@/lib/schedule-engine";

/**
 * Convierte minutos (ej: 540) a hora (ej: "09:00")
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
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
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const shifts: Shift[] = [];

    // Calcular horario efectivo para cada día del mes
    // TODO: Optimizar esto en el futuro para no hacer 30 llamadas a getEffectiveSchedule secuenciales
    // Se podría hacer Promise.all, pero el motor hace muchas queries.
    // Lo ideal sería una versión batch del motor getEffectiveScheduleForRange(employeeId, start, end)

    // Usamos Promise.all con chunks o directo si el pool aguanta (30 días no es tanto)
    const schedulePromises = daysInMonth.map((day) => getEffectiveSchedule(employeeId, day));
    const schedules = await Promise.all(schedulePromises);

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
