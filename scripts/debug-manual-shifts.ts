import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking ManualShiftAssignments...");

  // 1. Count total assignments
  const count = await prisma.manualShiftAssignment.count();
  console.log(`📊 Total assignments in DB: ${count}`);

  // 2. List last 5 assignments
  const assignments = await prisma.manualShiftAssignment.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      scheduleTemplate: { select: { name: true } },
    },
  });

  if (assignments.length > 0) {
    console.log("📋 Last assignments:");
    assignments.forEach((a) => {
      console.log(
        `- [${a.date.toISOString().split("T")[0]}] ${a.employee.firstName} (${a.startTimeMinutes}-${a.endTimeMinutes}min) - Template: ${a.scheduleTemplate.name}`,
      );
    });
  } else {
    console.log("❌ No assignments found.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
