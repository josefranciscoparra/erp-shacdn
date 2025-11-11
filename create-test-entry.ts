import { PrismaClient } from "@prisma/client";
import { startOfDay, subDays } from "date-fns";

const prisma = new PrismaClient();

async function createTestIncompleteEntry() {
  try {
    // 1. Buscar el usuario y empleado
    const user = await prisma.user.findUnique({
      where: { email: "deejaymacro@hotmail.es" },
      include: {
        employee: true,
      },
    });

    if (!user || !user.employee) {
      throw new Error("Usuario o empleado no encontrado");
    }

    const employee = user.employee;
    console.log("✅ Usuario encontrado:", user.email);
    console.log("✅ Empleado ID:", employee.id);

    // 2. Calcular la fecha de ayer a las 09:00
    const yesterday = subDays(startOfDay(new Date()), 1);
    yesterday.setHours(9, 0, 0, 0);

    console.log("📅 Fecha del fichaje:", yesterday.toLocaleString("es-ES"));

    // 3. Verificar si ya existe un WorkdaySummary para ese día
    let workday = await prisma.workdaySummary.findFirst({
      where: {
        employeeId: employee.id,
        orgId: user.orgId,
        date: startOfDay(yesterday),
      },
    });

    // 4. Si existe, eliminarlo para crear uno nuevo de prueba
    if (workday) {
      console.log("⚠️  Ya existe un WorkdaySummary, eliminando...");
      await prisma.timeEntry.deleteMany({
        where: { workdayId: workday.id },
      });
      await prisma.workdaySummary.delete({
        where: { id: workday.id },
      });
    }

    // 5. Crear WorkdaySummary con status IN_PROGRESS
    workday = await prisma.workdaySummary.create({
      data: {
        employeeId: employee.id,
        orgId: user.orgId,
        date: startOfDay(yesterday),
        status: "IN_PROGRESS",
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
      },
    });

    console.log("✅ WorkdaySummary creado:", workday.id);

    // 6. Crear TimeEntry de CLOCK_IN (sin CLOCK_OUT)
    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId: employee.id,
        orgId: user.orgId,
        workdayId: workday.id,
        entryType: "CLOCK_IN",
        timestamp: yesterday,
        isManual: false,
      },
    });

    console.log("✅ TimeEntry creado:", timeEntry.id);
    console.log("🎉 Fichaje incompleto de prueba creado exitosamente!");
    console.log("");
    console.log("📊 Resumen:");
    console.log("   - Usuario:", user.email);
    console.log("   - Fecha:", yesterday.toLocaleString("es-ES"));
    console.log("   - Tipo:", "CLOCK_IN (sin CLOCK_OUT)");
    console.log("   - WorkdayId:", workday.id);
    console.log("   - TimeEntryId:", timeEntry.id);
    console.log("");
    console.log("🔍 Ahora puedes iniciar sesión y ver:");
    console.log('   1. Badge "Fichaje abierto" en la barra superior');
    console.log("   2. Alert naranja en /dashboard/me/clock");
    console.log("   3. Crear solicitud manual en /dashboard/me/clock/requests");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestIncompleteEntry();
