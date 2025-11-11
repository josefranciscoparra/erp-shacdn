import { PrismaClient } from "@prisma/client";
import { subDays, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

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
      },
    });

    if (!employee) {
      console.log("❌ Empleado hr@demo.com no encontrado");
      return;
    }

    console.log(`✅ Empleado encontrado: ${employee.firstName} ${employee.lastName} (${employee.id})`);

    // Borrar todos los fichajes existentes
    const deleted = await prisma.timeEntry.deleteMany({
      where: {
        employeeId: employee.id,
      },
    });

    console.log(`🗑️  Borrados ${deleted.count} fichajes existentes`);

    // Borrar WorkdaySummaries existentes
    const deletedSummaries = await prisma.workdaySummary.deleteMany({
      where: {
        employeeId: employee.id,
      },
    });

    console.log(`🗑️  Borrados ${deletedSummaries.count} resúmenes de día`);

    // Crear fichaje de AYER a las 09:00
    const yesterday = subDays(new Date(), 1);
    const clockInTime = setMinutes(setHours(yesterday, 9), 0);

    // Crear WorkdaySummary
    const yesterday = subDays(new Date(), 1);
    const dayStart = setHours(setMinutes(yesterday, 0), 0);
    dayStart.setSeconds(0, 0);

    const workday = await prisma.workdaySummary.create({
      data: {
        employeeId: employee.id,
        orgId: employee.orgId,
        date: dayStart,
        clockIn: clockInTime,
        status: "IN_PROGRESS",
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
      },
    });

    console.log(`✅ WorkdaySummary creado (ID: ${workday.id})`);

    // Crear TimeEntry
    const newEntry = await prisma.timeEntry.create({
      data: {
        orgId: employee.orgId,
        employeeId: employee.id,
        entryType: "CLOCK_IN",
        timestamp: clockInTime,
        isManual: false,
      },
    });

    console.log(`✅ Fichaje creado: CLOCK_IN ${clockInTime.toLocaleString("es-ES")}`);
    console.log(`   ID: ${newEntry.id}`);
    console.log(`   Hace ${Math.round((Date.now() - clockInTime.getTime()) / (1000 * 60 * 60))} horas`);

    // Calcular horas transcurridas para verificar que es > 150%
    const hoursElapsed = (Date.now() - clockInTime.getTime()) / (1000 * 60 * 60);
    const percentageOfJourney = (hoursElapsed / 8) * 100;

    console.log(`\n📊 Estadísticas:`);
    console.log(`   Horas transcurridas: ${hoursElapsed.toFixed(1)}h`);
    console.log(`   Porcentaje de jornada (8h): ${percentageOfJourney.toFixed(0)}%`);
    console.log(`   ¿Es excesivo? ${percentageOfJourney > 150 ? "✅ SÍ (>150%)" : "❌ NO"}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
