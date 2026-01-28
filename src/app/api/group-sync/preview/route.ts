import { NextRequest, NextResponse } from "next/server";

import { type Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { buildGroupSyncPreview, type ConflictStrategy, type GroupSyncSelection } from "@/lib/group-sync/engine";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GROUP_MANAGE_ROLES: Role[] = ["HR_ADMIN", "ORG_ADMIN"];

type PreviewBody = {
  groupId: string;
  sourceOrgId: string;
  targetOrgIds: string[];
  selection: GroupSyncSelection;
  conflictStrategy: ConflictStrategy;
};

type MissingCostCenter = {
  sourceCostCenterId: string;
  name: string;
  code: string | null;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildCostCenterMaps(costCenters: Array<{ id: string; name: string; code: string | null }>) {
  const byId = new Set(costCenters.map((cc) => cc.id));
  const byCode = new Map<string, string>();
  const byName = new Map<string, string>();

  costCenters.forEach((cc) => {
    if (cc.code) {
      byCode.set(normalizeKey(cc.code), cc.id);
    }
    byName.set(normalizeKey(cc.name), cc.id);
  });

  return { byId, byCode, byName };
}

function autoResolveCostCenterId(params: {
  mapCostCentersBy: "CODE" | "NAME";
  source: MissingCostCenter;
  maps: ReturnType<typeof buildCostCenterMaps>;
}): string | null {
  const { mapCostCentersBy, source, maps } = params;

  if (mapCostCentersBy === "CODE" && source.code) {
    const match = maps.byCode.get(normalizeKey(source.code)) ?? null;
    if (match) return match;
  }

  return maps.byName.get(normalizeKey(source.name)) ?? null;
}

async function computeMissingCostCentersByTarget(params: {
  sourceOrgId: string;
  targetOrgIds: string[];
  selection: GroupSyncSelection;
}): Promise<Record<string, MissingCostCenter[]>> {
  const { sourceOrgId, targetOrgIds, selection } = params;

  const includeLocalCalendars = selection.calendars?.includeLocal ?? false;
  const wantsCalendars = selection.packages.calendars ?? false;
  if (!wantsCalendars || !includeLocalCalendars) {
    return {};
  }

  const mapCostCentersBy = selection.calendars?.mapCostCentersBy ?? "CODE";
  const explicitMappings = selection.calendars?.costCenterMappingsByOrg ?? {};

  const sourceLocalCalendars = await prisma.calendar.findMany({
    where: {
      orgId: sourceOrgId,
      calendarType: "LOCAL_HOLIDAY",
      costCenterId: { not: null },
    },
    include: {
      costCenter: { select: { id: true, name: true, code: true } },
    },
  });

  const uniqueSourceCostCenters = new Map<string, MissingCostCenter>();
  sourceLocalCalendars.forEach((cal) => {
    if (!cal.costCenter) return;
    uniqueSourceCostCenters.set(cal.costCenter.id, {
      sourceCostCenterId: cal.costCenter.id,
      name: cal.costCenter.name,
      code: cal.costCenter.code,
    });
  });

  const sourceCostCenters = Array.from(uniqueSourceCostCenters.values());
  if (sourceCostCenters.length === 0) {
    return {};
  }

  const result: Record<string, MissingCostCenter[]> = {};

  for (const targetOrgId of targetOrgIds) {
    const targetCostCenters = await prisma.costCenter.findMany({
      where: { orgId: targetOrgId, active: true },
      select: { id: true, name: true, code: true },
    });

    const maps = buildCostCenterMaps(targetCostCenters);
    const explicitForTarget = explicitMappings[targetOrgId] ?? {};

    const missing = sourceCostCenters.filter((sourceCc) => {
      const explicitId = explicitForTarget[sourceCc.sourceCostCenterId];
      if (explicitId && maps.byId.has(explicitId)) return false;
      const resolved = autoResolveCostCenterId({ mapCostCentersBy, source: sourceCc, maps });
      return resolved === null;
    });

    if (missing.length > 0) {
      result[targetOrgId] = missing;
    }
  }

  return result;
}

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

    const body = (await request.json()) as PreviewBody;
    const groupId = body.groupId?.trim();
    const sourceOrgId = body.sourceOrgId?.trim();
    const targetOrgIds = Array.isArray(body.targetOrgIds) ? body.targetOrgIds.map((id) => String(id).trim()) : [];

    if (!groupId || !sourceOrgId || targetOrgIds.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    await assertGroupAccess({ groupId, session });
    await assertOrgsBelongToGroup(groupId, [sourceOrgId, ...targetOrgIds]);

    const preview = await buildGroupSyncPreview({
      sourceOrgId,
      targetOrgIds,
      selection: body.selection,
      conflictStrategy: body.conflictStrategy,
    });

    const missingCostCentersByTarget = await computeMissingCostCentersByTarget({
      sourceOrgId,
      targetOrgIds,
      selection: body.selection,
    });

    return NextResponse.json({ success: true, preview, missingCostCentersByTarget });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const status = message === "FORBIDDEN" ? 403 : message === "INVALID_ORG_SCOPE" ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
