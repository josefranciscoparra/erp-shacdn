import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Obtener empleado del usuario RRHH
    const user = await prisma.user.findFirst({
      where: { email: "rrhh@timenow.cloud" },
      include: { employees: true },
    });

    if (!user || !user.employees[0]) {
      console.log("❌ Usuario o empleado no encontrado");
      return;
    }

    const employeeId = user.employees[0].id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`🗑️ Borrando fichajes del empleado ${employeeId} del día ${today.toISOString()}`);

    // Borrar TimeEntry
    const deletedEntries = await prisma.timeEntry.deleteMany({
      where: {
        employeeId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    console.log(`✅ TimeEntries borrados: ${deletedEntries.count}`);

    // Borrar WorkdaySummary
    const deletedSummaries = await prisma.workdaySummary.deleteMany({
      where: {
        employeeId,
        date: today,
      },
    });

    console.log(`✅ WorkdaySummaries borrados: ${deletedSummaries.count}`);

    // Borrar Alerts
    const deletedAlerts = await prisma.alert.deleteMany({
      where: {
        employeeId,
        date: today,
      },
    });

    console.log(`✅ Alerts borradas: ${deletedAlerts.count}`);

    console.log("✅ Todos los registros del día borrados correctamente");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
