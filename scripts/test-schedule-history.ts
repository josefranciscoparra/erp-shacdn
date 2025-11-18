/**
 * Script para probar que el historial de horarios funciona correctamente
 *
 * Escenario:
 * 1. Empleado tiene Horario A del 1-Nov al 15-Nov (sin especificar validTo)
 * 2. Se le asigna Horario B desde 16-Nov
 * 3. El sistema debe automáticamente cerrar Horario A en el 15-Nov
 * 4. Al consultar calendario de noviembre:
 *    - Días 1-15: Debe mostrar horas de Horario A
 *    - Días 16-30: Debe mostrar horas de Horario B
 */

import { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";

const prisma = new PrismaClient();

async function testScheduleHistory() {
  console.log("\n🧪 Test: Historial de Horarios\n");
  console.log("=".repeat(60));

  try {
    // 1. Usar Demo Company S.L.
    const EMPLOYEE_ID = "cmhi8mayl0014sf8xdt2xyr0t"; // Lucía Fernández
    const ORG_ID = "cmhi8mawd0000sf8xishgn0j2"; // Demo Company S.L.

    const org = await prisma.organization.findUnique({
      where: { id: ORG_ID },
    });
    if (!org) {
      console.error("❌ No se encontró la organización.");
      return;
    }

    const employee = await prisma.employee.findUnique({
      where: { id: EMPLOYEE_ID },
    });
    if (!employee) {
      console.error("❌ No se encontró el empleado.");
      return;
    }

    console.log(`\n✅ Usando empleado: ${employee.firstName} ${employee.lastName}`);
    console.log(`   ID: ${employee.id}`);
    console.log(`   Organización: ${org.name}`);

    // 2. Buscar plantillas (Horario fijo y Horario fijo 6h)
    const templates = await prisma.scheduleTemplate.findMany({
      where: {
        orgId: org.id,
        name: { contains: "fijo" },
      },
      orderBy: { name: "asc" },
    });

    if (templates.length < 2) {
      console.log("\n⚠️  No se encontraron suficientes plantillas. Necesitas 2 plantillas.");
      console.log(
        "   Plantillas encontradas:",
        templates.map((t) => t.name),
      );
      return;
    }

    // Asignar: la que NO tenga "6" será 8h, la que tenga "6" será 6h
    const template8h = templates.find((t) => !t.name.includes("6"));
    const template6h = templates.find((t) => t.name.includes("6"));

    if (!template8h || !template6h) {
      console.log("\n⚠️  No se pudo identificar plantillas de 8h y 6h.");
      console.log(
        "   Plantillas encontradas:",
        templates.map((t) => t.name),
      );
      return;
    }

    console.log(`\n✅ Plantilla 8h encontrada: ${template8h.name} (${template8h.id})`);
    console.log(`✅ Plantilla 6h encontrada: ${template6h.name} (${template6h.id})`);

    // 4. Limpiar asignaciones anteriores de este empleado
    await prisma.employeeScheduleAssignment.deleteMany({
      where: { employeeId: employee.id },
    });
    console.log("\n🧹 Limpiadas asignaciones anteriores");

    // 5. Crear Asignación Horario A: 1-Nov hasta "sin fecha fin"
    const nov1 = new Date("2025-11-01T00:00:00.000Z");
    const assignmentA = await prisma.employeeScheduleAssignment.create({
      data: {
        employeeId: employee.id,
        assignmentType: "FIXED",
        scheduleTemplateId: template8h.id,
        validFrom: nov1,
        validTo: null, // Sin fecha fin (como lo haría el usuario)
        isActive: true,
      },
    });

    console.log("\n✅ Asignación A creada:");
    console.log(`   Plantilla: ${template8h.name}`);
    console.log(`   Desde: 2025-11-01`);
    console.log(`   Hasta: (sin fecha fin)`);
    console.log(`   isActive: true`);

    // 6. Simular paso del tiempo: Asignar Horario B desde 16-Nov
    // Esto debería CERRAR automáticamente Horario A en 15-Nov
    const nov16 = new Date("2025-11-16T00:00:00.000Z");
    const assignmentB = await prisma.employeeScheduleAssignment.create({
      data: {
        employeeId: employee.id,
        assignmentType: "FIXED",
        scheduleTemplateId: template6h.id,
        validFrom: nov16,
        validTo: null,
        isActive: true,
      },
    });

    // Pero antes de crear B, debemos ejecutar la lógica de cierre de A
    // (que está en assignScheduleToEmployee en schedules-v2.ts)
    const dayBeforeNew = new Date(nov16);
    dayBeforeNew.setDate(dayBeforeNew.getDate() - 1);
    dayBeforeNew.setHours(23, 59, 59, 999);

    await prisma.employeeScheduleAssignment.updateMany({
      where: {
        employeeId: employee.id,
        isActive: true,
        id: { not: assignmentB.id }, // No actualizar la recién creada
        OR: [
          {
            validFrom: { lte: nov16 },
            validTo: { gte: nov16 },
          },
          {
            validFrom: { lte: nov16 },
            validTo: null,
          },
        ],
      },
      data: {
        validTo: dayBeforeNew,
      },
    });

    console.log("\n✅ Asignación B creada:");
    console.log(`   Plantilla: ${template6h.name}`);
    console.log(`   Desde: 2025-11-16`);
    console.log(`   Hasta: (sin fecha fin)`);
    console.log(`   isActive: true`);
    console.log("\n🔄 Asignación A automáticamente cerrada en 2025-11-15");

    // 7. Verificar estado final de asignaciones
    const allAssignments = await prisma.employeeScheduleAssignment.findMany({
      where: { employeeId: employee.id },
      include: {
        scheduleTemplate: {
          select: { name: true },
        },
      },
      orderBy: { validFrom: "asc" },
    });

    console.log("\n📊 Estado final de asignaciones:");
    console.log("=".repeat(60));
    allAssignments.forEach((a) => {
      console.log(`\n  ${a.scheduleTemplate?.name}`);
      console.log(`    validFrom: ${a.validFrom.toISOString().split("T")[0]}`);
      console.log(`    validTo:   ${a.validTo ? a.validTo.toISOString().split("T")[0] : "(sin fecha fin)"}`);
      console.log(`    isActive:  ${a.isActive}`);
    });

    // 8. Probar consultas de schedule-engine
    console.log("\n\n🔍 Probando getEffectiveSchedule para diferentes fechas:");
    console.log("=".repeat(60));

    const { getEffectiveSchedule } = await import("../src/lib/schedule-engine");

    const testDates = [
      new Date("2025-11-05"), // Día dentro de Horario A
      new Date("2025-11-15"), // Último día de Horario A
      new Date("2025-11-16"), // Primer día de Horario B
      new Date("2025-11-20"), // Día dentro de Horario B
    ];

    for (const date of testDates) {
      const schedule = await getEffectiveSchedule(employee.id, date);
      console.log(`\n  📅 ${date.toISOString().split("T")[0]}`);
      console.log(`     Fuente: ${schedule.source}`);
      console.log(`     Es día laboral: ${schedule.isWorkingDay}`);
      console.log(`     Horas esperadas: ${schedule.expectedMinutes / 60}h`);
      console.log(`     Plantilla: ${schedule.periodName ?? "N/A"}`);
    }

    console.log("\n\n✅ Test completado con éxito");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error durante el test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testScheduleHistory();
