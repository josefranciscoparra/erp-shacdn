import { Role } from "@prisma/client";

import { sendAccountLockedAdminEmail } from "@/lib/email/email-service";
import { prisma } from "@/lib/prisma";

type AccountLockedAlertInput = {
  orgId: string;
  lockedUserId: string;
  lockedUserEmail: string;
  lockedUserName: string;
  attempts: number;
  lockedUntil: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"];

export async function sendAccountLockedAdminAlerts(input: AccountLockedAlertInput): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        orgId: input.orgId,
        active: true,
        role: { in: ADMIN_ROLES },
        NOT: {
          id: input.lockedUserId,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (admins.length === 0) {
      return;
    }

    const uniqueByEmail = new Map<string, { id: string; email: string; name: string | null }>();
    for (const admin of admins) {
      if (!uniqueByEmail.has(admin.email)) {
        uniqueByEmail.set(admin.email, admin);
      }
    }

    await Promise.all(
      Array.from(uniqueByEmail.values()).map((admin) =>
        sendAccountLockedAdminEmail({
          to: {
            email: admin.email,
            name: admin.name ?? undefined,
          },
          orgId: input.orgId,
          userId: admin.id,
          lockedUserName: input.lockedUserName,
          lockedUserEmail: input.lockedUserEmail,
          attempts: input.attempts,
          lockedUntil: input.lockedUntil ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
        }),
      ),
    );
  } catch (error) {
    console.error("Error enviando alertas a admins:", error);
  }
}
