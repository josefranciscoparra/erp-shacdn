/**
 * Funciones de integración entre turnos y fichajes
 * Sprint 5
 */

import { differenceInMinutes, isSameDay } from "date-fns";

import { prisma } from "@/lib/prisma";

/**
 * Resultado de detección de turno
 */
export interface ShiftDetectionResult {
  hasShift: boolean;
  shift?: {
    id: string;
    assignmentId: string;
    startTime: string;
    endTime: string;
    status: string;
  };
  anomalies: string[];
}

/**
 * Detectar turno asignado para un empleado en una fecha/hora específica
 */
export async function detectAssignedShift(employeeId: string, timestamp: Date): Promise<ShiftDetectionResult> {
  const result: ShiftDetectionResult = {
    hasShift: false,
    anomalies: [],
  };

  // Buscar turno asignado para el día actual
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      shift: {
        date: {
          gte: new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()),
          lt: new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate() + 1),
        },
        status: {
          in: ["PUBLISHED", "CLOSED"],
        },
      },
    },
    include: {
      shift: true,
    },
    orderBy: {
      shift: {
        startTime: "asc",
      },
    },
  });

  if (assignments.length === 0) {
    result.anomalies.push("NO_SHIFT_ASSIGNED");
    return result;
  }

  // Buscar turno que corresponde con la hora actual
  const currentTime = `${timestamp.getHours().toString().padStart(2, "0")}:${timestamp.getMinutes().toString().padStart(2, "0")}`;

  for (const assignment of assignments) {
    const shift = assignment.shift;

    // Verificar si el fichaje está dentro del rango del turno (con margen)
    const shiftStart = timeToMinutes(shift.startTime);
    const shiftEnd = timeToMinutes(shift.endTime);
    const currentMinutes = timeToMinutes(currentTime);

    // Margen de 30 minutos antes y después
    const margin = 30;

    if (currentMinutes >= shiftStart - margin && currentMinutes <= shiftEnd + margin) {
      result.hasShift = true;
      result.shift = {
        id: shift.id,
        assignmentId: assignment.id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: assignment.status,
      };

      // Detectar si llega tarde (>5 min después de inicio)
      if (currentMinutes > shiftStart + 5) {
        const delayMinutes = currentMinutes - shiftStart;
        result.anomalies.push(`LATE_ARRIVAL:${delayMinutes}`);
      }

      return result;
    }
  }

  // Si hay turnos asignados pero ninguno coincide con la hora
  result.anomalies.push("SHIFT_TIME_MISMATCH");
  return result;
}

/**
 * Calcular anomalías de fichaje vs turno
 */
export async function calculateShiftAnomalies(
  assignmentId: string,
  clockInTime?: Date,
  clockOutTime?: Date,
): Promise<{
  hasDelay: boolean;
  delayMinutes: number;
  hasEarlyDeparture: boolean;
  earlyDepartureMinutes: number;
  wasAbsent: boolean;
  workedOutsideShift: boolean;
}> {
  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id: assignmentId },
    include: { shift: true },
  });

  if (!assignment) {
    throw new Error("Asignación no encontrada");
  }

  const shift = assignment.shift;
  const result = {
    hasDelay: false,
    delayMinutes: 0,
    hasEarlyDeparture: false,
    earlyDepartureMinutes: 0,
    wasAbsent: false,
    workedOutsideShift: false,
  };

  // Si no hay clockIn, es ausencia
  if (!clockInTime) {
    result.wasAbsent = true;
    return result;
  }

  // Calcular retraso
  const shiftStartMinutes = timeToMinutes(shift.startTime);
  const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();

  if (clockInMinutes > shiftStartMinutes) {
    result.delayMinutes = clockInMinutes - shiftStartMinutes;
    if (result.delayMinutes > 5) {
      // Tolerancia de 5 minutos
      result.hasDelay = true;
    }
  }

  // Calcular salida anticipada
  if (clockOutTime) {
    const shiftEndMinutes = timeToMinutes(shift.endTime);
    const clockOutMinutes = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();

    if (clockOutMinutes < shiftEndMinutes) {
      result.earlyDepartureMinutes = shiftEndMinutes - clockOutMinutes;
      if (result.earlyDepartureMinutes > 5) {
        // Tolerancia de 5 minutos
        result.hasEarlyDeparture = true;
      }
    }
  }

  // Verificar si trabajó fuera del turno (con margen de 30 min)
  const margin = 30;
  if (
    clockInMinutes < shiftStartMinutes - margin ||
    (clockOutTime && clockOutTime.getHours() * 60 + clockOutTime.getMinutes() > timeToMinutes(shift.endTime) + margin)
  ) {
    result.workedOutsideShift = true;
  }

  return result;
}

/**
 * Convertir hora "HH:mm" a minutos desde medianoche
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Actualizar asignación de turno con datos de fichaje
 */
export async function updateShiftAssignmentWithClocking(assignmentId: string, clockInTime: Date, clockOutTime?: Date) {
  const anomalies = await calculateShiftAnomalies(assignmentId, clockInTime, clockOutTime);

  const updateData: any = {
    actualClockIn: clockInTime,
    hasDelay: anomalies.hasDelay,
    delayMinutes: anomalies.delayMinutes,
    workedOutsideShift: anomalies.workedOutsideShift,
  };

  if (clockOutTime) {
    updateData.actualClockOut = clockOutTime;
    updateData.status = "COMPLETED";
    updateData.hasEarlyDeparture = anomalies.hasEarlyDeparture;
    updateData.earlyDepartureMinutes = anomalies.earlyDepartureMinutes;

    // Calcular minutos realmente trabajados
    const workedMinutes = differenceInMinutes(clockOutTime, clockInTime);
    updateData.actualWorkedMinutes = workedMinutes;
  } else {
    updateData.status = "CONFIRMED"; // Fichó entrada pero no salida aún
  }

  updateData.wasAbsent = false;

  return await prisma.shiftAssignment.update({
    where: { id: assignmentId },
    data: updateData,
  });
}

/**
 * Marcar turno como ausencia si no se fichó
 */
export async function markShiftAsAbsent(assignmentId: string) {
  return await prisma.shiftAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "ABSENT",
      wasAbsent: true,
      hasDelay: false,
      hasEarlyDeparture: false,
      workedOutsideShift: false,
    },
  });
}
