import { NextRequest, NextResponse } from "next/server";

import { type Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { type ConflictStrategy, type GroupSyncSelection } from "@/lib/group-sync/engine";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

type CreateJobBody = {
  groupId: string;
  sourceOrgId: string;
  targetOrgIds: string[];
  selection: GroupSyncSelection;
  conflictStrategy: ConflictStrategy;
  notes?: string;
};

async function assertGroupAccess(params: { groupId: string; session: NonNullable<Awaited<ReturnType<typeof auth>>> }) {
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

async function assertOrgsBelongToGroup(groupId: string, orgIds: string[]) {
  if (orgIds.length === 0) return;

  const rows = await prisma.organizationGroupOrganization.findMany({
    where: { groupId, status: "ACTIVE", organizationId: { in: orgIds } },
    select: { organizationId: true },
  });

  const allowed = new Set(rows.map((r) => r.organizationId));
  const invalid = orgIds.filter((id) => !allowed.has(id));

  if (invalid.length > 0) {
    throw new Error("INVALID_ORG_SCOPE");
  }
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as CreateJobBody;
    const groupId = body.groupId?.trim();
    const sourceOrgId = body.sourceOrgId?.trim();
    const rawTargets = Array.isArray(body.targetOrgIds) ? body.targetOrgIds : [];
    const targetOrgIds = rawTargets.map((id) => String(id).trim()).filter(Boolean);

    if (!groupId || !sourceOrgId || targetOrgIds.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    await assertGroupAccess({ groupId, session });
    await assertOrgsBelongToGroup(groupId, [sourceOrgId, ...targetOrgIds]);

    const filteredTargets = Array.from(new Set(targetOrgIds)).filter((id) => id !== sourceOrgId);
    if (filteredTargets.length === 0) {
      return NextResponse.json({ error: "No hay destinos válidos (no puede ser igual al origen)" }, { status: 400 });
    }

    const job = await prisma.groupSyncJob.create({
      data: {
        groupId,
        sourceOrgId,
        createdById: session.user.id,
        status: "DRAFT",
        conflictStrategy: body.conflictStrategy ?? "SKIP",
        selection: body.selection ?? ({} as any),
        notes: body.notes ?? null,
        targets: {
          create: filteredTargets.map((targetOrgId) => ({
            targetOrgId,
            status: "PENDING",
            summary: {},
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const status = message === "FORBIDDEN" ? 403 : message === "INVALID_ORG_SCOPE" ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
