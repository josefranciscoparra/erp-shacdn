import { NextResponse } from "next/server";

import { type Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const orgId = session.user.orgId;
    const userId = session.user.id;

    const effective = await computeEffectivePermissions({ role, orgId, userId });
    if (!effective.has("manage_group_configuration")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (role === "SUPER_ADMIN") {
      const groups = await prisma.organizationGroup.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      const defaultGroup = await prisma.organizationGroupOrganization.findFirst({
        where: {
          organizationId: orgId,
          status: "ACTIVE",
          group: { isActive: true },
        },
        select: { groupId: true },
      });

      return NextResponse.json({
        groups,
        defaultGroupId: defaultGroup?.groupId ?? null,
      });
    }

    const memberships = await prisma.organizationGroupUser.findMany({
      where: {
        userId,
        isActive: true,
        role: { in: GROUP_MANAGE_ROLES },
        group: { isActive: true },
      },
      select: {
        group: { select: { id: true, name: true } },
      },
    });

    const groups = memberships.map((m) => m.group).sort((a, b) => a.name.localeCompare(b.name));

    const defaultGroup = await prisma.organizationGroupOrganization.findFirst({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        group: { isActive: true },
      },
      select: { groupId: true },
    });

    return NextResponse.json({
      groups,
      defaultGroupId: defaultGroup?.groupId ?? null,
    });
  } catch (error) {
    console.error("Error listando grupos (group-sync):", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
