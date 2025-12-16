"use server";

import { FileCategory } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<FileCategory, string> = {
  PAYROLL: "Nóminas",
  CONTRACT: "Contratos",
  TIME_TRACKING: "Control horario",
  PTO: "Vacaciones / bajas",
  WHISTLEBLOWING: "Denuncias",
  SIGNATURE: "Firmas electrónicas",
  EXPENSE: "Gastos",
  OTHER: "Otros",
};

export async function getStorageUsageSummary() {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      throw new Error("No autorizado");
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: {
        storageUsedBytes: true,
        storageLimitBytes: true,
      },
    });

    if (!org) {
      throw new Error("Organización no encontrada");
    }

    const now = new Date();

    const [byCategory, protectedByCategory, legalHoldByCategory, protectedTotal, legalHoldTotal, pendingDeletion] =
      await Promise.all([
        prisma.storedFile.groupBy({
          by: ["category"],
          where: { orgId: session.user.orgId },
          _sum: { sizeBytes: true },
          _count: { _all: true },
        }),
        prisma.storedFile.groupBy({
          by: ["category"],
          where: {
            orgId: session.user.orgId,
            OR: [{ legalHold: true }, { retainUntil: { gt: now } }],
          },
          _count: { _all: true },
        }),
        prisma.storedFile.groupBy({
          by: ["category"],
          where: { orgId: session.user.orgId, legalHold: true },
          _count: { _all: true },
        }),
        prisma.storedFile.count({
          where: { orgId: session.user.orgId, OR: [{ legalHold: true }, { retainUntil: { gt: now } }] },
        }),
        prisma.storedFile.count({
          where: { orgId: session.user.orgId, legalHold: true },
        }),
        prisma.storedFile.count({
          where: { orgId: session.user.orgId, deletedAt: { not: null } },
        }),
      ]);

    // eslint-disable-next-line no-underscore-dangle
    const protectedMap = new Map(protectedByCategory.map((item) => [item.category, item._count._all]));
    // eslint-disable-next-line no-underscore-dangle
    const legalHoldMap = new Map(legalHoldByCategory.map((item) => [item.category, item._count._all]));

    const categories = byCategory
      .map((item) => ({
        category: item.category,
        label: CATEGORY_LABELS[item.category],
        // eslint-disable-next-line no-underscore-dangle
        bytes: Number(item._sum.sizeBytes ?? 0),
        // eslint-disable-next-line no-underscore-dangle
        documents: item._count._all,
        protectedDocuments: protectedMap.get(item.category) ?? 0,
        legalHoldDocuments: legalHoldMap.get(item.category) ?? 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    return {
      success: true,
      summary: {
        usedBytes: Number(org.storageUsedBytes),
        limitBytes: Number(org.storageLimitBytes),
        usagePercentage:
          org.storageLimitBytes > 0 ? (Number(org.storageUsedBytes) / Number(org.storageLimitBytes)) * 100 : 0,
        categories,
        protectedDocuments: protectedTotal,
        legalHoldDocuments: legalHoldTotal,
        pendingDeletion,
        lastUpdated: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error obteniendo métricas de storage:", error);
    return { success: false, error: "No se pudieron cargar las métricas de almacenamiento" };
  }
}
