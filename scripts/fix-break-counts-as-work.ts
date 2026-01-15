import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.timeSlot.updateMany({
    where: {
      slotType: "BREAK",
      countsAsWork: true,
    },
    data: {
      countsAsWork: false,
    },
  });

  console.log(`Updated break slots: ${result.count}`);
}

main()
  .catch((error) => {
    console.error("Failed to update break slots:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
