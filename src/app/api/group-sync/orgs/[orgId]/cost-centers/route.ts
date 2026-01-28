import { NextRequest, NextResponse } from "next/server";

import { type Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

async function assertGroupAccess(params: {
  groupId: string;
  session: NonNullable<Awaited<ReturnType<typeof auth>>>;
}): Promise<void> {
  const { groupId, session } = params;
  const role = session.user.role as Role;

  if (role === "SUPER_ADMIN") return;

  const membership = await prisma.organizationGroupUser.findFirst({
    where: {
      groupId,
      userId: session.user.id,
      isActive: true,
      role: { in: GROUP_MANAGE_ROLES },
      group: { isActive: true },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("FORBIDDEN");
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const effective = await computeEffectivePermissions({ role, orgId: session.user.orgId, userId: session.user.id });
    if (!effective.has("manage_group_configuration")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { orgId } = await context.params;
    const groupId = request.nextUrl.searchParams.get("groupId")?.trim() ?? "";
    if (!groupId) {
      return NextResponse.json({ error: "groupId requerido" }, { status: 400 });
    }

    await assertGroupAccess({ groupId, session });

    const membership = await prisma.organizationGroupOrganization.findFirst({
      where: {
        groupId,
        organizationId: orgId,
        status: "ACTIVE",
        group: { isActive: true },
        organization: { active: true },
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const costCenters = await prisma.costCenter.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, costCenters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const status = message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
