import { prisma } from "../src/lib/prisma";

async function checkAlerts() {
  console.log("🔍 Inspecting Alerts...");

  const allAlerts = await prisma.alert.findMany({
    select: { id: true, status: true, type: true, date: true }
  });

  console.log(`Total alerts found: ${allAlerts.length}`);
  
  const statusCounts = allAlerts.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("📊 Breakdown by Status:", statusCounts);

  const openAlerts = allAlerts.filter(a => a.status === "OPEN");
  if (openAlerts.length > 0) {
      console.log("⚠️ WARNING: Found alerts with status 'OPEN'. The system expects 'ACTIVE'.");
      console.log("You should migrate these alerts.");
  }
}

checkAlerts()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
