/**
 * Cron Job: Procesar turnos del día anterior
 * Se ejecuta diariamente a las 02:00 AM
 *
 * Tareas:
 * - Cerrar turnos completados (status: PUBLISHED → CLOSED)
 * - Marcar ausencias (turnos sin fichaje)
 * - Generar notificaciones de anomalías
 */

import { NextResponse } from "next/server";

import { subDays, startOfDay, endOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { markShiftAsAbsent } from "@/lib/shifts/shift-integration";
import { processShiftAnomalyNotifications } from "@/lib/shifts/shift-notifications";

export const maxDuration = 300; // 5 minutos máximo
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verificar autorización (Vercel Cron secret)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🌙 Iniciando procesamiento nocturno de turnos...");

    const yesterday = subDays(new Date(), 1);
    const dayStart = startOfDay(yesterday);
    const dayEnd = endOfDay(yesterday);

    // 1. Obtener turnos publicados del día anterior
    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: "PUBLISHED",
      },
      include: {
        assignments: true,
      },
    });

    console.log(`📊 Procesando ${shifts.length} turnos del ${yesterday.toLocaleDateString()}`);

    let closedCount = 0;
    let absencesCount = 0;
    let anomaliesCount = 0;

    // 2. Procesar cada turno
    for (const shift of shifts) {
      // 2.1 Procesar asignaciones
      for (const assignment of shift.assignments) {
        // Si no tiene clockIn, marcar como ausencia
        if (!assignment.actualClockIn) {
          await markShiftAsAbsent(assignment.id);
          absencesCount++;
          console.log(`  ❌ Ausencia detectada: ${assignment.employeeId} en turno ${shift.id}`);
        }

        // Contar anomalías
        if (assignment.hasDelay || assignment.hasEarlyDeparture || assignment.workedOutsideShift) {
          anomaliesCount++;
          console.log(`  ⚠️ Anomalía detectada: ${assignment.employeeId} en turno ${shift.id}`);
        }
      }

      // 2.2 Cerrar el turno
      await prisma.shift.update({
        where: { id: shift.id },
        data: { status: "CLOSED" },
      });
      closedCount++;
    }

    console.log(`✅ Procesamiento completado:`);
    console.log(`   - ${closedCount} turnos cerrados`);
    console.log(`   - ${absencesCount} ausencias marcadas`);
    console.log(`   - ${anomaliesCount} anomalías detectadas`);

    // 3. Generar notificaciones de anomalías
    const notificationsCreated = await processShiftAnomalyNotifications(yesterday);
    console.log(`   - ${notificationsCreated} notificaciones enviadas`);

    return NextResponse.json({
      success: true,
      processed: {
        shifts: closedCount,
        absences: absencesCount,
        anomalies: anomaliesCount,
        notifications: notificationsCreated,
      },
      date: yesterday.toISOString(),
    });
  } catch (error) {
    console.error("❌ Error en procesamiento nocturno:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
