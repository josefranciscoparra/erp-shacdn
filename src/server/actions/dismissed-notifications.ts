"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Marcar una notificación como descartada
 *
 * @param type - Tipo de notificación ("INCOMPLETE_ENTRY", "EXCESSIVE_TIME", etc.)
 * @param referenceId - ID de referencia (WorkdaySummary, TimeEntry, etc.)
 */
export async function dismissNotification(type: string, referenceId: string): Promise<void> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, orgId: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  await prisma.dismissedNotification.upsert({
    where: {
      userId_type_referenceId: {
        userId: user.id,
        type,
        referenceId,
      },
    },
    create: {
      userId: user.id,
      orgId: user.orgId,
      type,
      referenceId,
    },
    update: {
      dismissedAt: new Date(),
    },
  });
}

/**
 * Verificar si una notificación está descartada
 *
 * @param type - Tipo de notificación
 * @param referenceId - ID de referencia
 * @returns true si está descartada, false si no
 */
export async function isNotificationDismissed(type: string, referenceId: string): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  const dismissed = await prisma.dismissedNotification.findUnique({
    where: {
      userId_type_referenceId: {
        userId: session.user.id,
        type,
        referenceId,
      },
    },
  });

  return dismissed !== null;
}

/**
 * Eliminar una notificación descartada (para permitir que vuelva a aparecer)
 *
 * @param type - Tipo de notificación
 * @param referenceId - ID de referencia
 */
export async function undismissNotification(type: string, referenceId: string): Promise<void> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Usuario no autenticado");
  }

  await prisma.dismissedNotification.delete({
    where: {
      userId_type_referenceId: {
        userId: session.user.id,
        type,
        referenceId,
      },
    },
  });
}
