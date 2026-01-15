import { prisma } from "@/lib/prisma";

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

export async function resolvePaidBreakSlotIdsFromEntries(
  entries: Array<{ automaticBreakSlotId?: string | null }>,
): Promise<Set<string>> {
  const slotIds = Array.from(new Set(entries.map((entry) => entry.automaticBreakSlotId).filter(isNonEmptyString)));

  if (slotIds.length === 0) {
    return new Set<string>();
  }

  const slots = await prisma.timeSlot.findMany({
    where: {
      id: { in: slotIds },
    },
    select: {
      id: true,
      slotType: true,
      countsAsWork: true,
    },
  });

  const paidIds = new Set<string>();
  for (const slot of slots) {
    if (slot.slotType === "BREAK" && slot.countsAsWork === true) {
      paidIds.add(slot.id);
    }
  }

  return paidIds;
}
