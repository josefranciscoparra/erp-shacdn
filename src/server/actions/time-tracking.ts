"use server";

import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays } from "date-fns";

import { findNearestCenter } from "@/lib/geolocation/haversine";
import { prisma } from "@/lib/prisma";
import { getEffectiveSchedule, validateTimeEntry } from "@/lib/schedule-engine";
import {
  validateTransition,
  mapStatusToState,
  getTransitionError,
  type TimeEntryState,
  type TimeEntryAction,
} from "@/lib/time-entry-state-machine";

import { detectAlertsForTimeEntry } from "./alert-detection";
import { getAuthenticatedEmployee, getAuthenticatedUser } from "./shared/get-authenticated-employee";
import { removeAutoTimeBankMovement, syncTimeBankForWorkday } from "./time-bank";

/**
 * Helper para serializar TimeEntry convirtiendo Decimals a números
 * Necesario para evitar error "Decimal objects are not supported" en Next.js 15
 */
function serializeTimeEntry(entry: any) {
  return {
    ...entry,
    latitude: entry.latitude ? Number(entry.latitude) : null,
    longitude: entry.longitude ? Number(entry.longitude) : null,
    accuracy: entry.accuracy ? Number(entry.accuracy) : null,
    distanceFromCenter: entry.distanceFromCenter ? Number(entry.distanceFromCenter) : null,
  };
}

