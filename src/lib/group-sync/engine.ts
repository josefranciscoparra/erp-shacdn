import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";

export type ConflictStrategy = "SKIP" | "OVERWRITE" | "MERGE";

export type GroupSyncSelection = {
  packages: {
    permissionOverrides?: boolean;
    absenceTypes?: boolean;
    ptoConfig?: boolean;
    calendars?: boolean;
  };
  calendars?: {
    includeLocal?: boolean;
    mapCostCentersBy?: "CODE" | "NAME";
    // Mapeo explícito: para cada org destino, mapear sourceCostCenterId -> targetCostCenterId
    // Permite resolver conflictos de sedes desde UI antes de ejecutar.
    costCenterMappingsByOrg?: Record<string, Record<string, string>>;
  };
};

export type PackageSummary = {
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
  // Auditoría/UI: lista de entidades tocadas (no a nivel de evento individual).
  changes: Array<Record<string, unknown>>;
};

export type TargetPreview = {
  targetOrgId: string;
  targetOrgName: string;
  summaries: Record<string, PackageSummary>;
};

type SourcePtoConfig = {
  annualPtoDays: number;
  config: {
    maternityLeaveWeeks: number;
    paternityLeaveWeeks: number;
    seniorityRules: unknown;
    allowNegativeBalance: boolean;
    maxAdvanceRequestMonths: number;
    carryoverMode: string;
    carryoverDeadlineMonth: number;
    carryoverDeadlineDay: number;
    carryoverRequestDeadlineMonth: number;
    carryoverRequestDeadlineDay: number;
    vacationRoundingUnit: Decimal;
    vacationRoundingMode: string;
    personalMattersDays: Decimal;
    compTimeDays: Decimal;
  };
};

function emptySummary(): PackageSummary {
  return { created: 0, updated: 0, skipped: 0, warnings: [], changes: [] };
}

function eventKey(event: { name: string; date: Date; endDate: Date | null; eventType: string }): string {
  const start = event.date.toISOString().slice(0, 10);
  const end = event.endDate ? event.endDate.toISOString().slice(0, 10) : "";
  return `${start}|${end}|${event.eventType}|${event.name}`.toLowerCase();
}

async function loadSourcePtoConfig(sourceOrgId: string): Promise<SourcePtoConfig> {
  const organization = await prisma.organization.findUnique({
    where: { id: sourceOrgId },
    select: { annualPtoDays: true },
  });

  const config = await prisma.organizationPtoConfig.findUnique({
    where: { orgId: sourceOrgId },
  });

  const defaultConfig: SourcePtoConfig["config"] = {
    maternityLeaveWeeks: 17,
    paternityLeaveWeeks: 17,
    seniorityRules: [],
    allowNegativeBalance: false,
    maxAdvanceRequestMonths: 12,
    carryoverMode: "NONE",
    carryoverDeadlineMonth: 1,
    carryoverDeadlineDay: 29,
    carryoverRequestDeadlineMonth: 1,
    carryoverRequestDeadlineDay: 29,
    vacationRoundingUnit: new Decimal(0.1),
    vacationRoundingMode: "NEAREST",
    personalMattersDays: new Decimal(0),
    compTimeDays: new Decimal(0),
  };

  if (!config) {
    return {
      annualPtoDays: organization?.annualPtoDays ?? 0,
      config: defaultConfig,
    };
  }

  return {
    annualPtoDays: organization?.annualPtoDays ?? 0,
    config: {
      maternityLeaveWeeks: config.maternityLeaveWeeks,
      paternityLeaveWeeks: config.paternityLeaveWeeks,
      seniorityRules: config.seniorityRules,
      allowNegativeBalance: config.allowNegativeBalance,
      maxAdvanceRequestMonths: config.maxAdvanceRequestMonths,
      carryoverMode: config.carryoverMode,
      carryoverDeadlineMonth: config.carryoverDeadlineMonth,
      carryoverDeadlineDay: config.carryoverDeadlineDay,
      carryoverRequestDeadlineMonth: config.carryoverRequestDeadlineMonth,
      carryoverRequestDeadlineDay: config.carryoverRequestDeadlineDay,
      vacationRoundingUnit: config.vacationRoundingUnit,
      vacationRoundingMode: config.vacationRoundingMode,
      personalMattersDays: config.personalMattersDays,
      compTimeDays: config.compTimeDays,
    },
  };
}

