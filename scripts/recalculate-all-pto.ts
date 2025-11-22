import { PrismaClient } from "@prisma/client";

import { recalculatePtoBalance } from "@/server/actions/pto-balance";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando recálculo masivo de balances de PTO...\n");

  // Obtener todos los empleados con contrato activo
  const employees = await prisma.employee.findMany({
    where: {
      employmentContracts: {
        some: { active: true },
      },
    },
    select: { id: true, orgId: true },
  });

  console.log(`📊 Se encontraron ${employees.length} empleados activos.`);

  const currentYear = new Date().getFullYear();
  let processed = 0;

  for (const emp of employees) {
    try {
      await recalculatePtoBalance(emp.id, emp.orgId, currentYear);
      processed++;
      if (processed % 10 === 0) process.stdout.write(".");
    } catch (error) {
      console.error(`❌ Error recalculando empleado ${emp.id}:`, error);
    }
  }

  console.log(`\n\n✅ Recálculo completado exitosamente para ${processed} empleados.`);
}

main()
  .catch((e) => {
    console.error("❌ Error fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
