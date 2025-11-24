import { PrismaClient } from "@prisma/client";

import { getCostCentersForFilters } from "../src/server/actions/schedules-v2";

const prisma = new PrismaClient();

// Mock auth function since server actions use it
// We'll simulate the context of the user hr@demo.com
async function main() {
  try {
    console.log("🔍 Debugging getCostCentersForFilters...");

    const user = await prisma.user.findUnique({
      where: { email: "hr@demo.com" },
    });

    if (!user) {
      console.error("❌ User hr@demo.com not found");
      return;
    }

    console.log(`👤 User context: ${user.id} (Org: ${user.orgId})`);

    // Simulate the query logic inside the action
    const costCenters = await prisma.costCenter.findMany({
      where: { orgId: user.orgId },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            employmentContracts: {
              where: { active: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    console.log("📋 Cost Centers found in DB:", costCenters);

    if (costCenters.length === 0) {
      console.warn("⚠️ No cost centers found for this org!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
