import { NextRequest, NextResponse } from "next/server";

import { type Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

export async function GET(_request: NextRequest, context: { params: Promise<{ groupId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const { groupId } = await context.params;
    if (!groupId) {
      return NextResponse.json({ error: "groupId requerido" }, { status: 400 });
    }

    const role = session.user.role as Role;
    const orgId = session.user.orgId;
    const userId = session.user.id;

    const effective = await computeEffectivePermissions({ role, orgId, userId });
    if (!effective.has("manage_group_configuration")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (role !== "SUPER_ADMIN") {
      const membership = await prisma.organizationGroupUser.findFirst({
        where: {
          groupId,
          userId,
          isActive: true,
          role: { in: GROUP_MANAGE_ROLES },
          group: { isActive: true },
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }

    const orgs = await prisma.organizationGroupOrganization.findMany({
      where: {
        groupId,
        status: "ACTIVE",
        organization: { active: true },
      },
      select: {
        organizationId: true,
        organization: { select: { name: true } },
      },
      orderBy: { organization: { name: "asc" } },
    });

    return NextResponse.json({
      organizations: orgs.map((o) => ({ id: o.organizationId, name: o.organization.name })),
    });
  } catch (error) {
    console.error("Error listando organizaciones del grupo (group-sync):", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
