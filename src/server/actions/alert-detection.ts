"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureAlertAssignments } from "@/services/alerts/alert-assignments";
import {
  buildScopeFilter,
  getUserAccessibleCostCenters,
  getUserAccessibleTeams,
} from "@/services/permissions/scope-helpers";
import { getEffectiveSchedule } from "@/services/schedules/schedule-engine";

import { getOrganizationValidationConfig } from "./time-clock-validations";

// Tipos de incidencias individuales (para detectar)
export type IncidentType =
  | "LATE_ARRIVAL" // Llegada tarde (dentro de tolerancia)
  | "CRITICAL_LATE_ARRIVAL" // Llegada tarde crítica (fuera de tolerancia)
  | "EARLY_DEPARTURE" // Salida temprana (dentro de tolerancia)
  | "CRITICAL_EARLY_DEPARTURE" // Salida temprana crítica (fuera de tolerancia)
  | "NON_WORKDAY_CLOCK_IN"; // Fichaje en día no laborable

// Tipos de alerta (para guardar en BD)
export type AlertType = "DAILY_SUMMARY" | IncidentType;

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface Incident {
  type: IncidentType;
  severity: AlertSeverity;
  time: string; // ISO timestamp del fichaje
  deviationMinutes?: number;
  description: string;
}

export interface DetectedAlert {
  type: IncidentType; // Las incidencias detectadas usan IncidentType
  severity: AlertSeverity;
  title: string;
  description: string;
  deviationMinutes?: number;
}

