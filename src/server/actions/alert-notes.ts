"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildScopeFilter } from "@/services/permissions/scope-helpers";

async function assertAlertAccess(alertId: string, userId: string, orgId: string) {
  const scopeFilter = await buildScopeFilter(userId, "VIEW_ALERTS");
  const where: Record<string, unknown> = { id: alertId, orgId };

  if (Object.keys(scopeFilter).length > 0) {
    where.employee = scopeFilter;
  }

  const alert = await prisma.alert.findFirst({ where });
  if (!alert) {
    throw new Error("Alerta no encontrada o sin permisos");
  }
}

export async function getAlertNotes(alertId: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.orgId) {
    throw new Error("Usuario no autenticado");
  }

  await assertAlertAccess(alertId, session.user.id, session.user.orgId);

  const notes = await prisma.alertNote.findMany({
    where: { alertId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return notes.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    user: note.user,
  }));
}

export async function addAlertNote(alertId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.orgId) {
    throw new Error("Usuario no autenticado");
  }

  await assertAlertAccess(alertId, session.user.id, session.user.orgId);

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("La nota está vacía");
  }

  const note = await prisma.alertNote.create({
    data: {
      alertId,
      userId: session.user.id,
      content: trimmed,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    user: note.user,
  };
}
