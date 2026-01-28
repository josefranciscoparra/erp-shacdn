import { NextResponse } from "next/server";

import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

export type GroupCalendarAuthContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth>>>;
  role: Role;
};

export async function requireGroupCalendarAccess(params: {
  groupId: string;
}): Promise<GroupCalendarAuthContext | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const role = session.user.role as Role;

  // Bypass para SUPER_ADMIN (y además normalmente tendrá el permiso efectivo).
  if (role === "SUPER_ADMIN") {
    return { session, role };
  }

  const effective = await computeEffectivePermissions({ role, orgId: session.user.orgId, userId: session.user.id });
  if (!effective.has("manage_group_configuration")) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const membership = await prisma.organizationGroupUser.findFirst({
    where: {
      groupId: params.groupId,
      userId: session.user.id,
      isActive: true,
      role: { in: GROUP_MANAGE_ROLES },
      group: { isActive: true },
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }

  return { session, role };
}