/**
 * Formatea minutos a formato legible (ej: "1h 30min", "45 min")
 */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}min`;
  }
}

/**
 * Detecta alertas para un fichaje específico (entrada/salida) en tiempo real
 * Se ejecuta al hacer clockIn() o clockOut()
 */
export async function detectAlertsForTimeEntry(timeEntryId: string): Promise<DetectedAlert[]> {
  console.log("🔍 [DETECT_ALERTS] Función llamada con timeEntryId:", timeEntryId);
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      console.log("❌ [DETECT_ALERTS] Usuario no autenticado");
      throw new Error("Usuario no autenticado o sin organización");
    }

    console.log("✅ [DETECT_ALERTS] Usuario autenticado, orgId:", session.user.orgId);

    // Obtener configuración de validaciones
    const config = await getOrganizationValidationConfig();
    console.log("⚙️ [DETECT_ALERTS] Config cargada:", {
      alertsEnabled: config.alertsEnabled,
      clockInToleranceMinutes: config.clockInToleranceMinutes,
      criticalLateArrivalMinutes: config.criticalLateArrivalMinutes,
    });

    if (!config.alertsEnabled) {
      console.log("⏹️ [DETECT_ALERTS] Alertas desactivadas en configuración");
      return []; // Alertas desactivadas
    }

    // Obtener el fichaje con datos del empleado y su contrato activo
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        employee: {
          include: {
            employmentContracts: {
              where: { active: true },
              include: {
                costCenter: true,
              },
              take: 1,
              orderBy: { startDate: "desc" },
            },
          },
        },
      },
    });

    if (!timeEntry) {
      throw new Error("Fichaje no encontrado");
    }

    // Obtener horario efectivo del día
    const effectiveSchedule = await getEffectiveSchedule(
      timeEntry.employeeId,
      timeEntry.timestamp, // ✅ CORREGIDO: timestamp es el campo correcto
    );

    console.log("🔍 [ANALYZE] EffectiveSchedule RETORNADO:", {
      source: effectiveSchedule.source,
      date: effectiveSchedule.date.toISOString(),
      isWorkingDay: effectiveSchedule.isWorkingDay,
      expectedMinutes: effectiveSchedule.expectedMinutes,
      timeSlots: effectiveSchedule.timeSlots,
      timeSlotsCount: effectiveSchedule.timeSlots?.length,
    });

    const alerts: DetectedAlert[] = [];

    // Si es día no laborable
    if (!effectiveSchedule.isWorkingDay) {
      console.log("📅 [ANALYZE] Día no laborable detectado");
      if (config.nonWorkdayClockInWarning) {
        alerts.push({
          type: "NON_WORKDAY_CLOCK_IN",
          severity: "WARNING",
          title: "Fichaje en día no laborable",
          description: `El empleado ${timeEntry.employee.firstName} ${timeEntry.employee.lastName} ha fichado en un día no laborable.`,
        });
      }
      // No continuar con más validaciones si es día no laborable
      return alerts;
    }
    console.log("✅ [ANALYZE] Día laborable, continuando validaciones...");

    // Si no hay horario configurado, no podemos validar
    console.log("🔍 [ANALYZE] Verificando horario efectivo:", {
      hasTimeSlots: !!effectiveSchedule.timeSlots && effectiveSchedule.timeSlots.length > 0,
      expectedMinutes: effectiveSchedule.expectedMinutes,
      source: effectiveSchedule.source,
    });

    if (
      !effectiveSchedule.timeSlots ||
      effectiveSchedule.timeSlots.length === 0 ||
      effectiveSchedule.expectedMinutes === 0
    ) {
      console.log("❌ [ANALYZE] Sin franjas horarias o expectedMinutes === 0, retornando sin alertas");
      return alerts;
    }
    console.log("✅ [ANALYZE] Horario válido encontrado");

    console.log("📝 [ANALYZE] Tipo de fichaje:", {
      entryType: timeEntry.entryType,
      timestamp: timeEntry.timestamp.toISOString(),
    });

    // VALIDACIÓN 1: Entrada tardía (solo para CLOCK_IN)
    if (timeEntry.entryType === "CLOCK_IN") {
      const firstWorkSlot = effectiveSchedule.timeSlots?.find((slot) => slot.slotType === "WORK");

      console.log("🔍 [ANALYZE] Validando CLOCK_IN - Primera franja de trabajo:", {
        hasTimeSlots: !!effectiveSchedule.timeSlots,
        timeSlotsCount: effectiveSchedule.timeSlots?.length,
        firstWorkSlot: firstWorkSlot,
      });

      if (!firstWorkSlot) {
        console.log("❌ [ANALYZE] No se encontró franja de trabajo para CLOCK_IN");
        return alerts;
      }

      // Crear fecha con la hora programada de inicio
      const scheduledStartTime = new Date(timeEntry.timestamp);
      scheduledStartTime.setHours(Math.floor(firstWorkSlot.startMinutes / 60), firstWorkSlot.startMinutes % 60, 0, 0);

      console.log("⏰ [ANALYZE] Comparación CLOCK_IN:", {
        actualTime: timeEntry.timestamp.toISOString(),
        scheduledTime: scheduledStartTime.toISOString(),
        firstWorkSlotStartMinutes: firstWorkSlot.startMinutes,
        isLate: timeEntry.timestamp > scheduledStartTime,
      });

      if (timeEntry.timestamp > scheduledStartTime) {
        const lateMinutes = Math.round((timeEntry.timestamp.getTime() - scheduledStartTime.getTime()) / (1000 * 60));

        console.log("🚨 [ANALYZE] LLEGADA TARDÍA DETECTADA:", {
          lateMinutes,
          criticalThreshold: config.criticalLateArrivalMinutes,
          warningThreshold: config.clockInToleranceMinutes,
          isCritical: lateMinutes > config.criticalLateArrivalMinutes,
        });

        if (lateMinutes > config.criticalLateArrivalMinutes) {
          alerts.push({
            type: "CRITICAL_LATE_ARRIVAL",
            severity: "CRITICAL",
            title: "Entrada tardía crítica",
            description: `El empleado llegó ${formatMinutes(lateMinutes)} tarde (umbral crítico: ${formatMinutes(config.criticalLateArrivalMinutes)}).`,
            deviationMinutes: lateMinutes,
          });
        } else if (lateMinutes > config.clockInToleranceMinutes) {
          alerts.push({
            type: "LATE_ARRIVAL",
            severity: "WARNING",
            title: "Entrada tardía",
            description: `El empleado llegó ${formatMinutes(lateMinutes)} tarde (tolerancia: ${formatMinutes(config.clockInToleranceMinutes)}).`,
            deviationMinutes: lateMinutes,
          });
        }
      }
    }

    // VALIDACIÓN 2: Salida temprana (solo para CLOCK_OUT)
    if (timeEntry.entryType === "CLOCK_OUT") {
      const lastWorkSlot = effectiveSchedule.timeSlots?.filter((slot) => slot.slotType === "WORK").pop();

      console.log("🔍 [ANALYZE] Validando CLOCK_OUT - Última franja de trabajo:", {
        lastWorkSlot: lastWorkSlot,
      });

      if (lastWorkSlot) {
        // Crear fecha con la hora programada de fin
        const scheduledEndTime = new Date(timeEntry.timestamp);
        scheduledEndTime.setHours(Math.floor(lastWorkSlot.endMinutes / 60), lastWorkSlot.endMinutes % 60, 0, 0);

        console.log("⏰ [ANALYZE] Comparación CLOCK_OUT:", {
          actualTime: timeEntry.timestamp.toISOString(),
          scheduledTime: scheduledEndTime.toISOString(),
          lastWorkSlotEndMinutes: lastWorkSlot.endMinutes,
          isEarly: timeEntry.timestamp < scheduledEndTime,
        });

        if (timeEntry.timestamp < scheduledEndTime) {
          const earlyMinutes = Math.round((scheduledEndTime.getTime() - timeEntry.timestamp.getTime()) / (1000 * 60));

          console.log("🚨 [ANALYZE] SALIDA TEMPRANA DETECTADA:", {
            earlyMinutes,
            criticalThreshold: config.criticalEarlyDepartureMinutes,
            warningThreshold: config.clockOutToleranceMinutes,
          });

          if (earlyMinutes > config.criticalEarlyDepartureMinutes) {
            alerts.push({
              type: "CRITICAL_EARLY_DEPARTURE",
              severity: "CRITICAL",
              title: "Salida temprana crítica",
              description: `El empleado salió ${formatMinutes(earlyMinutes)} antes (umbral crítico: ${formatMinutes(config.criticalEarlyDepartureMinutes)}).`,
              deviationMinutes: earlyMinutes,
            });
          } else if (earlyMinutes > config.clockOutToleranceMinutes) {
            alerts.push({
              type: "EARLY_DEPARTURE",
              severity: "WARNING",
              title: "Salida temprana",
              description: `El empleado salió ${formatMinutes(earlyMinutes)} antes (tolerancia: ${formatMinutes(config.clockOutToleranceMinutes)}).`,
              deviationMinutes: earlyMinutes,
            });
          }
        }
      }
    }

    console.log("✅ [ANALYZE] Validaciones completadas, alertas generadas:", alerts.length);

    // Crear alertas en la base de datos (vinculadas al fichaje específico)
    await saveDetectedAlerts(timeEntry.employeeId, timeEntry.timestamp, alerts, timeEntryId);

    return alerts;
  } catch (error) {
    console.error("Error al detectar alertas:", error);
    throw error;
  }
}

/**
 * Detecta alertas para un día completo de un empleado (batch processing)
 * Se ejecuta en el cron job diario a las 23:00
 */
export async function detectAlertsForDate(employeeId: string, date: Date): Promise<DetectedAlert[]> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    // Obtener configuración de validaciones
    const config = await getOrganizationValidationConfig();

    if (!config.alertsEnabled) {
      return [];
    }

    // Obtener el workdaySummary del día
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const workdaySummary = await prisma.workdaySummary.findFirst({
      where: {
        employeeId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        employee: {
          include: {
            costCenter: true,
          },
        },
      },
    });

    // Obtener horario efectivo del día
    const effectiveSchedule = await getEffectiveSchedule(employeeId, date);

    const alerts: DetectedAlert[] = [];

    // Si es día no laborable y el empleado NO fichó, no hay alertas
    if (effectiveSchedule.type === "NON_WORKDAY" && !workdaySummary) {
      return alerts;
    }

    // Si es día no laborable y el empleado SÍ fichó, generar alerta
    if (effectiveSchedule.type === "NON_WORKDAY" && workdaySummary) {
      if (config.nonWorkdayClockInWarning) {
        alerts.push({
          type: "NON_WORKDAY_CLOCK_IN",
          severity: "WARNING",
          title: "Fichaje en día no laborable",
          description: `El empleado fichó en un día no laborable.`,
        });
      }
    }

    // Si es día laborable pero no hay fichajes
    if (effectiveSchedule.type !== "NON_WORKDAY" && !workdaySummary) {
      // Solo alertar si el día ya pasó (no alertar por días futuros)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date < today) {
        alerts.push({
          type: "MISSING_CLOCK_IN",
          severity: "CRITICAL",
          title: "Falta fichaje de entrada",
          description: `El empleado no fichó entrada en un día laborable.`,
        });
      }

      // Guardar alertas y retornar
      await saveDetectedAlerts(employeeId, date, alerts);
      return alerts;
    }

    // Si hay workdaySummary, validar según estado
    if (workdaySummary) {
      // Verificar que tenga entrada pero no salida
      if (!workdaySummary.clockOut) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Solo alertar si el día ya pasó
        if (date < today) {
          alerts.push({
            type: "MISSING_CLOCK_OUT",
            severity: "WARNING",
            title: "Falta fichaje de salida",
            description: `El empleado fichó entrada pero no salida.`,
          });
        }
      }

      // Validar desviación si hay horario configurado
      const shouldValidateDeviation =
        effectiveSchedule.type !== "NON_WORKDAY" &&
        workdaySummary.expectedMinutes &&
        workdaySummary.deviationMinutes !== null;

      if (!shouldValidateDeviation) {
        // Guardar alertas y retornar
        await saveDetectedAlerts(employeeId, date, alerts);
        return alerts;
      }

      const deviation = workdaySummary.deviationMinutes;

      // Llegada tarde (early return pattern)
      if (deviation < 0) {
        const lateMinutes = Math.abs(deviation);

        if (lateMinutes > config.criticalLateArrivalMinutes) {
          alerts.push({
            type: "CRITICAL_LATE_ARRIVAL",
            severity: "CRITICAL",
            title: "Entrada tardía crítica",
            description: `El empleado trabajó ${formatMinutes(lateMinutes)} menos de lo esperado (umbral crítico: ${formatMinutes(config.criticalLateArrivalMinutes)}).`,
            deviationMinutes: lateMinutes,
          });
        } else if (lateMinutes > config.clockInToleranceMinutes) {
          alerts.push({
            type: "LATE_ARRIVAL",
            severity: "WARNING",
            title: "Entrada tardía",
            description: `El empleado trabajó ${formatMinutes(lateMinutes)} menos de lo esperado (tolerancia: ${formatMinutes(config.clockInToleranceMinutes)}).`,
            deviationMinutes: lateMinutes,
          });
        }
      }

      // Horas excesivas
      if (workdaySummary.totalWorkedMinutes && workdaySummary.totalWorkedMinutes > 12 * 60) {
        alerts.push({
          type: "EXCESSIVE_HOURS",
          severity: "WARNING",
          title: "Horas excesivas trabajadas",
          description: `El empleado trabajó ${Math.round(workdaySummary.totalWorkedMinutes / 60)} horas en un día (más de 12 horas).`,
          deviationMinutes: workdaySummary.totalWorkedMinutes - 12 * 60,
        });
      }
    }

    // Guardar alertas en la base de datos
    await saveDetectedAlerts(employeeId, date, alerts);

    return alerts;
  } catch (error) {
    console.error("Error al detectar alertas para fecha:", error);
    throw error;
  }
}

/**
 * Guarda o actualiza la alerta resumen diaria con las nuevas incidencias detectadas
 * Solo existe UNA alerta tipo DAILY_SUMMARY por empleado por día
 * Cada fichaje problemático añade incidencias a esta alerta
 */
async function saveDetectedAlerts(
  employeeId: string,
  date: Date,
  alerts: DetectedAlert[],
  timeEntryId?: string,
): Promise<void> {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    if (alerts.length === 0) return; // Sin incidencias, no hacer nada

    // Obtener employee con costCenter y department desde su contrato activo
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        employmentContracts: {
          where: { active: true },
          select: {
            costCenterId: true,
            departmentId: true,
          },
          take: 1,
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    const costCenterId = employee.employmentContracts[0]?.costCenterId ?? null;
    const departmentId = employee.employmentContracts[0]?.departmentId ?? null;
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Convertir alertas detectadas a incidencias
    const newIncidents: Incident[] = alerts.map((alert) => ({
      type: alert.type, // ✅ Coincide directamente
      severity: alert.severity,
      time: date.toISOString(),
      deviationMinutes: alert.deviationMinutes,
      description: alert.description,
    }));

    // Buscar alerta resumen existente del día
    const existingAlert = await prisma.alert.findUnique({
      where: {
        employeeId_date_type: {
          employeeId,
          date: normalizedDate,
          type: "DAILY_SUMMARY",
        },
      },
    });

    // Combinar incidencias existentes con las nuevas
    const existingIncidents = (existingAlert?.incidents as Incident[]) ?? [];
    const allIncidents = [...existingIncidents, ...newIncidents];

    // Calcular severidad máxima y contadores
    const severities = allIncidents.map((i) => i.severity);
    const maxSeverity: AlertSeverity = severities.includes("CRITICAL")
      ? "CRITICAL"
      : severities.includes("WARNING")
        ? "WARNING"
        : "INFO";

    // Contar tipos de incidencias
    const counts = allIncidents.reduce(
      (acc, incident) => {
        if (incident.type.includes("LATE_ARRIVAL")) acc.lateArrivals++;
        if (incident.type.includes("EARLY_DEPARTURE")) acc.earlyDepartures++;
        if (incident.type === "NON_WORKDAY_CLOCK_IN") acc.nonWorkdayClockIns++;
        return acc;
      },
      { lateArrivals: 0, earlyDepartures: 0, nonWorkdayClockIns: 0 },
    );

    // Construir descripción resumen
    const parts: string[] = [];
    if (counts.lateArrivals > 0) parts.push(`Llegadas tarde: ${counts.lateArrivals}`);
    if (counts.earlyDepartures > 0) parts.push(`Salidas tempranas: ${counts.earlyDepartures}`);
    if (counts.nonWorkdayClockIns > 0) parts.push(`Fichajes en día no laborable: ${counts.nonWorkdayClockIns}`);

    const description = parts.join(", ");
    const title = `Resumen del día: ${allIncidents.length} incidencia${allIncidents.length > 1 ? "s" : ""}`;

    // Crear o actualizar la alerta resumen
    const savedAlert = await prisma.alert.upsert({
      where: {
        employeeId_date_type: {
          employeeId,
          date: normalizedDate,
          type: "DAILY_SUMMARY",
        },
      },
      create: {
        orgId: session.user.orgId,
        employeeId,
        type: "DAILY_SUMMARY",
        severity: maxSeverity,
        title,
        description,
        date: normalizedDate,
        departmentId,
        costCenterId,
        originalCostCenterId: costCenterId,
        status: "ACTIVE",
        incidents: allIncidents,
      },
      update: {
        severity: maxSeverity,
        title,
        description,
        incidents: allIncidents,
        updatedAt: new Date(),
      },
    });

    await ensureAlertAssignments(savedAlert.id, employeeId);

    console.log(`✅ [SAVE_ALERTS] Alerta resumen actualizada: ${allIncidents.length} incidencias totales`);
  } catch (error) {
    console.error("Error al guardar alertas:", error);
    throw error;
  }
}

/**
 * Obtiene alertas activas de la organización con filtros opcionales
 * APLICA FILTRADO POR SCOPE: solo retorna alertas del ámbito del usuario
 */
export async function getActiveAlerts(filters?: {
  employeeId?: string;
  costCenterId?: string;
  departmentId?: string;
  teamId?: string;
  severity?: AlertSeverity;
  type?: AlertType;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  "use server";

  try {
    const session = await auth();

    if (!session?.user?.orgId || !session?.user?.id) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    // Obtener filtro de scope del usuario
    const scopeFilter = await buildScopeFilter(session.user.id, "VIEW_ALERTS");

    // Construir where clause
    const whereClause: any = {
      orgId: session.user.orgId,
      ...(filters?.employeeId && { employeeId: filters.employeeId }),
      ...(filters?.costCenterId && { costCenterId: filters.costCenterId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
      ...(filters?.teamId && { teamId: filters.teamId }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.type && { type: filters.type }),
    };

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (filters?.dateFrom) {
      dateFilter.gte = filters.dateFrom;
    }
    if (filters?.dateTo) {
      dateFilter.lte = filters.dateTo;
    }
    if (Object.keys(dateFilter).length > 0) {
      whereClause.date = dateFilter;
    }

    // Solo aplicar scopeFilter si NO está vacío (roles no-ADMIN/RRHH)
    if (Object.keys(scopeFilter).length > 0) {
      whereClause.employee = scopeFilter;
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        costCenter: {
          select: {
            name: true,
            id: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            name: true,
            code: true,
            id: true,
          },
        },
        resolver: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ severity: "desc" }, { date: "desc" }, { createdAt: "desc" }],
    });

    // Serializar fechas a ISO strings para evitar problemas de hidratación en Next.js 15
    return alerts.map((alert) => ({
      ...alert,
      date: alert.date.toISOString(),
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
      resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
    }));
  } catch (error) {
    console.error("Error al obtener alertas activas:", error);
    throw error;
  }
}

async function canResolveAlertForUser(
  userId: string,
  orgId: string,
  alert: {
    departmentId: string | null;
    costCenterId: string | null;
    originalCostCenterId: string | null;
    teamId: string | null;
  },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return false;
  }

  if (user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN" || user.role === "HR_ADMIN") {
    return true;
  }

  const responsibilities = await prisma.areaResponsible.findMany({
    where: {
      userId,
      orgId,
      isActive: true,
      permissions: { has: "RESOLVE_ALERTS" },
    },
    select: { scope: true, departmentId: true, costCenterId: true, teamId: true },
  });

  if (responsibilities.length === 0) {
    return false;
  }

  return responsibilities.some((responsibility) => {
    if (responsibility.scope === "ORGANIZATION") {
      return true;
    }
    if (responsibility.scope === "DEPARTMENT") {
      return responsibility.departmentId !== null && responsibility.departmentId === alert.departmentId;
    }
    if (responsibility.scope === "COST_CENTER") {
      if (!responsibility.costCenterId) return false;
      return (
        responsibility.costCenterId === alert.costCenterId || responsibility.costCenterId === alert.originalCostCenterId
      );
    }
    if (responsibility.scope === "TEAM") {
      return responsibility.teamId !== null && responsibility.teamId === alert.teamId;
    }
    return false;
  });
}

/**
 * Resuelve una alerta
 */
export async function resolveAlert(alertId: string, comment?: string): Promise<{ success: boolean }> {
  "use server";

  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    const config = await getOrganizationValidationConfig();
    if (!config.alertsRequireResolution) {
      throw new Error("La resolución de alertas está desactivada");
    }

    // Verificar que la alerta pertenece a la organización
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.orgId !== session.user.orgId) {
      throw new Error("Alerta no encontrada o sin permisos");
    }

    const canResolve = await canResolveAlertForUser(session.user.id, session.user.orgId, alert);
    if (!canResolve) {
      throw new Error("No tienes permisos para resolver esta alerta");
    }

    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        resolutionComment: comment,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al resolver alerta:", error);
    throw error;
  }
}

/**
 * Descarta una alerta
 */
export async function dismissAlert(alertId: string, comment?: string): Promise<{ success: boolean }> {
  "use server";

  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    const config = await getOrganizationValidationConfig();
    if (!config.alertsRequireResolution) {
      throw new Error("La resolución de alertas está desactivada");
    }

    // Verificar que la alerta pertenece a la organización
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.orgId !== session.user.orgId) {
      throw new Error("Alerta no encontrada o sin permisos");
    }

    const canResolve = await canResolveAlertForUser(session.user.id, session.user.orgId, alert);
    if (!canResolve) {
      throw new Error("No tienes permisos para resolver esta alerta");
    }

    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: "DISMISSED",
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        resolutionComment: comment,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error al descartar alerta:", error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de alertas para un período
 * APLICA FILTRADO POR SCOPE: solo cuenta alertas del ámbito del usuario
 */
export async function getAlertStats(filters?: {
  costCenterId?: string;
  departmentId?: string;
  teamId?: string;
  severity?: AlertSeverity;
  type?: AlertType;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  "use server";

  try {
    const session = await auth();

    if (!session?.user?.orgId || !session?.user?.id) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    // Obtener filtro de scope del usuario
    const scopeFilter = await buildScopeFilter(session.user.id, "VIEW_ALERTS");

    const where: any = {
      orgId: session.user.orgId,
      ...(filters?.costCenterId && { costCenterId: filters.costCenterId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
      ...(filters?.teamId && { teamId: filters.teamId }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.type && { type: filters.type }),
    };

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (filters?.dateFrom) {
      dateFilter.gte = filters.dateFrom;
    }
    if (filters?.dateTo) {
      dateFilter.lte = filters.dateTo;
    }
    if (Object.keys(dateFilter).length > 0) {
      where.date = dateFilter;
    }

    // Solo aplicar scopeFilter si NO está vacío (roles no-ADMIN/RRHH)
    if (Object.keys(scopeFilter).length > 0) {
      where.employee = scopeFilter;
    }

    const [total, active, resolved, dismissed, bySeverity, byType] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.alert.count({ where: { ...where, status: "RESOLVED" } }),
      prisma.alert.count({ where: { ...where, status: "DISMISSED" } }),
      prisma.alert.groupBy({
        by: ["severity"],
        where,
        _count: true,
      }),
      prisma.alert.groupBy({
        by: ["type"],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      resolved,
      dismissed,
      bySeverity: bySeverity.map((item) => ({
        severity: item.severity,
        count: item._count,
      })),
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de alertas:", error);
    throw error;
  }
}

/**
 * Obtiene el conteo de alertas por fecha para un empleado en un rango
 * Útil para mostrar badges en calendarios y DayCards
 */
export async function getEmployeeAlertsByDateRange(
  employeeId: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, { total: number; bySeverity: Record<string, number> }>> {
  "use server";

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      throw new Error("Usuario no autenticado o sin organización");
    }

    // Obtener todas las alertas del empleado en el rango de fechas
    const alerts = await prisma.alert.findMany({
      where: {
        orgId: session.user.orgId,
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: "ACTIVE", // Solo alertas activas (no resueltas ni descartadas)
      },
      select: {
        date: true,
        severity: true,
      },
    });

    // Agrupar por fecha y severidad
    const result: Record<string, { total: number; bySeverity: Record<string, number> }> = {};

    for (const alert of alerts) {
      const dateKey = alert.date.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!result[dateKey]) {
        result[dateKey] = {
          total: 0,
          bySeverity: {},
        };
      }

      result[dateKey].total++;
      result[dateKey].bySeverity[alert.severity] = (result[dateKey].bySeverity[alert.severity] || 0) + 1;
    }

    return result;
  } catch (error) {
    console.error("Error al obtener alertas por rango de fechas:", error);
    throw error;
  }
}

/**
 * Obtiene el conteo de alertas activas (para mostrar en navbar)
 * APLICA FILTRADO POR SCOPE: solo cuenta alertas del ámbito del usuario
 */
export async function getActiveAlertsCount(): Promise<number> {
  "use server";

  try {
    const session = await auth();
    if (!session?.user?.orgId || !session?.user?.id) {
      return 0;
    }

    // Obtener filtro de scope del usuario
    const scopeFilter = await buildScopeFilter(session.user.id, "VIEW_ALERTS");

    const where: any = {
      orgId: session.user.orgId,
      status: "ACTIVE",
    };

    // Solo aplicar scopeFilter si NO está vacío (roles no-ADMIN/RRHH)
    if (Object.keys(scopeFilter).length > 0) {
      where.employee = scopeFilter;
    }

    const count = await prisma.alert.count({ where });

    return count;
  } catch (error) {
    console.error("Error al obtener conteo de alertas activas:", error);
    return 0;
  }
}

/**
 * Obtiene los filtros disponibles para el usuario (centros y equipos)
 * según sus responsabilidades de área.
 * Útil para poblar dropdowns de filtros en la UI.
 */
export async function getAvailableAlertFilters() {
  "use server";

  try {
    const session = await auth();
    if (!session?.user?.orgId || !session?.user?.id) {
      return {
        costCenters: [],
        teams: [],
        severities: ["INFO", "WARNING", "CRITICAL"] as const,
      };
    }

    const [costCenters, teams] = await Promise.all([
      getUserAccessibleCostCenters(session.user.id, session.user.orgId),
      getUserAccessibleTeams(session.user.id, session.user.orgId),
    ]);

    return {
      costCenters,
      teams,
      severities: ["INFO", "WARNING", "CRITICAL"] as const,
    };
  } catch (error) {
    console.error("Error al obtener filtros disponibles:", error);
    return {
      costCenters: [],
      teams: [],
      severities: ["INFO", "WARNING", "CRITICAL"] as const,
    };
  }
}
