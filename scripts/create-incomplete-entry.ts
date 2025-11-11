import { PrismaClient } from "@prisma/client";
import { startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  try {
    const employee = await prisma.employee.findFirst({
      where: { email: "hr@demo.com" },
      select: { id: true, orgId: true, firstName: true, lastName: true },
    });

    if (!employee) {
      console.log("❌ Empleado no encontrado");
      return;
    }

    console.log(`✅ Empleado: ${employee.firstName} ${employee.lastName}`);

    // Crear fichaje AYER sin salida
    const yesterday = new Date("2025-11-10");
    const clockInTime = new Date(yesterday);
    clockInTime.setHours(9, 0, 0, 0);

    // Crear o actualizar WorkdaySummary
    const workday = await prisma.workdaySummary.upsert({
      where: {
        orgId_employeeId_date: {
          orgId: employee.orgId,
          employeeId: employee.id,
          date: startOfDay(yesterday),
        },
      },
      create: {
        orgId: employee.orgId,
        employeeId: employee.id,
        date: startOfDay(yesterday),
        clockIn: clockInTime,
        clockOut: null,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        status: "IN_PROGRESS",
      },
      update: {
        clockIn: clockInTime,
        clockOut: null,
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        status: "IN_PROGRESS",
      },
    });

    console.log(`✅ WorkdaySummary creado: ${workday.id}`);

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
    console.log(`\n🎯 Fichaje incompleto creado correctamente para pruebas`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
