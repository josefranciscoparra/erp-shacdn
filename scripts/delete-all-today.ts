import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Obtener el empleado de hr@demo.com
  const employee = await prisma.employee.findFirst({
    where: {
      user: {
        email: "hr@demo.com",
      },
    },
  });

  if (!employee) {
    console.log("❌ No se encontró empleado para hr@demo.com");
    return;
  }

  console.log(`📋 Empleado encontrado: ${employee.id}`);

  // Obtener fecha de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log(`📅 Borrando datos de hoy: ${today.toISOString()}`);

  // Borrar time entries de hoy
  const deletedEntries = await prisma.timeEntry.deleteMany({
    where: {
      employeeId: employee.id,
      timestamp: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  console.log(`🗑️  Eliminados ${deletedEntries.count} fichajes de hoy`);

  // Borrar workday summary de hoy
  const deletedSummaries = await prisma.workdaySummary.deleteMany({
    where: {
      employeeId: employee.id,
      date: today,
    },
  });

  console.log(`🗑️  Eliminados ${deletedSummaries.count} resúmenes de hoy`);

  // Borrar alertas de hoy
  const deletedAlerts = await prisma.alert.deleteMany({
    where: {
      employeeId: employee.id,
      date: today,
    },
  });

  console.log(`🗑️  Eliminadas ${deletedAlerts.count} alertas de hoy`);

  console.log("✅ ¡Todo limpio! Listo para probar desde cero.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