async function buildTargetCostCenterMaps(targetOrgId: string) {
  const costCenters = await prisma.costCenter.findMany({
    where: { orgId: targetOrgId, active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const byCode = new Map<string, string>();
  const byName = new Map<string, string>();

  costCenters.forEach((cc) => {
    if (cc.code) {
      byCode.set(cc.code.trim().toLowerCase(), cc.id);
    }
    byName.set(cc.name.trim().toLowerCase(), cc.id);
  });

  return { costCenters, byCode, byName };
}

function getExplicitCostCenterMapping(params: {
  selection: GroupSyncSelection;
  targetOrgId: string;
  sourceCostCenterId: string;
}): string | null {
  const { selection, targetOrgId, sourceCostCenterId } = params;
  const map = selection.calendars?.costCenterMappingsByOrg?.[targetOrgId];
  if (!map) return null;
  const value = map[sourceCostCenterId];
  return value ? value : null;
}

function resolveMappedCostCenterId(params: {
  sourceCostCenter: { id: string; name: string; code: string | null } | null;
  mapCostCentersBy: "CODE" | "NAME";
  maps: { byCode: Map<string, string>; byName: Map<string, string> };
  explicitTargetCostCenterId?: string | null;
}): { mappedId: string | null; warning?: string } {
  const { sourceCostCenter, mapCostCentersBy, maps, explicitTargetCostCenterId } = params;
  if (!sourceCostCenter) return { mappedId: null };

  if (explicitTargetCostCenterId) {
    // Validar mínimo: el ID debe existir en los mapas (para evitar IDs de otro grupo/empresa).
    const exists =
      Array.from(maps.byCode.values()).includes(explicitTargetCostCenterId) ||
      Array.from(maps.byName.values()).includes(explicitTargetCostCenterId);
    if (exists) {
      return { mappedId: explicitTargetCostCenterId };
    }
    return {
      mappedId: null,
      warning: `El mapeo manual de sedes no es válido para '${sourceCostCenter.name}'. Revisa la selección.`,
    };
  }

  if (mapCostCentersBy === "CODE" && sourceCostCenter.code) {
    const match = maps.byCode.get(sourceCostCenter.code.trim().toLowerCase()) ?? null;
    if (match) return { mappedId: match };
  }

  const matchByName = maps.byName.get(sourceCostCenter.name.trim().toLowerCase()) ?? null;
  if (matchByName) return { mappedId: matchByName };

  return {
    mappedId: null,
    warning: `No se encontró sede equivalente para '${sourceCostCenter.name}' (code: ${sourceCostCenter.code ?? "—"}).`,
  };
}

async function previewPermissionOverrides(params: {
  sourceOverrides: Array<{ role: any }>;
  targetOrgId: string;
  conflictStrategy: ConflictStrategy;
}): Promise<PackageSummary> {
  const summary = emptySummary();
  const { sourceOverrides, targetOrgId, conflictStrategy } = params;

  if (sourceOverrides.length === 0) {
    summary.warnings.push("La empresa origen no tiene overrides de permisos.");
    return summary;
  }

  const existing = await prisma.orgRolePermissionOverride.findMany({
    where: { orgId: targetOrgId, role: { in: sourceOverrides.map((o) => o.role) } },
    select: { role: true },
  });
  const existingRoles = new Set(existing.map((o) => o.role));

  for (const row of sourceOverrides) {
    if (existingRoles.has(row.role)) {
      if (conflictStrategy === "SKIP") summary.skipped += 1;
      else summary.updated += 1;
      continue;
    }
    summary.created += 1;
  }

  return summary;
}

async function previewAbsenceTypes(params: {
  sourceAbsenceTypes: Array<{ code: string }>;
  targetOrgId: string;
  conflictStrategy: ConflictStrategy;
}): Promise<PackageSummary> {
  const summary = emptySummary();
  const { sourceAbsenceTypes, targetOrgId, conflictStrategy } = params;

  if (sourceAbsenceTypes.length === 0) {
    summary.warnings.push("La empresa origen no tiene tipos de ausencia.");
    return summary;
  }

  const existing = await prisma.absenceType.findMany({
    where: { orgId: targetOrgId, code: { in: sourceAbsenceTypes.map((t) => t.code) } },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((t) => t.code));

  for (const at of sourceAbsenceTypes) {
    if (existingCodes.has(at.code)) {
      if (conflictStrategy === "SKIP") summary.skipped += 1;
      else summary.updated += 1;
      continue;
    }
    summary.created += 1;
  }

  return summary;
}

async function previewPtoConfig(params: {
  targetOrgId: string;
  conflictStrategy: ConflictStrategy;
  hasSource: boolean;
}): Promise<PackageSummary> {
  const summary = emptySummary();
  const { targetOrgId, conflictStrategy, hasSource } = params;

  const existing = await prisma.organizationPtoConfig.findUnique({
    where: { orgId: targetOrgId },
    select: { id: true },
  });

  if (existing) {
    if (conflictStrategy === "SKIP") summary.skipped = 1;
    else summary.updated = 1;
  } else {
    summary.created = 1;
  }

  if (!hasSource) {
    summary.warnings.push("No se pudo cargar configuración PTO de origen.");
  }

  return summary;
}

async function previewCalendars(params: {
  sourceCalendars: Array<{
    name: string;
    year: number;
    calendarType: any;
    costCenter: { id: string; name: string; code: string | null } | null;
  }>;
  targetOrgId: string;
  conflictStrategy: ConflictStrategy;
  includeLocal: boolean;
  mapCostCentersBy: "CODE" | "NAME";
  selection: GroupSyncSelection;
}): Promise<PackageSummary> {
  const summary = emptySummary();
  const { sourceCalendars, targetOrgId, conflictStrategy, includeLocal, mapCostCentersBy, selection } = params;

  if (sourceCalendars.length === 0) {
    summary.warnings.push("La empresa origen no tiene calendarios para desplegar.");
    return summary;
  }

  const costCenterMaps = includeLocal ? await buildTargetCostCenterMaps(targetOrgId) : null;

  for (const cal of sourceCalendars) {
    const mapping = includeLocal
      ? resolveMappedCostCenterId({
          sourceCostCenter: cal.costCenter,
          mapCostCentersBy,
          maps: costCenterMaps ?? { byCode: new Map(), byName: new Map() },
          explicitTargetCostCenterId: cal.costCenter
            ? getExplicitCostCenterMapping({
                selection,
                targetOrgId,
                sourceCostCenterId: cal.costCenter.id,
              })
            : null,
        })
      : { mappedId: null as string | null };

    if (mapping.warning) summary.warnings.push(mapping.warning);

    // Evitar crear calendarios locales sin sede (la UI actual lo considera inválido).
    if (cal.calendarType === "LOCAL_HOLIDAY" && mapping.mappedId === null) {
      summary.skipped += 1;
      summary.warnings.push(`Calendario local '${cal.name}' omitido: no se pudo mapear la sede.`);
      summary.changes.push({
        entityType: "CALENDAR",
        action: "SKIPPED",
        name: cal.name,
        year: cal.year,
        calendarType: cal.calendarType,
        sourceCostCenter: cal.costCenter
          ? { id: cal.costCenter.id, name: cal.costCenter.name, code: cal.costCenter.code }
          : null,
        targetCostCenter: null,
        eventsInSource: cal.events.length,
        reason: "No se pudo mapear la sede",
      });
      continue;
    }

    const existing = await prisma.calendar.findFirst({
      where: {
        orgId: targetOrgId,
        name: cal.name,
        year: cal.year,
        calendarType: cal.calendarType,
        costCenterId: mapping.mappedId,
      },
      select: { id: true },
    });

    if (existing) {
      if (conflictStrategy === "SKIP") summary.skipped += 1;
      else summary.updated += 1;
    } else {
      summary.created += 1;
    }
  }

  return summary;
}

export async function buildGroupSyncPreview(params: {
  sourceOrgId: string;
  targetOrgIds: string[];
  selection: GroupSyncSelection;
  conflictStrategy: ConflictStrategy;
}): Promise<TargetPreview[]> {
  const { sourceOrgId, targetOrgIds, selection, conflictStrategy } = params;

  const targets = await prisma.organization.findMany({
    where: { id: { in: targetOrgIds }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const sourceOverrides = selection.packages.permissionOverrides
    ? await prisma.orgRolePermissionOverride.findMany({ where: { orgId: sourceOrgId } })
    : [];

  const sourceAbsenceTypes = selection.packages.absenceTypes
    ? await prisma.absenceType.findMany({ where: { orgId: sourceOrgId } })
    : [];

  const sourcePto = selection.packages.ptoConfig ? await loadSourcePtoConfig(sourceOrgId) : null;

  const sourceCalendars = selection.packages.calendars
    ? await prisma.calendar.findMany({
        where: {
          orgId: sourceOrgId,
          ...(selection.calendars?.includeLocal ? {} : { costCenterId: null }),
        },
        include: {
          costCenter: { select: { id: true, name: true, code: true } },
          events: true,
        },
        orderBy: [{ year: "desc" }, { calendarType: "asc" }, { name: "asc" }],
      })
    : [];

  const mapCostCentersBy = selection.calendars?.mapCostCentersBy ?? "CODE";
  const includeLocalCalendars = selection.calendars?.includeLocal ?? false;

  const previews: TargetPreview[] = [];

  for (const target of targets) {
    const summaries: Record<string, PackageSummary> = {
      permissionOverrides: emptySummary(),
      absenceTypes: emptySummary(),
      ptoConfig: emptySummary(),
      calendars: emptySummary(),
    };

    if (selection.packages.permissionOverrides) {
      summaries.permissionOverrides = await previewPermissionOverrides({
        sourceOverrides,
        targetOrgId: target.id,
        conflictStrategy,
      });
    }

    if (selection.packages.absenceTypes) {
      summaries.absenceTypes = await previewAbsenceTypes({
        sourceAbsenceTypes,
        targetOrgId: target.id,
        conflictStrategy,
      });
    }

    if (selection.packages.ptoConfig) {
      summaries.ptoConfig = await previewPtoConfig({
        targetOrgId: target.id,
        conflictStrategy,
        hasSource: sourcePto !== null,
      });
    }

    if (selection.packages.calendars) {
      summaries.calendars = await previewCalendars({
        sourceCalendars,
        targetOrgId: target.id,
        conflictStrategy,
        includeLocal: includeLocalCalendars,
        mapCostCentersBy,
        selection,
      });
    }

    previews.push({
      targetOrgId: target.id,
      targetOrgName: target.name,
      summaries,
    });
  }

  return previews;
}

async function applyPermissionOverrides(params: {
  sourceOrgId: string;
  targetOrgId: string;
  conflictStrategy: ConflictStrategy;
}): Promise<PackageSummary> {
  const summary = emptySummary();

  const source = await prisma.orgRolePermissionOverride.findMany({
    where: { orgId: params.sourceOrgId },
  });

  if (source.length === 0) {
    summary.warnings.push("La empresa origen no tiene overrides de permisos.");
    return summary;
  }

  for (const row of source) {
    const existing = await prisma.orgRolePermissionOverride.findUnique({
      where: { orgId_role: { orgId: params.targetOrgId, role: row.role } },
      select: { id: true },
    });

    if (existing && params.conflictStrategy === "SKIP") {
      summary.skipped += 1;
      summary.changes.push({
        entityType: "PERMISSION_OVERRIDE",
        action: "SKIPPED",
        role: row.role,
      });
      continue;
    }

    if (existing) {
      await prisma.orgRolePermissionOverride.update({
        where: { orgId_role: { orgId: params.targetOrgId, role: row.role } },
        data: {
          grantPermissions: row.grantPermissions,
          revokePermissions: row.revokePermissions,
        },
      });
      summary.updated += 1;
      summary.changes.push({
        entityType: "PERMISSION_OVERRIDE",
        action: "UPDATED",
        role: row.role,
      });
      continue;
    }

    await prisma.orgRolePermissionOverride.create({
      data: {
        orgId: params.targetOrgId,
        role: row.role,
        grantPermissions: row.grantPermissions,
        revokePermissions: row.revokePermissions,
      },
    });
    summary.created += 1;
    summary.changes.push({
      entityType: "PERMISSION_OVERRIDE",
      action: "CREATED",
      role: row.role,
    });
  }

  return summary;
}

async function applyAbsenceTypes(params: {
  sourceOrgId: string;
  targetOrgId: string;
  conflictStrategy: ConflictStrategy;
}): Promise<PackageSummary> {
  const summary = emptySummary();

  const source = await prisma.absenceType.findMany({
    where: { orgId: params.sourceOrgId },
  });

  if (source.length === 0) {
    summary.warnings.push("La empresa origen no tiene tipos de ausencia.");
    return summary;
  }

  for (const at of source) {
    const existing = await prisma.absenceType.findUnique({
      where: { orgId_code: { orgId: params.targetOrgId, code: at.code } },
      select: { id: true },
    });

    if (existing && params.conflictStrategy === "SKIP") {
      summary.skipped += 1;
      summary.changes.push({
        entityType: "ABSENCE_TYPE",
        action: "SKIPPED",
        code: at.code,
        name: at.name,
      });
      continue;
    }

    const payload = {
      name: at.name,
      code: at.code,
      description: at.description,
      color: at.color,
      isPaid: at.isPaid,
      requiresApproval: at.requiresApproval,
      minDaysAdvance: at.minDaysAdvance,
      allowRetroactive: at.allowRetroactive,
      retroactiveMaxDays: at.retroactiveMaxDays,
      affectsBalance: at.affectsBalance,
      active: at.active,
      allowPartialDays: at.allowPartialDays,
      countsCalendarDays: at.countsCalendarDays,
      granularityMinutes: at.granularityMinutes,
      minimumDurationMinutes: at.minimumDurationMinutes,
      maxDurationMinutes: at.maxDurationMinutes,
      compensationFactor: at.compensationFactor,
      balanceType: at.balanceType,
      requiresDocument: at.requiresDocument,
    };

    if (existing) {
      await prisma.absenceType.update({
        where: { orgId_code: { orgId: params.targetOrgId, code: at.code } },
        data: payload,
      });
      summary.updated += 1;
      summary.changes.push({
        entityType: "ABSENCE_TYPE",
        action: "UPDATED",
        code: at.code,
        name: at.name,
      });
    } else {
      await prisma.absenceType.create({
        data: {
          ...payload,
          orgId: params.targetOrgId,
        },
      });
      summary.created += 1;
      summary.changes.push({
        entityType: "ABSENCE_TYPE",
        action: "CREATED",
        code: at.code,
        name: at.name,
      });
    }
  }

  return summary;
}

async function applyPtoConfig(params: {
  sourceOrgId: string;
  targetOrgId: string;
  conflictStrategy: ConflictStrategy;
}): Promise<PackageSummary> {
  const summary = emptySummary();

  const source = await loadSourcePtoConfig(params.sourceOrgId);

  const existing = await prisma.organizationPtoConfig.findUnique({
    where: { orgId: params.targetOrgId },
    select: { id: true },
  });

  if (existing && params.conflictStrategy === "SKIP") {
    summary.skipped = 1;
    summary.changes.push({
      entityType: "PTO_CONFIG",
      action: "SKIPPED",
      annualPtoDays: source.annualPtoDays,
      carryoverMode: source.config.carryoverMode,
    });
    return summary;
  }

  if (existing) {
    summary.updated = 1;
    summary.changes.push({
      entityType: "PTO_CONFIG",
      action: "UPDATED",
      annualPtoDays: source.annualPtoDays,
      carryoverMode: source.config.carryoverMode,
    });
  } else {
    summary.created = 1;
    summary.changes.push({
      entityType: "PTO_CONFIG",
      action: "CREATED",
      annualPtoDays: source.annualPtoDays,
      carryoverMode: source.config.carryoverMode,
    });
  }

  await prisma.organization.update({
    where: { id: params.targetOrgId },
    data: { annualPtoDays: source.annualPtoDays },
  });

  await prisma.organizationPtoConfig.upsert({
    where: { orgId: params.targetOrgId },
    create: {
      orgId: params.targetOrgId,
      maternityLeaveWeeks: source.config.maternityLeaveWeeks,
      paternityLeaveWeeks: source.config.paternityLeaveWeeks,
      seniorityRules: source.config.seniorityRules as any,
      allowNegativeBalance: source.config.allowNegativeBalance,
      maxAdvanceRequestMonths: source.config.maxAdvanceRequestMonths,
      carryoverMode: source.config.carryoverMode as any,
      carryoverDeadlineMonth: source.config.carryoverDeadlineMonth,
      carryoverDeadlineDay: source.config.carryoverDeadlineDay,
      carryoverRequestDeadlineMonth: source.config.carryoverRequestDeadlineMonth,
      carryoverRequestDeadlineDay: source.config.carryoverRequestDeadlineDay,
      vacationRoundingUnit: source.config.vacationRoundingUnit,
      vacationRoundingMode: source.config.vacationRoundingMode as any,
      personalMattersDays: source.config.personalMattersDays,
      compTimeDays: source.config.compTimeDays,
    },
    update: {
      maternityLeaveWeeks: source.config.maternityLeaveWeeks,
      paternityLeaveWeeks: source.config.paternityLeaveWeeks,
      seniorityRules: source.config.seniorityRules as any,
      allowNegativeBalance: source.config.allowNegativeBalance,
      maxAdvanceRequestMonths: source.config.maxAdvanceRequestMonths,
      carryoverMode: source.config.carryoverMode as any,
      carryoverDeadlineMonth: source.config.carryoverDeadlineMonth,
      carryoverDeadlineDay: source.config.carryoverDeadlineDay,
      carryoverRequestDeadlineMonth: source.config.carryoverRequestDeadlineMonth,
      carryoverRequestDeadlineDay: source.config.carryoverRequestDeadlineDay,
      vacationRoundingUnit: source.config.vacationRoundingUnit,
      vacationRoundingMode: source.config.vacationRoundingMode as any,
      personalMattersDays: source.config.personalMattersDays,
      compTimeDays: source.config.compTimeDays,
    },
  });

  return summary;
}

async function applyCalendars(params: {
  sourceOrgId: string;
  targetOrgId: string;
  conflictStrategy: ConflictStrategy;
  includeLocal: boolean;
  mapCostCentersBy: "CODE" | "NAME";
  selection: GroupSyncSelection;
}): Promise<PackageSummary> {
  const summary = emptySummary();

  const sourceCalendars = await prisma.calendar.findMany({
    where: {
      orgId: params.sourceOrgId,
      ...(params.includeLocal ? {} : { costCenterId: null }),
    },
    include: {
      costCenter: { select: { id: true, name: true, code: true } },
      events: true,
    },
    orderBy: [{ year: "desc" }, { calendarType: "asc" }, { name: "asc" }],
  });

  if (sourceCalendars.length === 0) {
    summary.warnings.push("La empresa origen no tiene calendarios para desplegar.");
    return summary;
  }

  const costCenterMaps = params.includeLocal ? await buildTargetCostCenterMaps(params.targetOrgId) : null;
  const targetCostCenterById = new Map<string, { id: string; name: string; code: string | null }>();
  if (costCenterMaps) {
    costCenterMaps.costCenters.forEach((cc) => {
      targetCostCenterById.set(cc.id, cc);
    });
  }

  for (const cal of sourceCalendars) {
    const mapping = params.includeLocal
      ? resolveMappedCostCenterId({
          sourceCostCenter: cal.costCenter ?? null,
          mapCostCentersBy: params.mapCostCentersBy,
          maps: costCenterMaps ?? { byCode: new Map(), byName: new Map() },
          explicitTargetCostCenterId: cal.costCenter
            ? getExplicitCostCenterMapping({
                selection: params.selection,
                targetOrgId: params.targetOrgId,
                sourceCostCenterId: cal.costCenter.id,
              })
            : null,
        })
      : { mappedId: null as string | null };

    if (mapping.warning) summary.warnings.push(mapping.warning);

    // Evitar crear calendarios locales sin sede (la UI actual lo considera inválido).
    if (cal.calendarType === "LOCAL_HOLIDAY" && mapping.mappedId === null) {
      summary.skipped += 1;
      summary.warnings.push(`Calendario local '${cal.name}' omitido: no se pudo mapear la sede.`);
      summary.changes.push({
        entityType: "CALENDAR",
        action: "SKIPPED",
        name: cal.name,
        year: cal.year,
        calendarType: cal.calendarType,
        sourceCostCenter: cal.costCenter
          ? { id: cal.costCenter.id, name: cal.costCenter.name, code: cal.costCenter.code }
          : null,
        targetCostCenter: null,
        eventsInSource: cal.events.length,
        reason: "No se pudo mapear la sede",
      });
      continue;
    }

    const existing = await prisma.calendar.findFirst({
      where: {
        orgId: params.targetOrgId,
        name: cal.name,
        year: cal.year,
        calendarType: cal.calendarType,
        costCenterId: mapping.mappedId,
      },
      include: { events: true },
    });

    if (existing && params.conflictStrategy === "SKIP") {
      summary.skipped += 1;
      summary.changes.push({
        entityType: "CALENDAR",
        action: "SKIPPED",
        name: cal.name,
        year: cal.year,
        calendarType: cal.calendarType,
        sourceCostCenter: cal.costCenter
          ? { id: cal.costCenter.id, name: cal.costCenter.name, code: cal.costCenter.code }
          : null,
        targetCostCenter: mapping.mappedId
          ? (targetCostCenterById.get(mapping.mappedId) ?? { id: mapping.mappedId })
          : null,
        eventsInSource: cal.events.length,
        reason: "Ya existe y la estrategia es SKIP",
      });
      continue;
    }

    const calendarData = {
      name: cal.name,
      description: cal.description,
      year: cal.year,
      calendarType: cal.calendarType,
      color: cal.color,
      active: cal.active,
      orgId: params.targetOrgId,
      costCenterId: mapping.mappedId,
    } as const;

    const eventsData = cal.events.map((e) => ({
      name: e.name,
      description: e.description,
      date: e.date,
      endDate: e.endDate,
      eventType: e.eventType,
      isRecurring: e.isRecurring,
    }));

    if (!existing) {
      await prisma.calendar.create({
        data: {
          ...calendarData,
          events: { create: eventsData },
        },
      });
      summary.created += 1;
      summary.changes.push({
        entityType: "CALENDAR",
        action: "CREATED",
        name: cal.name,
        year: cal.year,
        calendarType: cal.calendarType,
        sourceCostCenter: cal.costCenter
          ? { id: cal.costCenter.id, name: cal.costCenter.name, code: cal.costCenter.code }
          : null,
        targetCostCenter: mapping.mappedId
          ? (targetCostCenterById.get(mapping.mappedId) ?? { id: mapping.mappedId })
          : null,
        eventsInSource: eventsData.length,
        eventsAdded: eventsData.length,
      });
      continue;
    }

    if (params.conflictStrategy === "OVERWRITE") {
      await prisma.calendar.delete({ where: { id: existing.id } });
      await prisma.calendar.create({
        data: {
          ...calendarData,
          events: { create: eventsData },
        },
      });
      summary.updated += 1;
      summary.changes.push({
        entityType: "CALENDAR",
        action: "UPDATED",
        updateMode: "OVERWRITE",
        name: cal.name,
        year: cal.year,
        calendarType: cal.calendarType,
        sourceCostCenter: cal.costCenter
          ? { id: cal.costCenter.id, name: cal.costCenter.name, code: cal.costCenter.code }
          : null,
        targetCostCenter: mapping.mappedId
          ? (targetCostCenterById.get(mapping.mappedId) ?? { id: mapping.mappedId })
          : null,
        eventsInSource: eventsData.length,
        eventsAdded: eventsData.length,
      });
      continue;
    }

    // MERGE: mantiene eventos existentes, añade los faltantes.
    await prisma.calendar.update({
      where: { id: existing.id },
      data: {
        description: calendarData.description,
        color: calendarData.color,
        active: calendarData.active,
        calendarType: calendarData.calendarType,
      },
    });

    const existingKeys = new Set(existing.events.map((e) => eventKey(e)));
    const toCreate = eventsData.filter((e) => !existingKeys.has(eventKey({ ...e, endDate: e.endDate ?? null })));

    if (toCreate.length > 0) {
      await prisma.calendarEvent.createMany({
        data: toCreate.map((e) => ({ ...e, calendarId: existing.id })),
      });
    }

    summary.updated += 1;
    summary.changes.push({
      entityType: "CALENDAR",
      action: "UPDATED",
      updateMode: "MERGE",
      name: cal.name,
      year: cal.year,
      calendarType: cal.calendarType,
      sourceCostCenter: cal.costCenter
        ? { id: cal.costCenter.id, name: cal.costCenter.name, code: cal.costCenter.code }
        : null,
      targetCostCenter: mapping.mappedId
        ? (targetCostCenterById.get(mapping.mappedId) ?? { id: mapping.mappedId })
        : null,
      eventsInSource: eventsData.length,
      eventsAdded: toCreate.length,
    });
  }

  return summary;
}

export async function executeGroupSyncForTarget(params: {
  sourceOrgId: string;
  targetOrgId: string;
  selection: GroupSyncSelection;
  conflictStrategy: ConflictStrategy;
}): Promise<Record<string, PackageSummary>> {
  const { sourceOrgId, targetOrgId, selection, conflictStrategy } = params;

  const summaries: Record<string, PackageSummary> = {};

  if (selection.packages.permissionOverrides) {
    summaries.permissionOverrides = await applyPermissionOverrides({ sourceOrgId, targetOrgId, conflictStrategy });
  }

  if (selection.packages.absenceTypes) {
    summaries.absenceTypes = await applyAbsenceTypes({ sourceOrgId, targetOrgId, conflictStrategy });
  }

  if (selection.packages.ptoConfig) {
    summaries.ptoConfig = await applyPtoConfig({ sourceOrgId, targetOrgId, conflictStrategy });
  }

  if (selection.packages.calendars) {
    summaries.calendars = await applyCalendars({
      sourceOrgId,
      targetOrgId,
      conflictStrategy,
      includeLocal: selection.calendars?.includeLocal ?? false,
      mapCostCentersBy: selection.calendars?.mapCostCentersBy ?? "CODE",
      selection,
    });
  }

  return summaries;
}
