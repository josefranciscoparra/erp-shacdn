import { prisma } from "@/lib/prisma";
import {
  processOnCallAvailabilitySettlement,
  processOpenPunchRollover,
  processOpenPunchSafetyClose,
} from "@/server/jobs/time-tracking-processor";

async function run() {
  const settings = await prisma.globalSettings.findUnique({
    where: { id: "global" },
    select: { timeTrackingSweepLookbackDays: true },
  });

  const lookbackDays =
    typeof settings?.timeTrackingSweepLookbackDays === "number" ? settings.timeTrackingSweepLookbackDays : 1;

  const argOrgId = process.argv[2];
  const envOrgId = process.env.ORG_ID;
  const targetOrgId = argOrgId && argOrgId.trim().length > 0 ? argOrgId.trim() : envOrgId?.trim();

  const organizations = await prisma.organization.findMany({
    where: targetOrgId ? { id: targetOrgId } : { active: true },
    select: { id: true },
  });

  if (organizations.length === 0) {
    console.log("[SweepNow] No hay organizaciones para procesar.");
    return;
  }

  for (const organization of organizations) {
    console.log(`[SweepNow] Procesando org ${organization.id} (lookbackDays=${lookbackDays})...`);
    await processOpenPunchRollover({ orgId: organization.id, lookbackDays });
    await processOpenPunchSafetyClose({ orgId: organization.id });
    await processOnCallAvailabilitySettlement({ orgId: organization.id, lookbackDays });
  }

  console.log("[SweepNow] Barrido completado.");
}

run()
  .catch((error) => {
    console.error("[SweepNow] Error ejecutando el barrido:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
