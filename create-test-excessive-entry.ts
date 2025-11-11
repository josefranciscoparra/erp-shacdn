import { PrismaClient } from "@prisma/client";
import { startOfDay, subDays } from "date-fns";

const prisma = new PrismaClient();

async function createExcessiveTestEntry() {
  try {
    // Buscar usuario hr@demo.com
    const user = await prisma.user.findUnique({
      where: { email: "hr@demo.com" },
      include: {
        employee: {
          include: {
            employmentContracts: {
              where: { active: true },
              orderBy: { startDate: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      console.error("❌ Usuario hr@demo.com no encontrado");
      return;
    }

    if (!user.employee) {
      console.error("❌ El usuario hr@demo.com no tiene empleado asociado");
      return;
    }

    const employee = user.employee;
    const contract = employee.employmentContracts[0];

    if (!contract) {
      console.error("❌ El empleado no tiene contrato activo");
      return;
    }

    // Fecha de ayer a las 09:00
    const yesterday = subDays(new Date(), 1);
    const clockInDate = new Date(yesterday);
    clockInDate.setHours(9, 0, 0, 0);

    console.log("📅 Creando fichaje de prueba:");
    console.log("   Usuario:", user.email);
    console.log("   Empleado:", employee.firstName, employee.lastName);
    console.log("   Org ID:", employee.orgId);
    console.log("   Fecha/Hora CLOCK_IN:", clockInDate.toLocaleString("es-ES"));
    console.log("   Hace:", Math.round((new Date().getTime() - clockInDate.getTime()) / (1000 * 60 * 60)), "horas");

    // Eliminar fichajes y workday summary existentes para ayer
    const dayStart = startOfDay(yesterday);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    await prisma.timeEntry.deleteMany({
      where: {
        employeeId: employee.id,
        orgId: employee.orgId,
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    await prisma.workdaySummary.deleteMany({
      where: {
        employeeId: employee.id,
        orgId: employee.orgId,
        date: dayStart,
      },
    });

    console.log("🗑️  Limpiados fichajes previos de ayer");

    // Crear CLOCK_IN de ayer
    const clockIn = await prisma.timeEntry.create({
      data: {
        employeeId: employee.id,
        orgId: employee.orgId,
        entryType: "CLOCK_IN",
        timestamp: clockInDate,
        isManual: false,
        isCancelled: false,
      },
    });

    console.log("✅ CLOCK_IN creado exitosamente (ID:", clockIn.id + ")");

    // Crear WorkdaySummary correspondiente
    const workday = await prisma.workdaySummary.create({
      data: {
        employeeId: employee.id,
        orgId: employee.orgId,
        date: dayStart,
        clockIn: clockInDate,
        status: "IN_PROGRESS",
        totalWorkedMinutes: 0,
        totalBreakMinutes: 0,
        excessiveTimeNotified: false,
      },
    });

    console.log("✅ WorkdaySummary creado (ID:", workday.id + ")");

    // Calcular horas transcurridas
    const now = new Date();
    const durationMinutes = Math.floor((now.getTime() - clockInDate.getTime()) / (1000 * 60));
    const durationHours = durationMinutes / 60;

    // Calcular jornada diaria del empleado
    const dailyHours = contract.weeklyHours / contract.workingDaysPerWeek;
    const thresholdHours = dailyHours * 1.5; // 150%
    const percentageOfJourney = (durationHours / dailyHours) * 100;

    console.log("\n📊 RESUMEN DEL FICHAJE:");
    console.log("   Duración actual:", durationHours.toFixed(1), "horas");
    console.log("   Jornada diaria:", dailyHours.toFixed(1), "horas");
    console.log("   Umbral 150%:", thresholdHours.toFixed(1), "horas");
    console.log("   Porcentaje de jornada:", percentageOfJourney.toFixed(0) + "%");
    console.log("   ¿Es excesivo?", durationHours > thresholdHours ? "✅ SÍ" : "❌ NO");

    console.log("\n🎯 AHORA PUEDES:");
    console.log("   1. Iniciar sesión como hr@demo.com");
    console.log("   2. Ver el botón 'Fichar Salida' con borde naranja");
    console.log("   3. Ver el badge 'Fichaje abierto' en la barra superior");
    console.log("   4. Hacer click en 'Fichar Salida' para ver el modal");
    console.log("   5. Probar las opciones 'Cerrar y Cancelar' o 'Ir a Regularizar'");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createExcessiveTestEntry();
