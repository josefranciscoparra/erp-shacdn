import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Actualizando tipos de ausencia para 'Baja médica'...\n");

  // Update all SICK_LEAVE types
  const result = await prisma.absenceType.updateMany({
    where: {
      code: "SICK_LEAVE",
    },
    data: {
      countsCalendarDays: true,
    },
  });

  console.log(`✅ Actualizados ${result.count} tipos de ausencia.`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
