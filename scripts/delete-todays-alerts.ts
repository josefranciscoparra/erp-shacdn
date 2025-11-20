import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Obtener el empleado de hr@demo.com
  const employee = await prisma.employee.findFirst({
    where: {
      user: {
        email: "hr@demo.com"
      }
    }
  });

  if (!employee) {
    console.log("❌ No se encontró empleado para hr@demo.com");
    return;
  }

  // Eliminar alertas de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.alert.deleteMany({
    where: {
      employeeId: employee.id,
      date: today
    }
  });

  console.log(`✅ Eliminadas ${result.count} alertas de hoy`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
