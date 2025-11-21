import { prisma } from "@/lib/prisma";

/**
 * Tipo de alerta
 */
export type AlertType =
  | "LATE_ARRIVAL"
  | "EARLY_DEPARTURE"
  | "MISSING_CLOCK_OUT"
  | "ABSENCE"
  | "OVERTIME"
  | "WORK_ON_NON_WORKDAY";

/**
 * Nivel de severidad de la alerta
 */
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Interfaz para los datos de una alerta
 */
export interface AlertData {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  employeeId: string;
  orgId: string;
  metadata?: Record<string, any>;
  date: Date;
  relatedId?: string; // ID de TimeEntry, WorkdaySummary, etc.
}

/**
 * Genera una alerta en el sistema.
 * Es idempotente: si ya existe una alerta similar (mismo tipo, día, empleado) no la duplica,
 * a menos que sea una actualización de estado.
 */
export async function createAlert(data: AlertData) {
  try {
    // 1. Verificar si ya existe una alerta similar hoy para evitar spam
    // (Por ejemplo, múltiples alertas de "llegada tarde" si se recalculan los fichajes)
    const existingAlert = await prisma.alert.findFirst({
      where: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        type: data.type,
        date: {
          gte: new Date(data.date.setHours(0, 0, 0, 0)),
          lt: new Date(data.date.setHours(23, 59, 59, 999)),
        },
        active: true,
      },
    });

    if (existingAlert) {
      // Si ya existe, podríamos actualizarla si la severidad es mayor
      // Por ahora, simplemente retornamos la existente para evitar ruido
      return existingAlert;
    }

    // 2. Crear la alerta
    // Necesitamos obtener las relaciones (Department, CostCenter) para guardar snapshot
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    const contract = employee?.employmentContracts[0];

    const alert = await prisma.alert.create({
      data: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        type: data.type,
        severity: data.severity,
        message: data.message,
        date: data.date,
        metadata: data.metadata ?? {},

        // Snapshots de contexto
        departmentId: contract?.departmentId,
        costCenterId: contract?.costCenterId,

        // Referencias (si las hubiera en el schema, o en metadata)
      },
    });

    // 3. (Futuro) Notificar a suscriptores
    // await notifyAlertSubscribers(alert);

    return alert;
  } catch (error) {
    console.error("Error al crear alerta:", error);
    throw error; // Propagar para manejo superior
  }
}

/**
 * Resuelve (cierra) una alerta
 */
export async function resolveAlert(alertId: string, resolverUserId: string, resolutionNotes?: string) {
  return await prisma.alert.update({
    where: { id: alertId },
    data: {
      active: false,
      resolvedAt: new Date(),
      resolvedByUserId: resolverUserId,
      resolutionNotes,
    },
  });
}

/**
 * Descarta (ignora) una alerta
 */
export async function dismissAlert(alertId: string, dismisserUserId: string, dismissalReason?: string) {
  return await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "DISMISSED", // Asumimos que el enum tiene este estado
      active: false,
      resolvedAt: new Date(),
      resolvedByUserId: dismisserUserId,
      resolutionNotes: dismissalReason, // Reutilizamos el campo de notas
    },
  });
}
