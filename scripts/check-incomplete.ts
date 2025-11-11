import { PrismaClient } from "@prisma/client";

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

    // Buscar último CLOCK_IN sin CLOCK_OUT
    const openClockIn = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employee.id,
        orgId: employee.orgId,
        entryType: "CLOCK_IN",
        isCancelled: false,
        isManual: false,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    if (!openClockIn) {
      console.log("❌ No se encontró CLOCK_IN");
      return;
    }

    console.log("\n📋 CLOCK_IN encontrado:");
    console.log(`   ID: ${openClockIn.id}`);
    console.log(`   Timestamp: ${openClockIn.timestamp}`);
    console.log(`   workdayId: ${openClockIn.workdayId}`);
    console.log(`   isCancelled: ${openClockIn.isCancelled}`);
    console.log(`   isManual: ${openClockIn.isManual}`);

    // Buscar si tiene CLOCK_OUT posterior
    const hasClockOut = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employee.id,
        orgId: employee.orgId,
        entryType: "CLOCK_OUT",
        isCancelled: false,
        timestamp: {
          gt: openClockIn.timestamp,
        },
      },
    });

    console.log(`\n❓ Tiene CLOCK_OUT posterior: ${hasClockOut ? "SÍ" : "NO"}`);

    if (hasClockOut) {
      console.log(`   Timestamp CLOCK_OUT: ${hasClockOut.timestamp}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