// Helper para procesar datos de geolocalización
// IMPORTANTE: Recibe parámetros individuales en lugar de objeto para evitar problema de Next.js 15
async function processGeolocationData(orgId: string, latitude?: number, longitude?: number, accuracy?: number) {
  if (latitude === undefined || longitude === undefined || accuracy === undefined) {
    return {};
  }

  // Obtener centros con ubicación
  const costCenters = await prisma.costCenter.findMany({
    where: {
      orgId,
      active: true,
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  // Calcular ubicación relativa al centro más cercano
  if (costCenters.length > 0) {
    const nearest = findNearestCenter(
      { latitude, longitude },
      costCenters.map((c) => ({
        id: c.id,
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
        allowedRadiusMeters: c.allowedRadiusMeters,
      })),
    );

    if (nearest) {
      const allowedRadius = nearest.center.allowedRadiusMeters ?? 200;
      return {
        latitude,
        longitude,
        accuracy,
        nearestCostCenterId: nearest.center.id,
        distanceFromCenter: nearest.distance,
        isWithinAllowedArea: nearest.distance <= allowedRadius,
        requiresReview: nearest.distance > allowedRadius,
      };
    }
  }

  // Sin centros configurados, guardar solo coordenadas
  return {
    latitude,
    longitude,
    accuracy,
  };
}

// Helper para calcular minutos trabajados
// IMPORTANTE: Solo calcula sesiones CERRADAS, no incluye tiempo en progreso
function calculateWorkedMinutes(entries: any[]): { worked: number; break: number } {
  let totalWorked = 0;
  let totalBreak = 0;
  let lastClockIn: Date | null = null;
  let lastBreakStart: Date | null = null;

  // Ordenar por timestamp
  const sorted = entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  console.log("🔍 Calculando minutos trabajados para", sorted.length, "entradas");

  for (const entry of sorted) {
    console.log(`  📝 ${entry.entryType} a las ${new Date(entry.timestamp).toLocaleTimeString()}`);

    switch (entry.entryType) {
      case "CLOCK_IN":
        lastClockIn = entry.timestamp;
        console.log("    ⏰ Inicio de sesión registrado");
        break;

      case "BREAK_START":
        if (lastClockIn) {
          // Calcular tiempo trabajado hasta la pausa
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          console.log(`    ➕ Sesión trabajada: ${minutes.toFixed(2)} min (total: ${totalWorked.toFixed(2)})`);
          lastBreakStart = entry.timestamp;
          lastClockIn = null; // Cerrar sesión de trabajo
        } else {
          console.log("    ⚠️ BREAK_START sin CLOCK_IN previo");
        }
        break;

      case "BREAK_END":
        if (lastBreakStart) {
          // Calcular tiempo de pausa
          const minutes = (entry.timestamp.getTime() - lastBreakStart.getTime()) / (1000 * 60);
          totalBreak += minutes;
          console.log(`    ☕ Pausa: ${minutes.toFixed(2)} min (total pausas: ${totalBreak.toFixed(2)})`);
          lastClockIn = entry.timestamp; // Continuar desde aquí
          lastBreakStart = null;
        } else {
          console.log("    ⚠️ BREAK_END sin BREAK_START previo");
        }
        break;

      case "CLOCK_OUT":
        if (lastClockIn) {
          // Calcular tiempo trabajado hasta la salida
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          console.log(
            `    ➕ Sesión trabajada hasta salida: ${minutes.toFixed(2)} min (total: ${totalWorked.toFixed(2)})`,
          );
          lastClockIn = null;
        } else {
          console.log("    ⚠️ CLOCK_OUT sin CLOCK_IN activo");
        }
        if (lastBreakStart) {
          // Si estaba en pausa, cerrar la pausa también
          const minutes = (new Date().getTime() - lastBreakStart.getTime()) / (1000 * 60);
          totalBreak += minutes;
          console.log(`    ☕ Cerrando pausa pendiente: ${minutes.toFixed(2)} min`);
          lastBreakStart = null;
        }
        break;
    }
  }

  console.log(`✅ Total calculado: ${totalWorked.toFixed(2)} min trabajados, ${totalBreak.toFixed(2)} min pausa`);

  return {
    worked: totalWorked, // NO redondear, mantener decimales para segundos
    break: totalBreak,
  };
}

// Helper para actualizar el resumen del día
// MEJORADO: Maneja fichajes que cruzan medianoche (turnos de noche)
async function updateWorkdaySummary(employeeId: string, orgId: string, date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Obtener todos los fichajes del día (SOLO fichajes NO cancelados)
  const entries = await prisma.timeEntry.findMany({
    where: {
      employeeId,
      orgId,
      isCancelled: false, // ⚠️ CRÍTICO: Excluir fichajes cancelados del cómputo
      timestamp: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  // ========== FASE 1.3: MANEJO DE FICHAJES QUE CRUZAN MEDIANOCHE ==========
  // Buscar CLOCK_IN del día anterior que NO tenga CLOCK_OUT correspondiente
  // Esto ocurre en turnos de noche: entrada 23:00, salida 07:00 del día siguiente
  let midnightCrossingMinutes = 0;
  let hasMidnightCrossing = false;

  const previousDay = subDays(dayStart, 1);
  const previousDayStart = startOfDay(previousDay);
  const previousDayEnd = endOfDay(previousDay);

  // Buscar último fichaje del día anterior
  const lastEntryYesterday = await prisma.timeEntry.findFirst({
    where: {
      employeeId,
      orgId,
      isCancelled: false,
      timestamp: {
        gte: previousDayStart,
        lte: previousDayEnd,
      },
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  // Si el último fichaje del día anterior fue CLOCK_IN o BREAK_END (estaba trabajando),
  // y el primer fichaje del día actual es CLOCK_OUT o no existe,
  // entonces hay un cruce de medianoche
  if (lastEntryYesterday) {
    const wasWorkingAtMidnight =
      lastEntryYesterday.entryType === "CLOCK_IN" || lastEntryYesterday.entryType === "BREAK_END";

    if (wasWorkingAtMidnight) {
      // Verificar si hay CLOCK_OUT del día anterior después del CLOCK_IN
      const hadClockOutYesterday = await prisma.timeEntry.findFirst({
        where: {
          employeeId,
          orgId,
          isCancelled: false,
          entryType: "CLOCK_OUT",
          timestamp: {
            gt: lastEntryYesterday.timestamp,
            lte: previousDayEnd,
          },
        },
      });

      // Si NO fichó salida ayer, hay cruce de medianoche
      if (!hadClockOutYesterday) {
        hasMidnightCrossing = true;

        // Buscar el primer evento del día actual
        const firstEntryToday = entries.length > 0 ? entries[0] : null;

        if (firstEntryToday) {
          // Calcular minutos desde medianoche (00:00) hasta el primer evento de hoy
          // Solo si el primer evento es CLOCK_OUT, BREAK_START, o BREAK_END
          // eslint-disable-next-line max-depth
          if (
            firstEntryToday.entryType === "CLOCK_OUT" ||
            firstEntryToday.entryType === "BREAK_START" ||
            firstEntryToday.entryType === "BREAK_END"
          ) {
            midnightCrossingMinutes = (firstEntryToday.timestamp.getTime() - dayStart.getTime()) / (1000 * 60);
            console.log(
              `🌙 Fichaje cruzando medianoche detectado: +${midnightCrossingMinutes.toFixed(2)} min desde 00:00`,
            );
          }
        }
      }
    }
  }
  // ========== FIN FASE 1.3 ==========

  if (entries.length === 0 && !hasMidnightCrossing) {
    await removeAutoTimeBankMovement(orgId, employeeId, dayStart);
    return null;
  }

  const { worked: workedFromEntries, break: breakTime } = calculateWorkedMinutes(entries);

  // Agregar minutos del cruce de medianoche
  const worked = workedFromEntries + midnightCrossingMinutes;

  const firstEntry = entries.find((e) => e.entryType === "CLOCK_IN");
  const lastExit = entries.reverse().find((e) => e.entryType === "CLOCK_OUT");

  // Obtener horario efectivo del día usando el motor de cálculo V2.0
  let expectedMinutes: number | null = null;
  let deviationMinutes: number | null = null;
  let scheduleSource: string | null = null;
  let scheduleIsWorkday: boolean | null = null;

  try {
    const effectiveSchedule = await getEffectiveSchedule(employeeId, dayStart);
    scheduleSource = effectiveSchedule.source ?? null;
    scheduleIsWorkday = effectiveSchedule.isWorkingDay;
    expectedMinutes = effectiveSchedule.expectedMinutes;

    // Calcular desviación: (trabajado - esperado)
    // Positivo = trabajó más de lo esperado
    // Negativo = trabajó menos de lo esperado
    deviationMinutes = worked - expectedMinutes;
  } catch (error) {
    console.error("Error al obtener horario efectivo:", error);
    // Continuar sin expectedMinutes si falla (datos opcionales)
  }

  if ((expectedMinutes === null || expectedMinutes === 0) && entries.length > 0 && scheduleIsWorkday !== false) {
    const fallbackMinutes = await getFallbackExpectedMinutes(employeeId, orgId);
    if (fallbackMinutes) {
      expectedMinutes = fallbackMinutes;
      deviationMinutes = worked - fallbackMinutes;
    }
  }

  // Determinar el estado basándose en horas trabajadas vs esperadas
  let status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" = "IN_PROGRESS";
  if (lastExit) {
    // Si fichó salida, evaluar si completó las horas
    if (expectedMinutes) {
      // Sistema V2.0: Usar expectedMinutes del horario asignado
      const workedHours = worked / 60;
      const expectedHours = expectedMinutes / 60;
      const compliance = (workedHours / expectedHours) * 100;

      if (compliance >= 95) {
        status = "COMPLETED"; // Cumplió >= 95% de las horas esperadas
      } else {
        status = "INCOMPLETE"; // Fichó salida pero no cumplió las horas
      }
    } else {
      // Sin horario asignado: No se puede determinar si completó o no
      // Dejar como IN_PROGRESS para indicar que falta configuración
      status = "IN_PROGRESS";
    }
  }

  // Buscar o crear el resumen del día
  const summary = await prisma.workdaySummary.upsert({
    where: {
      orgId_employeeId_date: {
        orgId,
        employeeId,
        date: dayStart,
      },
    },
    create: {
      orgId,
      employeeId,
      date: dayStart,
      clockIn: firstEntry?.timestamp,
      clockOut: lastExit?.timestamp,
      totalWorkedMinutes: worked,
      totalBreakMinutes: breakTime,
      expectedMinutes,
      deviationMinutes,
      status,
    },
    update: {
      clockIn: firstEntry?.timestamp,
      clockOut: lastExit?.timestamp,
      totalWorkedMinutes: worked,
      totalBreakMinutes: breakTime,
      expectedMinutes,
      deviationMinutes,
      status,
    },
  });

  await syncTimeBankForWorkday(summary);

  return summary;
}

// Obtener el estado actual del empleado
export async function getCurrentStatus() {
  try {
    const { employee, orgId } = await getAuthenticatedUser();

    // Si no hay empleado asociado, retornar null
    if (!employee) {
      return null;
    }

    const employeeId = employee.id;

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Obtener el último fichaje del día
    const lastEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId,
        orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    if (!lastEntry) {
      return { status: "CLOCKED_OUT" as const };
    }

    // Determinar el estado según el último fichaje
    switch (lastEntry.entryType) {
      case "CLOCK_IN":
      case "BREAK_END":
        return { status: "CLOCKED_IN" as const };

      case "BREAK_START":
        return { status: "ON_BREAK" as const };

      case "CLOCK_OUT":
      default:
        return { status: "CLOCKED_OUT" as const };
    }
  } catch (error) {
    console.error("Error al obtener estado actual:", error);
    throw error;
  }
}

// Fichar entrada
// REFACTORIZADO: Usa transacción Serializable + máquina de estados para prevenir race conditions
export async function clockIn(latitude?: number, longitude?: number, accuracy?: number) {
  try {
    const { employeeId, orgId, dailyHours } = await getAuthenticatedEmployee();

    // Procesar datos de geolocalización ANTES de la transacción (operación de lectura)
    const geoData = await processGeolocationData(orgId, latitude, longitude, accuracy);

    const now = new Date();

    // Validar fichaje según horario ANTES de la transacción (operación de lectura)
    const validation = await validateTimeEntry(employeeId, now, "CLOCK_IN");

    // TRANSACCIÓN ATÓMICA: Previene race conditions
    const entry = await prisma.$transaction(
      async (tx) => {
        // 1. Obtener último fichaje del día DENTRO de la transacción
        const dayStart = startOfDay(now);
        const dayEnd = endOfDay(now);

        const lastEntry = await tx.timeEntry.findFirst({
          where: {
            employeeId,
            orgId,
            isCancelled: false,
            timestamp: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
        });

        // 2. Derivar estado actual usando máquina de estados
        let currentState: TimeEntryState = "CLOCKED_OUT";
        if (lastEntry) {
          currentState = mapStatusToState(
            lastEntry.entryType === "CLOCK_IN" || lastEntry.entryType === "BREAK_END"
              ? "CLOCKED_IN"
              : lastEntry.entryType === "BREAK_START"
                ? "ON_BREAK"
                : "CLOCKED_OUT",
          );
        }

        // 3. Validar transición con máquina de estados
        const action: TimeEntryAction = "CLOCK_IN";
        if (!validateTransition(currentState, action)) {
          throw new Error(getTransitionError(currentState, action));
        }

        // 4. Crear el fichaje (dentro de la transacción)
        return tx.timeEntry.create({
          data: {
            orgId,
            employeeId,
            entryType: "CLOCK_IN",
            timestamp: now,
            validationWarnings: validation.warnings ?? [],
            validationErrors: validation.errors ?? [],
            deviationMinutes: validation.deviationMinutes ?? null,
            ...geoData,
          },
        });
      },
      {
        isolationLevel: "Serializable", // Máximo nivel de aislamiento
        timeout: 10000, // 10 segundos timeout
      },
    );

    // Actualizar el resumen del día (FUERA de la transacción, no es crítico)
    await updateWorkdaySummary(employeeId, orgId, now);

    // Detectar alertas en tiempo real (FUERA de la transacción, no es crítico)
    console.log("🚨 [CLOCK_IN] Iniciando detección de alertas para entry:", entry.id);
    let alerts: any[] = [];
    try {
      alerts = await detectAlertsForTimeEntry(entry.id);
      console.log("🚨 [CLOCK_IN] Alertas detectadas:", alerts.length, alerts);
    } catch (alertError) {
      console.error("🚨 [CLOCK_IN] Error al detectar alertas (no crítico):", alertError);
    }

    return { success: true, entry: serializeTimeEntry(entry), alerts };
  } catch (error) {
    console.error("Error al fichar entrada:", error);
    throw error;
  }
}

// Fichar salida
// REFACTORIZADO: Usa transacción Serializable + máquina de estados para prevenir race conditions
// CORREGIDO: Usa timestamp de CLOCK_OUT para BREAK_END automático (FASE 1.4)
export async function clockOut(
  latitude?: number,
  longitude?: number,
  accuracy?: number,
  cancelAsClosed?: boolean,
  cancellationInfo?: {
    reason: "EXCESSIVE_DURATION";
    originalDurationHours: number;
    clockInId: string;
    notes?: string;
  },
) {
  try {
    const { employeeId, orgId, dailyHours } = await getAuthenticatedEmployee();

    // Procesar datos de geolocalización ANTES de la transacción
    const geoData = await processGeolocationData(orgId, latitude, longitude, accuracy);

    const now = new Date();

    // Validar fichaje según horario ANTES de la transacción
    const validation = await validateTimeEntry(employeeId, now, "CLOCK_OUT");

    // TRANSACCIÓN ATÓMICA: Previene race conditions
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Obtener último fichaje del día DENTRO de la transacción
        const dayStart = startOfDay(now);
        const dayEnd = endOfDay(now);

        const lastEntry = await tx.timeEntry.findFirst({
          where: {
            employeeId,
            orgId,
            isCancelled: false,
            timestamp: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
        });

        // 2. Derivar estado actual usando máquina de estados
        let currentState: TimeEntryState = "CLOCKED_OUT";
        if (lastEntry) {
          currentState = mapStatusToState(
            lastEntry.entryType === "CLOCK_IN" || lastEntry.entryType === "BREAK_END"
              ? "CLOCKED_IN"
              : lastEntry.entryType === "BREAK_START"
                ? "ON_BREAK"
                : "CLOCKED_OUT",
          );
        }

        // 3. Validar que pueda fichar salida
        if (currentState === "CLOCKED_OUT") {
          throw new Error(getTransitionError(currentState, "CLOCK_OUT"));
        }

        // 4. Si está en pausa, cerrarla primero con el MISMO timestamp del CLOCK_OUT
        // IMPORTANTE: Usar `now` en lugar de `new Date()` para cálculo correcto de pausa
        let breakEndEntry = null;
        if (currentState === "ON_BREAK") {
          breakEndEntry = await tx.timeEntry.create({
            data: {
              orgId,
              employeeId,
              entryType: "BREAK_END",
              timestamp: now, // ✅ CORREGIDO: Usa timestamp del CLOCK_OUT
            },
          });
        }

        // 5. Manejar cancelación si es necesario
        if (cancelAsClosed && cancellationInfo) {
          console.log(
            `⚠️ Cancelando fichaje de larga duración (${cancellationInfo.originalDurationHours.toFixed(1)}h)`,
          );

          // Marcar CLOCK_IN como cancelado
          await tx.timeEntry.update({
            where: { id: cancellationInfo.clockInId },
            data: {
              isCancelled: true,
              cancellationReason: cancellationInfo.reason,
              cancelledAt: now,
              cancellationNotes: cancellationInfo.notes,
            },
          });

          // Crear CLOCK_OUT cancelado
          const cancelledEntry = await tx.timeEntry.create({
            data: {
              orgId,
              employeeId,
              entryType: "CLOCK_OUT",
              timestamp: now,
              isCancelled: true,
              cancellationReason: cancellationInfo.reason,
              cancelledAt: now,
              originalDurationHours: cancellationInfo.originalDurationHours,
              cancellationNotes: cancellationInfo.notes,
              ...geoData,
            },
          });

          return { entry: cancelledEntry, cancelled: true, breakEndEntry };
        }

        // 6. Fichaje normal (sin cancelación)
        const entry = await tx.timeEntry.create({
          data: {
            orgId,
            employeeId,
            entryType: "CLOCK_OUT",
            timestamp: now,
            validationWarnings: validation.warnings ?? [],
            validationErrors: validation.errors ?? [],
            deviationMinutes: validation.deviationMinutes ?? null,
            ...geoData,
          },
        });

        return { entry, cancelled: false, breakEndEntry };
      },
      {
        isolationLevel: "Serializable",
        timeout: 10000,
      },
    );

    // Actualizar el resumen del día (FUERA de la transacción)
    await updateWorkdaySummary(employeeId, orgId, now);

    // Detectar alertas en tiempo real (FUERA de la transacción)
    let alerts: any[] = [];
    try {
      alerts = await detectAlertsForTimeEntry(result.entry.id);
    } catch (alertError) {
      console.error("Error al detectar alertas (no crítico):", alertError);
    }

    return {
      success: true,
      entry: serializeTimeEntry(result.entry),
      cancelled: result.cancelled,
      alerts,
    };
  } catch (error) {
    console.error("Error al fichar salida:", error);
    throw error;
  }
}

// Iniciar descanso
// REFACTORIZADO: Usa transacción Serializable + máquina de estados para prevenir race conditions
export async function startBreak(latitude?: number, longitude?: number, accuracy?: number) {
  try {
    const { employeeId, orgId, dailyHours } = await getAuthenticatedEmployee();

    // Procesar datos de geolocalización ANTES de la transacción
    const geoData = await processGeolocationData(orgId, latitude, longitude, accuracy);

    const now = new Date();

    // TRANSACCIÓN ATÓMICA: Previene race conditions
    const entry = await prisma.$transaction(
      async (tx) => {
        // 1. Obtener último fichaje del día DENTRO de la transacción
        const dayStart = startOfDay(now);
        const dayEnd = endOfDay(now);

        const lastEntry = await tx.timeEntry.findFirst({
          where: {
            employeeId,
            orgId,
            isCancelled: false,
            timestamp: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
        });

        // 2. Derivar estado actual usando máquina de estados
        let currentState: TimeEntryState = "CLOCKED_OUT";
        if (lastEntry) {
          currentState = mapStatusToState(
            lastEntry.entryType === "CLOCK_IN" || lastEntry.entryType === "BREAK_END"
              ? "CLOCKED_IN"
              : lastEntry.entryType === "BREAK_START"
                ? "ON_BREAK"
                : "CLOCKED_OUT",
          );
        }

        // 3. Validar transición con máquina de estados
        const action: TimeEntryAction = "BREAK_START";
        if (!validateTransition(currentState, action)) {
          throw new Error(getTransitionError(currentState, action));
        }

        // 4. Crear el fichaje (dentro de la transacción)
        return tx.timeEntry.create({
          data: {
            orgId,
            employeeId,
            entryType: "BREAK_START",
            timestamp: now,
            ...geoData,
          },
        });
      },
      {
        isolationLevel: "Serializable",
        timeout: 10000,
      },
    );

    // Actualizar el resumen del día (FUERA de la transacción)
    await updateWorkdaySummary(employeeId, orgId, now);

    return { success: true, entry: serializeTimeEntry(entry) };
  } catch (error) {
    console.error("Error al iniciar descanso:", error);
    throw error;
  }
}

// Finalizar descanso
// REFACTORIZADO: Usa transacción Serializable + máquina de estados para prevenir race conditions
export async function endBreak(latitude?: number, longitude?: number, accuracy?: number) {
  try {
    const { employeeId, orgId, dailyHours } = await getAuthenticatedEmployee();

    // Procesar datos de geolocalización ANTES de la transacción
    const geoData = await processGeolocationData(orgId, latitude, longitude, accuracy);

    const now = new Date();

    // TRANSACCIÓN ATÓMICA: Previene race conditions
    const entry = await prisma.$transaction(
      async (tx) => {
        // 1. Obtener último fichaje del día DENTRO de la transacción
        const dayStart = startOfDay(now);
        const dayEnd = endOfDay(now);

        const lastEntry = await tx.timeEntry.findFirst({
          where: {
            employeeId,
            orgId,
            isCancelled: false,
            timestamp: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          orderBy: {
            timestamp: "desc",
          },
        });

        // 2. Derivar estado actual usando máquina de estados
        let currentState: TimeEntryState = "CLOCKED_OUT";
        if (lastEntry) {
          currentState = mapStatusToState(
            lastEntry.entryType === "CLOCK_IN" || lastEntry.entryType === "BREAK_END"
              ? "CLOCKED_IN"
              : lastEntry.entryType === "BREAK_START"
                ? "ON_BREAK"
                : "CLOCKED_OUT",
          );
        }

        // 3. Validar transición con máquina de estados
        const action: TimeEntryAction = "BREAK_END";
        if (!validateTransition(currentState, action)) {
          throw new Error(getTransitionError(currentState, action));
        }

        // 4. Crear el fichaje (dentro de la transacción)
        return tx.timeEntry.create({
          data: {
            orgId,
            employeeId,
            entryType: "BREAK_END",
            timestamp: now,
            ...geoData,
          },
        });
      },
      {
        isolationLevel: "Serializable",
        timeout: 10000,
      },
    );

    // Actualizar el resumen del día (FUERA de la transacción)
    await updateWorkdaySummary(employeeId, orgId, now);

    return { success: true, entry: serializeTimeEntry(entry) };
  } catch (error) {
    console.error("Error al finalizar descanso:", error);
    throw error;
  }
}

// Obtener horas esperadas del día según contrato
export async function getExpectedDailyHours() {
  try {
    const { employee, userId } = await getAuthenticatedUser();

    // Si no hay empleado asociado, retornar valores por defecto
    if (!employee) {
      return { dailyHours: 8, hasActiveContract: false };
    }

    // Obtener contrato activo
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId: employee.id,
        active: true,
        weeklyHours: { gt: 0 },
      },
      orderBy: { startDate: "desc" },
    });

    const hasActiveContract = Boolean(contract);
    const weeklyHours = contract?.weeklyHours ? Number(contract.weeklyHours) : 40;
    const workingDaysPerWeek = contract?.workingDaysPerWeek ? Number(contract.workingDaysPerWeek) : 5;
    const dailyHours = weeklyHours / workingDaysPerWeek;

    return { dailyHours, hasActiveContract };
  } catch (error) {
    console.error("Error al obtener horas esperadas:", error);
    throw error;
  }
}

// Helper: Calcular horas trabajadas desde franjas horarias con pausas
function calculateHoursFromTimeSlots(
  startTime: string | null,
  endTime: string | null,
  breakStart: string | null,
  breakEnd: string | null,
): number {
  if (!startTime || !endTime) {
    return 0;
  }

  // Parsear horas (formato "HH:MM")
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  // Calcular horas trabajadas
  const totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);

  // Restar pausa si existe
  let breakMinutes = 0;
  if (breakStart && breakEnd) {
    const [breakStartHour, breakStartMin] = breakStart.split(":").map(Number);
    const [breakEndHour, breakEndMin] = breakEnd.split(":").map(Number);
    breakMinutes = breakEndHour * 60 + breakEndMin - (breakStartHour * 60 + breakStartMin);
  }

  return (totalMinutes - breakMinutes) / 60;
}

// Helper: Calcular horas promedio desde horas semanales
function calculateAverageHours(
  isIntensivePeriod: boolean,
  intensiveWeeklyHours: any,
  weeklyHours: any,
  workingDaysPerWeek: any,
): number {
  const hours = isIntensivePeriod && intensiveWeeklyHours ? Number(intensiveWeeklyHours) : Number(weeklyHours);
  const days = Number(workingDaysPerWeek ?? 5);
  return hours / days;
}

async function getFallbackExpectedMinutes(employeeId: string, orgId: string): Promise<number | null> {
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      orgId,
      active: true,
      weeklyHours: {
        gt: 0,
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  if (!contract) {
    return null;
  }

  if (typeof contract.workdayMinutes === "number" && contract.workdayMinutes > 0) {
    return contract.workdayMinutes;
  }

  const weeklyHours = contract.weeklyHours ? Number(contract.weeklyHours) : 0;
  if (weeklyHours <= 0) {
    return null;
  }

  const workingDaysPerWeek = contract.workingDaysPerWeek ? Number(contract.workingDaysPerWeek) : 5;
  if (workingDaysPerWeek <= 0) {
    return null;
  }

  return Math.round((weeklyHours / workingDaysPerWeek) * 60);
}

// Helper: Calcular horas para un día en horario FIXED
function calculateFixedScheduleHours(
  worksToday: boolean,
  hasFixedTimeSlots: boolean,
  dayOfWeek: number,
  isIntensivePeriod: boolean,
  contract: any,
): number {
  if (!worksToday) {
    return 0;
  }

  if (!hasFixedTimeSlots) {
    return calculateAverageHours(
      isIntensivePeriod,
      contract.intensiveWeeklyHours,
      contract.weeklyHours,
      contract.workingDaysPerWeek,
    );
  }

  // Obtener franjas horarias para hoy
  const startTimeFields = [
    contract.sundayStartTime,
    contract.mondayStartTime,
    contract.tuesdayStartTime,
    contract.wednesdayStartTime,
    contract.thursdayStartTime,
    contract.fridayStartTime,
    contract.saturdayStartTime,
  ];
  const endTimeFields = [
    contract.sundayEndTime,
    contract.mondayEndTime,
    contract.tuesdayEndTime,
    contract.wednesdayEndTime,
    contract.thursdayEndTime,
    contract.fridayEndTime,
    contract.saturdayEndTime,
  ];
  const breakStartFields = [
    contract.sundayBreakStartTime,
    contract.mondayBreakStartTime,
    contract.tuesdayBreakStartTime,
    contract.wednesdayBreakStartTime,
    contract.thursdayBreakStartTime,
    contract.fridayBreakStartTime,
    contract.saturdayBreakStartTime,
  ];
  const breakEndFields = [
    contract.sundayBreakEndTime,
    contract.mondayBreakEndTime,
    contract.tuesdayBreakEndTime,
    contract.wednesdayBreakEndTime,
    contract.thursdayBreakEndTime,
    contract.fridayBreakEndTime,
    contract.saturdayBreakEndTime,
  ];

  // Intensive variants
  const intensiveStartTimeFields = [
    contract.intensiveSundayStartTime,
    contract.intensiveMondayStartTime,
    contract.intensiveTuesdayStartTime,
    contract.intensiveWednesdayStartTime,
    contract.intensiveThursdayStartTime,
    contract.intensiveFridayStartTime,
    contract.intensiveSaturdayStartTime,
  ];
  const intensiveEndTimeFields = [
    contract.intensiveSundayEndTime,
    contract.intensiveMondayEndTime,
    contract.intensiveTuesdayEndTime,
    contract.intensiveWednesdayEndTime,
    contract.intensiveThursdayEndTime,
    contract.intensiveFridayEndTime,
    contract.intensiveSaturdayEndTime,
  ];
  const intensiveBreakStartFields = [
    contract.intensiveSundayBreakStartTime,
    contract.intensiveMondayBreakStartTime,
    contract.intensiveTuesdayBreakStartTime,
    contract.intensiveWednesdayBreakStartTime,
    contract.intensiveThursdayBreakStartTime,
    contract.intensiveFridayBreakStartTime,
    contract.intensiveSaturdayBreakStartTime,
  ];
  const intensiveBreakEndFields = [
    contract.intensiveSundayBreakEndTime,
    contract.intensiveMondayBreakEndTime,
    contract.intensiveTuesdayBreakEndTime,
    contract.intensiveWednesdayBreakEndTime,
    contract.intensiveThursdayBreakEndTime,
    contract.intensiveFridayBreakEndTime,
    contract.intensiveSaturdayBreakEndTime,
  ];

  const startTime = isIntensivePeriod ? intensiveStartTimeFields[dayOfWeek] : startTimeFields[dayOfWeek];
  const endTime = isIntensivePeriod ? intensiveEndTimeFields[dayOfWeek] : endTimeFields[dayOfWeek];
  const breakStart = isIntensivePeriod ? intensiveBreakStartFields[dayOfWeek] : breakStartFields[dayOfWeek];
  const breakEnd = isIntensivePeriod ? intensiveBreakEndFields[dayOfWeek] : breakEndFields[dayOfWeek];

  const calculated = calculateHoursFromTimeSlots(startTime, endTime, breakStart, breakEnd);

  if (calculated > 0) {
    return calculated;
  }

  // Fallback to average
  return calculateAverageHours(
    isIntensivePeriod,
    contract.intensiveWeeklyHours,
    contract.weeklyHours,
    contract.workingDaysPerWeek,
  );
}

// Obtener horas esperadas PARA HOY específicamente (detecta días laborables)
export async function getExpectedHoursForToday() {
  try {
    const { employee, orgId } = await getAuthenticatedUser();

    // Si no hay empleado asociado, retornar valores por defecto
    if (!employee) {
      return { hoursToday: 8, isWorkingDay: true, hasActiveContract: false };
    }

    // Obtener contrato activo
    const contract = await prisma.employmentContract.findFirst({
      where: {
        employeeId: employee.id,
        active: true,
        weeklyHours: { gt: 0 },
      },
      orderBy: { startDate: "desc" },
    });

    const hasActiveContract = Boolean(contract);

    // Si no hay contrato, retornar valores por defecto
    if (!contract) {
      return { hoursToday: 8, isWorkingDay: true, hasActiveContract: false };
    }

    // Obtener día de la semana actual (0 = domingo, 1 = lunes, ..., 6 = sábado)
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Verificar si hoy es festivo
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    const currentYear = today.getFullYear();

    const isHoliday = await prisma.calendarEvent.findFirst({
      where: {
        calendar: {
          orgId,
          active: true,
          year: currentYear,
        },
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        eventType: "HOLIDAY",
      },
    });

    // Si hoy es festivo, no hay que trabajar
    if (isHoliday) {
      return { hoursToday: 0, isWorkingDay: false, hasActiveContract };
    }

    // Verificar si estamos en periodo de jornada intensiva
    let isIntensivePeriod = false;
    if (contract.hasIntensiveSchedule && contract.intensiveStartDate && contract.intensiveEndDate) {
      const currentMonthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const startMonthDay = contract.intensiveStartDate;
      const endMonthDay = contract.intensiveEndDate;

      // Comparar fechas MM-DD
      if (startMonthDay <= endMonthDay) {
        // Periodo dentro del mismo año (ej: 06-15 a 09-15)
        isIntensivePeriod = currentMonthDay >= startMonthDay && currentMonthDay <= endMonthDay;
      } else {
        // Periodo que cruza año (ej: 12-15 a 02-15)
        isIntensivePeriod = currentMonthDay >= startMonthDay || currentMonthDay <= endMonthDay;
      }
    }

    // Determinar horas según tipo de horario y día de la semana
    let hoursToday = 0;
    let isWorkingDay = false;

    // Array con los campos de horas por día de la semana (domingo a sábado)
    const regularHoursByDay = [
      contract.sundayHours,
      contract.mondayHours,
      contract.tuesdayHours,
      contract.wednesdayHours,
      contract.thursdayHours,
      contract.fridayHours,
      contract.saturdayHours,
    ];

    const intensiveHoursByDay = [
      contract.intensiveSundayHours,
      contract.intensiveMondayHours,
      contract.intensiveTuesdayHours,
      contract.intensiveWednesdayHours,
      contract.intensiveThursdayHours,
      contract.intensiveFridayHours,
      contract.intensiveSaturdayHours,
    ];

    const workDaysByDay = [
      contract.workSunday,
      contract.workMonday,
      contract.workTuesday,
      contract.workWednesday,
      contract.workThursday,
      contract.workFriday,
      contract.workSaturday,
    ];

    if (contract.scheduleType === "FLEXIBLE") {
      if (contract.hasCustomWeeklyPattern) {
        // FLEXIBLE con patrón personalizado: Usar horas específicas del día
        const todayHours = isIntensivePeriod ? intensiveHoursByDay[dayOfWeek] : regularHoursByDay[dayOfWeek];

        if (todayHours !== null && todayHours !== undefined) {
          hoursToday = Number(todayHours);
          isWorkingDay = hoursToday > 0;
        } else {
          // Si no hay horas definidas para hoy, no es día laborable
          hoursToday = 0;
          isWorkingDay = false;
        }
      } else {
        // FLEXIBLE sin patrón: Usar promedio (comportamiento legacy)
        hoursToday = calculateAverageHours(
          isIntensivePeriod,
          contract.intensiveWeeklyHours,
          contract.weeklyHours,
          contract.workingDaysPerWeek,
        );
        isWorkingDay = true; // Asumimos que trabaja si no hay patrón específico
      }
    } else if (contract.scheduleType === "FIXED") {
      // FIXED: Verificar si trabaja hoy según workMonday, workTuesday, etc.
      const worksToday = workDaysByDay[dayOfWeek] ?? false;
      isWorkingDay = worksToday;
      hoursToday = calculateFixedScheduleHours(
        worksToday,
        contract.hasFixedTimeSlots,
        dayOfWeek,
        isIntensivePeriod,
        contract,
      );
    } else {
      // SHIFTS u otro tipo: Por ahora usar promedio
      hoursToday = calculateAverageHours(
        isIntensivePeriod,
        contract.intensiveWeeklyHours,
        contract.weeklyHours,
        contract.workingDaysPerWeek,
      );
      isWorkingDay = true;
    }

    return { hoursToday, isWorkingDay, hasActiveContract };
  } catch (error) {
    console.error("Error al obtener horas esperadas para hoy:", error);
    throw error;
  }
}

// Obtener resumen de hoy
export async function getTodaySummary() {
  try {
    const { employee, orgId } = await getAuthenticatedUser();

    // Si no hay empleado asociado, retornar estructura vacía
    if (!employee) {
      const dayStart = startOfDay(new Date());
      return {
        id: "",
        date: dayStart,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        status: "ABSENT" as const,
        timeEntries: [],
      };
    }

    const employeeId = employee.id;

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Obtener el resumen del día
    const summary = await prisma.workdaySummary.findUnique({
      where: {
        orgId_employeeId_date: {
          orgId,
          employeeId,
          date: dayStart,
        },
      },
    });

    // Obtener los fichajes del día (independientemente de si hay resumen o no)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Combinar resumen con entries
    if (summary) {
      return {
        id: summary.id,
        date: summary.date,
        clockIn: summary.clockIn,
        clockOut: summary.clockOut,
        totalWorkedMinutes: Number(summary.totalWorkedMinutes),
        totalBreakMinutes: Number(summary.totalBreakMinutes),
        status: summary.status,
        notes: summary.notes,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
        orgId: summary.orgId,
        employeeId: summary.employeeId,
        timeEntries: timeEntries.map(serializeTimeEntry),
      };
    }

    // Si no hay resumen pero hay entries, retornar estructura básica
    if (timeEntries.length > 0) {
      return {
        id: "",
        date: dayStart,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        status: "IN_PROGRESS" as const,
        timeEntries: timeEntries.map(serializeTimeEntry),
      };
    }

    // Si no hay ni resumen ni entries, retornar estructura vacía (empleado no ha fichado hoy)
    return {
      id: "",
      date: dayStart,
      totalWorkedMinutes: 0,
      totalBreakMinutes: 0,
      status: "ABSENT" as const,
      timeEntries: [],
    };
  } catch (error) {
    console.error("Error al obtener resumen de hoy:", error);
    throw error;
  }
}

// Obtener resumen semanal
export async function getWeeklySummary() {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const summaries = await prisma.workdaySummary.findMany({
      where: {
        orgId,
        employeeId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        timeEntries: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    const totalWorked = summaries.reduce((acc, s) => acc + Number(s.totalWorkedMinutes), 0);
    const totalBreak = summaries.reduce((acc, s) => acc + Number(s.totalBreakMinutes), 0);

    return {
      weekStart,
      weekEnd,
      totalWorkedMinutes: totalWorked,
      totalBreakMinutes: totalBreak,
      days: summaries.map((s) => ({
        ...s,
        totalWorkedMinutes: Number(s.totalWorkedMinutes),
        totalBreakMinutes: Number(s.totalBreakMinutes),
      })),
    };
  } catch (error) {
    console.error("Error al obtener resumen semanal:", error);
    throw error;
  }
}

// Obtener resumen mensual
export async function getMonthlySummaries(year: number, month: number) {
  try {
    const { employeeId, orgId } = await getAuthenticatedEmployee();

    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const summaries = await prisma.workdaySummary.findMany({
      where: {
        orgId,
        employeeId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        timeEntries: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return summaries.map((s) => ({
      ...s,
      totalWorkedMinutes: Number(s.totalWorkedMinutes),
      totalBreakMinutes: Number(s.totalBreakMinutes),
    }));
  } catch (error) {
    console.error("Error al obtener resumen mensual:", error);
    throw error;
  }
}

/**
 * Detecta fichajes incompletos (entrada sin salida)
 * Retorna información del fichaje abierto con cálculo de duración y % de jornada
 */
export async function detectIncompleteEntries() {
  try {
    const employee = await getAuthenticatedEmployee();
    const now = new Date();
    const today = startOfDay(now);

    // Buscar último CLOCK_IN sin CLOCK_OUT correspondiente (NO cancelado)
    const openClockIn = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employee.employeeId,
        orgId: employee.orgId,
        entryType: "CLOCK_IN",
        isCancelled: false,
        isManual: false,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    if (!openClockIn) {
      return null;
    }

    // Verificar si tiene CLOCK_OUT posterior
    const hasClockOut = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employee.employeeId,
        orgId: employee.orgId,
        entryType: "CLOCK_OUT",
        isCancelled: false,
        timestamp: {
          gt: openClockIn.timestamp,
        },
      },
    });

    if (hasClockOut) {
      return null; // Ya tiene salida, no está abierto
    }

    // Calcular duración
    const durationMinutes = Math.floor((now.getTime() - new Date(openClockIn.timestamp).getTime()) / (1000 * 60));
    const durationHours = durationMinutes / 60;

    // Calcular umbral y % de jornada
    const dailyHours = employee.dailyHours;
    const thresholdHours = dailyHours * 1.5; // 150%
    const percentageOfJourney = (durationHours / dailyHours) * 100;
    const isExcessive = durationHours > thresholdHours;

    // Solo retornar si supera el 150% de la jornada
    // Fichajes abiertos normales (del mismo día, dentro del rango) no deben generar aviso
    if (!isExcessive) {
      return null;
    }

    return {
      hasIncompleteEntry: true,
      isExcessive: true, // Siempre true cuando llegamos aquí
      durationHours,
      durationMinutes,
      dailyHours,
      thresholdHours,
      percentageOfJourney,
      clockInDate: startOfDay(new Date(openClockIn.timestamp)),
      clockInTime: openClockIn.timestamp,
      clockInId: openClockIn.id,
      workdayId: openClockIn.workdayId,
    };
  } catch (error) {
    console.error("Error al detectar fichajes incompletos:", error);
    return null;
  }
}

/**
 * Crea una notificación cuando un fichaje excede el 150% de la jornada laboral
 * Se usa para alertar al usuario de que necesita regularizar su fichaje
 * NOTA: Esta función ya no se usa con el nuevo flujo de cancelación
 */
async function createExcessiveTimeNotification(
  userId: string,
  orgId: string,
  workdayId: string,
  durationHours: number,
  dailyHours: number,
  workdayDate: Date,
) {
  try {
    const { createNotification } = await import("./notifications");

    const percentageWorked = (durationHours / dailyHours) * 100;

    await createNotification(
      userId,
      orgId,
      "TIME_ENTRY_EXCESSIVE",
      "Fichaje excede jornada laboral",
      `Has estado fichado ${durationHours.toFixed(1)}h (${percentageWorked.toFixed(0)}% de tu jornada de ${dailyHours}h). Revisa si necesitas regularizar este fichaje del ${workdayDate.toLocaleDateString("es-ES")}.`,
      undefined, // ptoRequestId
      undefined, // manualTimeEntryRequestId
      undefined, // expenseId
    );

    console.log(`✅ Notificación de fichaje excesivo creada para workday ${workdayId}`);
  } catch (error) {
    console.error("Error al crear notificación de fichaje excesivo:", error);
    // No lanzar error para no bloquear el fichaje
  }
}

/**
 * Cancela un fichaje CLOCK_IN abierto cuando se aprueba una solicitud manual
 * Se utiliza en el flujo de aprobación de solicitudes de fichaje manual
 */
export async function cancelOpenClockIn(
  employeeId: string,
  orgId: string,
  date: Date,
  reason: string = "Reemplazado por solicitud manual aprobada",
) {
  try {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Buscar CLOCK_IN sin CLOCK_OUT del día (no cancelado)
    const openClockIn = await prisma.timeEntry.findFirst({
      where: {
        employeeId,
        orgId,
        entryType: "CLOCK_IN",
        isCancelled: false,
        isManual: false,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    if (!openClockIn) {
      console.log(
        `ℹ️ No se encontró CLOCK_IN abierto para cancelar (empleado: ${employeeId}, fecha: ${date.toLocaleDateString()})`,
      );
      return null;
    }

    // Verificar que no tenga CLOCK_OUT
    const hasClockOut = await prisma.timeEntry.findFirst({
      where: {
        employeeId,
        orgId,
        entryType: "CLOCK_OUT",
        isCancelled: false,
        timestamp: {
          gte: openClockIn.timestamp,
          lte: dayEnd,
        },
      },
    });

    if (hasClockOut) {
      console.log(`ℹ️ El CLOCK_IN ya tiene CLOCK_OUT, no se cancela (empleado: ${employeeId})`);
      return null;
    }

    // Cancelar el CLOCK_IN abierto
    const cancelled = await prisma.timeEntry.update({
      where: { id: openClockIn.id },
      data: {
        isCancelled: true,
        cancellationReason: "ADMIN_CORRECTION",
        cancelledAt: new Date(),
        cancellationNotes: reason,
      },
    });

    console.log(`✅ CLOCK_IN cancelado exitosamente (ID: ${cancelled.id})`);

    return cancelled;
  } catch (error) {
    console.error("Error al cancelar CLOCK_IN abierto:", error);
    return null; // No lanzar error para no bloquear la aprobación
  }
}

/**
 * Recalcular WorkdaySummary para un día específico
 * Útil para corregir discrepancias causadas por fichajes manuales o errores en el cálculo
 */
export async function recalculateWorkdaySummary(date: Date) {
  try {
    const { employee, orgId } = await getAuthenticatedEmployee();
    const employeeId = employee.id;

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    console.log("🔄 RECALCULANDO WorkdaySummary...");
    console.log(`   Empleado: ${employeeId}`);
    console.log(`   Fecha: ${dayStart.toLocaleDateString("es-ES")}`);

    // 1. Obtener TODOS los fichajes del día (solo NO cancelados)
    const entries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        orgId,
        isCancelled: false, // ⚠️ CRÍTICO: Solo fichajes activos
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    console.log(`   📋 Fichajes activos encontrados: ${entries.length}`);

    if (entries.length === 0) {
      console.log("   ⚠️ No hay fichajes activos para este día");

      // Eliminar el WorkdaySummary si existe (día sin fichajes)
      await prisma.workdaySummary.deleteMany({
        where: {
          orgId,
          employeeId,
          date: dayStart,
        },
      });
      await removeAutoTimeBankMovement(orgId, employeeId, dayStart);

      return {
        success: true,
        message: "No hay fichajes para este día",
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
      };
    }

    // Imprimir todos los fichajes para debugging
    for (const entry of entries) {
      const manualMark = entry.isManual ? "📝 MANUAL" : "🤖 AUTO";
      console.log(
        `   ${manualMark} | ${entry.entryType.padEnd(12)} | ${new Date(entry.timestamp).toLocaleString("es-ES")}`,
      );
    }

    // 2. Calcular minutos trabajados
    const { worked, break: breakTime } = calculateWorkedMinutes(entries);

    console.log(`   ✅ Trabajado: ${worked.toFixed(2)} min (${(worked / 60).toFixed(2)} horas)`);
    console.log(`   ☕ Pausas: ${breakTime.toFixed(2)} min (${(breakTime / 60).toFixed(2)} horas)`);

    // 3. Obtener horario efectivo usando el motor de cálculo V2.0
    let expectedMinutes: number | null = null;
    let deviationMinutes: number | null = null;
    let scheduleSource: string | null = null;
    let scheduleIsWorkday: boolean | null = null;

    try {
      const effectiveSchedule = await getEffectiveSchedule(employeeId, dayStart);
      scheduleSource = effectiveSchedule.source ?? null;
      scheduleIsWorkday = effectiveSchedule.isWorkingDay;
      expectedMinutes = effectiveSchedule.expectedMinutes;
      deviationMinutes = worked - expectedMinutes;

      console.log(`   📅 Esperado: ${expectedMinutes.toFixed(2)} min (${(expectedMinutes / 60).toFixed(2)} horas)`);
      console.log(
        `   📊 Desviación: ${deviationMinutes > 0 ? "+" : ""}${deviationMinutes.toFixed(2)} min (${(deviationMinutes / 60).toFixed(2)} horas)`,
      );
    } catch (error) {
      console.log("   ⚠️ No se pudo obtener horario efectivo (normal si no hay asignación)");
    }

    if ((expectedMinutes === null || expectedMinutes === 0) && entries.length > 0 && scheduleIsWorkday !== false) {
      const fallbackMinutes = await getFallbackExpectedMinutes(employeeId, orgId);
      if (fallbackMinutes) {
        expectedMinutes = fallbackMinutes;
        deviationMinutes = worked - fallbackMinutes;
      }
    }

    // 4. Determinar clockIn y clockOut
    const firstEntry = entries.find((e) => e.entryType === "CLOCK_IN");
    const lastExit = [...entries].reverse().find((e) => e.entryType === "CLOCK_OUT");

    // 5. Determinar estado
    let status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" = "IN_PROGRESS";
    if (lastExit) {
      if (expectedMinutes) {
        // Sistema V2.0: Usar expectedMinutes del horario asignado
        const workedHours = worked / 60;
        const expectedHours = expectedMinutes / 60;
        const compliance = (workedHours / expectedHours) * 100;

        if (compliance >= 95) {
          status = "COMPLETED";
        } else {
          status = "INCOMPLETE";
        }
      } else {
        // Sin horario asignado: Marcar como COMPLETED por defecto
        console.log("   ⚠️ Sin horario asignado, marcando como COMPLETED por defecto");
        status = "COMPLETED";
      }
    }

    console.log(`   📊 Status: ${status}`);

    // 6. Actualizar o crear WorkdaySummary
    const summary = await prisma.workdaySummary.upsert({
      where: {
        orgId_employeeId_date: {
          orgId,
          employeeId,
          date: dayStart,
        },
      },
      create: {
        orgId,
        employeeId,
        date: dayStart,
        clockIn: firstEntry?.timestamp ?? null,
        clockOut: lastExit?.timestamp ?? null,
        totalWorkedMinutes: worked,
        totalBreakMinutes: breakTime,
        expectedMinutes,
        deviationMinutes,
        status,
      },
      update: {
        clockIn: firstEntry?.timestamp ?? null,
        clockOut: lastExit?.timestamp ?? null,
        totalWorkedMinutes: worked,
        totalBreakMinutes: breakTime,
        expectedMinutes,
        deviationMinutes,
        status,
      },
    });

    console.log("   ✅ WorkdaySummary actualizado correctamente");
    await syncTimeBankForWorkday(summary);

    return {
      success: true,
      message: "Resumen recalculado correctamente",
      totalWorkedMinutes: worked,
      totalBreakMinutes: breakTime,
      status,
      clockIn: firstEntry?.timestamp ?? null,
      clockOut: lastExit?.timestamp ?? null,
    };
  } catch (error) {
    console.error("❌ Error al recalcular WorkdaySummary:", error);
    throw error;
  }
}

/**
 * FASE 3.2: Recalcula WorkdaySummary para un rango de fechas cuando se aprueba un PTO retroactivo
 *
 * Cuando se aprueba un PTO con fechas en el pasado, los WorkdaySummary existentes
 * deben recalcularse para reflejar que ahora esos días son ausencia (expectedMinutes = 0)
 *
 * @param employeeId ID del empleado
 * @param orgId ID de la organización
 * @param startDate Fecha de inicio del PTO
 * @param endDate Fecha de fin del PTO
 * @param absenceType Tipo de ausencia para el log
 */
export async function recalculateWorkdaySummaryForRetroactivePto(
  employeeId: string,
  orgId: string,
  startDate: Date,
  endDate: Date,
  absenceType?: string,
): Promise<{ success: boolean; recalculatedDays: number }> {
  const today = startOfDay(new Date());
  const ptoStart = startOfDay(startDate);
  const ptoEnd = startOfDay(endDate);

  // Solo procesar días que ya pasaron (hasta ayer incluido)
  const effectiveEnd = ptoEnd < today ? ptoEnd : addDays(today, -1);

  // Si el PTO empieza en el futuro, no hay nada que recalcular
  if (ptoStart >= today) {
    console.log("🔄 PTO retroactivo: Todas las fechas son futuras, no hay recálculo necesario");
    return { success: true, recalculatedDays: 0 };
  }

  console.log("🔄 Recalculando WorkdaySummary para PTO retroactivo...");
  console.log(`   Empleado: ${employeeId}`);
  console.log(`   Tipo: ${absenceType ?? "PTO"}`);
  console.log(`   Rango: ${ptoStart.toLocaleDateString("es-ES")} - ${effectiveEnd.toLocaleDateString("es-ES")}`);

  let recalculatedDays = 0;
  let currentDate = ptoStart;

  while (currentDate <= effectiveEnd) {
    const dayStart = startOfDay(currentDate);

    // Buscar si existe un WorkdaySummary para este día
    const existingSummary = await prisma.workdaySummary.findUnique({
      where: {
        orgId_employeeId_date: {
          orgId,
          employeeId,
          date: dayStart,
        },
      },
    });

    if (existingSummary) {
      // Recalcular usando el motor de horarios (ahora retornará source: "ABSENCE")
      const effectiveSchedule = await getEffectiveSchedule(employeeId, dayStart);

      // Actualizar expectedMinutes y deviationMinutes
      const newExpectedMinutes = effectiveSchedule.expectedMinutes;
      const newDeviationMinutes = existingSummary.totalWorkedMinutes - newExpectedMinutes;

      // Determinar nuevo status
      let newStatus: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" = existingSummary.status as
        | "IN_PROGRESS"
        | "COMPLETED"
        | "INCOMPLETE";
      if (existingSummary.clockOut) {
        if (newExpectedMinutes === 0) {
          // Día de ausencia: cualquier trabajo es bonus
          newStatus = "COMPLETED";
        } else {
          const compliance = (existingSummary.totalWorkedMinutes / newExpectedMinutes) * 100;
          newStatus = compliance >= 95 ? "COMPLETED" : "INCOMPLETE";
        }
      }

      await prisma.workdaySummary.update({
        where: { id: existingSummary.id },
        data: {
          expectedMinutes: newExpectedMinutes,
          deviationMinutes: newDeviationMinutes,
          status: newStatus,
        },
      });

      console.log(
        `   ✅ ${dayStart.toLocaleDateString("es-ES")}: expectedMinutes ${existingSummary.expectedMinutes} → ${newExpectedMinutes}`,
      );
      recalculatedDays++;
    }

    currentDate = addDays(currentDate, 1);
  }

  console.log(`   📊 Total días recalculados: ${recalculatedDays}`);
  return { success: true, recalculatedDays };
}
