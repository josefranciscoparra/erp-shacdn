import { PrismaClient } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  try {
    const employee = await prisma.employee.findFirst({
      where: { email: "hr@demo.com" },
      select: { id: true, orgId: true, firstName: true, lastName: true, userId: true },
    });

    if (!employee) {
      console.log("❌ Empleado no encontrado");
      return;
    }

    console.log(`✅ Empleado: ${employee.firstName} ${employee.lastName}`);

    // 1. Limpiar notificaciones descartadas
    const deletedNotifications = await prisma.dismissedNotification.deleteMany({
      where: {
        userId: employee.userId,
        type: "INCOMPLETE_ENTRY",
      },
    });
    console.log(`🗑️  Notificaciones descartadas eliminadas: ${deletedNotifications.count}`);

    // 2. Borrar TODOS los fichajes de los últimos 3 días
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const start = startOfDay(threeDaysAgo);
    const end = endOfDay(new Date());

    console.log(
      `\n🗑️  Borrando fichajes desde ${start.toLocaleDateString("es-ES")} hasta ${end.toLocaleDateString("es-ES")}`,
    );

    const deletedEntries = await prisma.timeEntry.deleteMany({
      where: {
        employeeId: employee.id,
        orgId: employee.orgId,
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });
    console.log(`✅ Fichajes eliminados: ${deletedEntries.count}`);

    // 3. Borrar WorkdaySummary de los últimos 3 días
    const deletedSummaries = await prisma.workdaySummary.deleteMany({
      where: {
        employeeId: employee.id,
        orgId: employee.orgId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });
    console.log(`✅ WorkdaySummary eliminados: ${deletedSummaries.count}`);

    // 4. Crear fichaje incompleto de AYER
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const clockInTime = new Date(yesterday);
    clockInTime.setHours(9, 0, 0, 0);

    // Crear WorkdaySummary
    const workday = await prisma.workdaySummary.create({
      data: {
        orgId: employee.orgId,
        employeeId: employee.id,
        date: startOfDay(yesterday),
        clockIn: clockInTime,
        clockOut: null,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        status: "IN_PROGRESS",
      },
    });
    console.log(`\n✅ WorkdaySummary creado: ${workday.id}`);

    // Crear CLOCK_IN sin CLOCK_OUT
    const clockInEntry = await prisma.timeEntry.create({
      data: {
        orgId: employee.orgId,
        employeeId: employee.id,
        workdayId: workday.id,
        entryType: "CLOCK_IN",
        timestamp: clockInTime,
        isCancelled: false,
        isManual: false,
      },
    });

    console.log(`✅ CLOCK_IN creado:`);
    console.log(`   ID: ${clockInEntry.id}`);
    console.log(`   Timestamp: ${clockInEntry.timestamp}`);
    console.log(`   WorkdayId: ${clockInEntry.workdayId}`);
    console.log(`\n🎯 Fichaje incompleto de AYER creado correctamente`);
    console.log(`\n💡 Ahora haz hard refresh (Ctrl+Shift+R) en el navegador`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
