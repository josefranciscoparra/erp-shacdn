import { PrismaClient } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

const prisma = new PrismaClient();

// Helper para calcular minutos trabajados desde las entradas
function calculateWorkedMinutes(entries: any[]): { worked: number; break: number } {
  let totalWorked = 0;
  let totalBreak = 0;
  let lastClockIn: Date | null = null;
  let lastBreakStart: Date | null = null;

  const sorted = entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const entry of sorted) {
    switch (entry.entryType) {
      case "CLOCK_IN":
        lastClockIn = entry.timestamp;
        break;

      case "BREAK_START":
        if (lastClockIn) {
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          lastBreakStart = entry.timestamp;
          lastClockIn = null;
        }
        break;

      case "BREAK_END":
        if (lastBreakStart) {
          const minutes = (entry.timestamp.getTime() - lastBreakStart.getTime()) / (1000 * 60);
          totalBreak += minutes;
          lastClockIn = entry.timestamp;
          lastBreakStart = null;
        }
        break;

      case "CLOCK_OUT":
        if (lastClockIn) {
          const minutes = (entry.timestamp.getTime() - lastClockIn.getTime()) / (1000 * 60);
          totalWorked += minutes;
          lastClockIn = null;
        }
        if (lastBreakStart) {
          const minutes = (new Date().getTime() - lastBreakStart.getTime()) / (1000 * 60);
          totalBreak += minutes;
          lastBreakStart = null;
        }
        break;
    }
  }

  return {
    worked: totalWorked,
    break: totalBreak,
  };
}

async function main() {
  try {
    // Buscar empleado de hr@demo.com
    const employee = await prisma.employee.findFirst({
      where: {
        email: "hr@demo.com",
      },
      select: {
        id: true,
        orgId: true,
        firstName: true,
        lastName: true,
        userId: true,
      },
    });

    if (!employee) {
      console.log("❌ Empleado hr@demo.com no encontrado");
      return;
    }

    console.log(`✅ Empleado encontrado: ${employee.firstName} ${employee.lastName}`);

    // Limpiar notificaciones descartadas de tipo INCOMPLETE_ENTRY para este usuario
    const deletedNotifications = await prisma.dismissedNotification.deleteMany({
      where: {
        userId: employee.userId,
        type: "INCOMPLETE_ENTRY",
      },
    });

    console.log(`🗑️  Notificaciones descartadas eliminadas: ${deletedNotifications.count}`);

    // Borrar TODOS los fichajes de ayer (10/11) y hoy (11/11)
    const yesterday = new Date("2025-11-10");
    const today = new Date("2025-11-11");
    const yesterdayStart = startOfDay(yesterday);
    const todayEnd = endOfDay(today);

    console.log(
      `\n🗑️  Borrando fichajes desde ${yesterdayStart.toLocaleDateString("es-ES")} hasta ${todayEnd.toLocaleDateString("es-ES")}`,
    );

    const deletedEntries = await prisma.timeEntry.deleteMany({
      where: {
        employeeId: employee.id,
        orgId: employee.orgId,
        timestamp: {
          gte: yesterdayStart,
          lte: todayEnd,
        },
      },
    });

    console.log(`✅ Fichajes eliminados: ${deletedEntries.count}`);

    // Borrar WorkdaySummary de ayer y hoy
    const deletedSummaries = await prisma.workdaySummary.deleteMany({
      where: {
        employeeId: employee.id,
        orgId: employee.orgId,
        date: {
          gte: yesterdayStart,
          lte: todayEnd,
        },
      },
    });

    console.log(`✅ WorkdaySummary eliminados: ${deletedSummaries.count}`);
    console.log(`\n✨ Limpieza completada. Base de datos limpia para ayer y hoy.`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
