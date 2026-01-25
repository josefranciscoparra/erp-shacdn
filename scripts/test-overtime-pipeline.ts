import { addDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import { formatUtcDateKey, getLocalDayStartUtc, resolveTimeZone } from "@/lib/timezone-utils";
import { updateWorkdaySummary } from "@/server/actions/time-tracking";
import { processWorkdayOvertimeJob } from "@/server/jobs/overtime-processor";

type ScriptFlags = {
  orgId: string | null;
  employeeId: string | null;
  email: string | null;
  force: boolean;
  cleanup: boolean;
};

function getArgValue(args: string[], key: string): string | null {
  const direct = args.find((arg) => arg.startsWith(`${key}=`));
  if (direct) {
    const value = direct.slice(key.length + 1).trim();
    return value.length > 0 ? value : null;
  }

  const index = args.indexOf(key);
  if (index === -1) return null;
  const value = args[index + 1];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function parseFlags(): ScriptFlags {
  const args = process.argv.slice(2);
  return {
    orgId: getArgValue(args, "--orgId") ?? process.env.ORG_ID ?? null,
    employeeId: getArgValue(args, "--employeeId"),
    email: getArgValue(args, "--email"),
    force: args.includes("--force"),
    cleanup: args.includes("--cleanup"),
  };
}

function buildTimestamp(dayStart: Date, totalMinutes: number) {
  return new Date(dayStart.getTime() + totalMinutes * 60 * 1000);
}

async function ensureNoEntries(employeeId: string, orgId: string, dayStart: Date, label: string, force: boolean) {
  const dayEnd = addDays(dayStart, 1);
  const existing = await prisma.timeEntry.findMany({
    where: {
      employeeId,
      orgId,
      timestamp: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    select: { id: true },
  });

  if (existing.length === 0) {
    return;
  }

  if (!force) {
    throw new Error(
      `${label}: ya existen ${existing.length} fichajes en ese día. Usa --force para eliminarlos y continuar.`,
    );
  }

  await prisma.timeEntry.deleteMany({
    where: {
      id: { in: existing.map((entry) => entry.id) },
    },
  });
}

async function cleanupForDay(employeeId: string, orgId: string, dayStart: Date) {
  const candidates = await prisma.overtimeCandidate.findMany({
    where: {
      orgId,
      employeeId,
      date: dayStart,
    },
    select: { id: true, workdaySummaryId: true },
  });
  const candidateIds = candidates.map((candidate) => candidate.id);
  const workdayIds = candidates
    .map((candidate) => candidate.workdaySummaryId)
    .filter((value): value is string => typeof value === "string");

  await prisma.timeBankMovement.deleteMany({
    where: {
      orgId,
      employeeId,
      workdayId: { in: workdayIds },
    },
  });

  if (candidateIds.length > 0) {
    await prisma.overtimeCandidate.deleteMany({
      where: { id: { in: candidateIds } },
    });
  }

  await prisma.workdaySummary.deleteMany({
    where: {
      orgId,
      employeeId,
      date: dayStart,
    },
  });

  await prisma.overworkAuthorization.deleteMany({
    where: {
      orgId,
      employeeId,
      date: dayStart,
    },
  });

  await prisma.alert.deleteMany({
    where: {
      orgId,
      employeeId,
      date: dayStart,
      type: {
        in: ["MISSING_CLOCK_OUT", "AUTO_CLOSED_SAFETY", "OVERTIME_PENDING_APPROVAL"],
      },
    },
  });
}

async function main() {
  const flags = parseFlags();

  if (!flags.orgId) {
    throw new Error("Debes indicar --orgId o definir ORG_ID en el entorno.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: flags.orgId },
    select: { id: true, timezone: true },
  });

  if (!organization) {
    throw new Error(`Organización no encontrada: ${flags.orgId}`);
  }

  const timeZone = resolveTimeZone(organization.timezone);

  const employee = await prisma.employee.findFirst({
    where: {
      orgId: organization.id,
      ...(flags.employeeId ? { id: flags.employeeId } : {}),
      ...(flags.email ? { email: flags.email } : {}),
    },
    select: { id: true, orgId: true, firstName: true, lastName: true },
  });

  if (!employee) {
    throw new Error("Empleado no encontrado. Usa --employeeId o --email.");
  }

  console.log(
    `✅ Org ${organization.id} (TZ=${timeZone}) · Empleado ${employee.firstName} ${employee.lastName} (${employee.id})`,
  );

  const today = new Date();
  const normalDay = addDays(today, -10);
  const crossStartDay = addDays(today, -8);
  const crossEndDay = addDays(today, -7);

  const normalStart = getLocalDayStartUtc(normalDay, timeZone);
  const crossStart = getLocalDayStartUtc(crossStartDay, timeZone);
  const crossEnd = getLocalDayStartUtc(crossEndDay, timeZone);

  await ensureNoEntries(employee.id, organization.id, normalStart, "Día normal", flags.force);
  await ensureNoEntries(employee.id, organization.id, crossStart, "Cruce medianoche (día inicio)", flags.force);
  await ensureNoEntries(employee.id, organization.id, crossEnd, "Cruce medianoche (día fin)", flags.force);

  const createdEntryIds: string[] = [];

  const normalEntries = [
    { entryType: "CLOCK_IN", minutes: 9 * 60 },
    { entryType: "BREAK_START", minutes: 13 * 60 },
    { entryType: "BREAK_END", minutes: 13 * 60 + 30 },
    { entryType: "CLOCK_OUT", minutes: 17 * 60 + 30 },
  ] as const;

  for (const entry of normalEntries) {
    const created = await prisma.timeEntry.create({
      data: {
        orgId: organization.id,
        employeeId: employee.id,
        entryType: entry.entryType,
        timestamp: buildTimestamp(normalStart, entry.minutes),
        isManual: false,
      },
    });
    createdEntryIds.push(created.id);
  }

  const crossEntries = [
    { entryType: "CLOCK_IN", minutes: 22 * 60 },
    { entryType: "CLOCK_OUT", minutes: 26 * 60 },
  ] as const;

  for (const entry of crossEntries) {
    const created = await prisma.timeEntry.create({
      data: {
        orgId: organization.id,
        employeeId: employee.id,
        entryType: entry.entryType,
        timestamp: buildTimestamp(crossStart, entry.minutes),
        isManual: false,
      },
    });
    createdEntryIds.push(created.id);
  }

  const summaries: Array<{ label: string; dayStart: Date }> = [
    { label: "Normal", dayStart: normalStart },
    { label: "Cruce inicio", dayStart: crossStart },
    { label: "Cruce fin", dayStart: crossEnd },
  ];

  for (const summaryTarget of summaries) {
    const summary = await updateWorkdaySummary(employee.id, organization.id, summaryTarget.dayStart);
    if (!summary) {
      console.log(`⚠️  ${summaryTarget.label}: no se creó WorkdaySummary.`);
      continue;
    }

    const dateKey = formatUtcDateKey(summaryTarget.dayStart);
    await processWorkdayOvertimeJob({
      orgId: organization.id,
      employeeId: employee.id,
      date: dateKey,
    });
    await processWorkdayOvertimeJob({
      orgId: organization.id,
      employeeId: employee.id,
      date: dateKey,
    });

    const movementCount = await prisma.timeBankMovement.count({
      where: {
        workdayId: summary.id,
        origin: "AUTO_DAILY",
      },
    });

    const candidate = await prisma.overtimeCandidate.findFirst({
      where: {
        orgId: organization.id,
        employeeId: employee.id,
        date: summaryTarget.dayStart,
      },
      select: {
        candidateMinutesFinal: true,
        status: true,
      },
    });

    console.log(
      `✅ ${summaryTarget.label}: resumen OK · AUTO_DAILY=${movementCount} · candidate=${candidate?.status ?? "N/A"}`,
    );

    if (movementCount > 1) {
      console.log(`❌ ${summaryTarget.label}: hay movimientos AUTO_DAILY duplicados.`);
      process.exitCode = 1;
    }
  }

  if (flags.cleanup) {
    await prisma.timeEntry.deleteMany({
      where: { id: { in: createdEntryIds } },
    });

    await cleanupForDay(employee.id, organization.id, normalStart);
    await cleanupForDay(employee.id, organization.id, crossStart);
    await cleanupForDay(employee.id, organization.id, crossEnd);

    console.log("🧹 Cleanup completado.");
  } else {
    console.log("ℹ️  No se ejecutó cleanup. Usa --cleanup si quieres borrar los datos de prueba.");
  }
}

main()
  .catch((error) => {
    console.error("❌ Error ejecutando el test:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
