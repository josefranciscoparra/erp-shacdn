"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Loader2, RefreshCcw, Rocket, ShieldAlert } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type GroupSummary = { id: string; name: string };
type OrgSummary = { id: string; name: string };
type CostCenterSummary = { id: string; name: string; code: string | null };

type ConflictStrategy = "SKIP" | "OVERWRITE" | "MERGE";

type Selection = {
  packages: {
    permissionOverrides: boolean;
    absenceTypes: boolean;
    ptoConfig: boolean;
    calendars: boolean;
  };
  calendars: {
    includeLocal: boolean;
    mapCostCentersBy: "CODE" | "NAME";
    costCenterMappingsByOrg?: Record<string, Record<string, string>>;
  };
};

type PackageSummary = { created: number; updated: number; skipped: number; warnings: string[] };

type TargetPreview = {
  targetOrgId: string;
  targetOrgName: string;
  summaries: Record<string, PackageSummary>;
};

type MissingCostCenter = {
  sourceCostCenterId: string;
  name: string;
  code: string | null;
};

type JobTarget = {
  id: string;
  status: string;
  summary: any;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  targetOrg: { id: string; name: string };
};

type JobPayload = {
  id: string;
  status: string;
  conflictStrategy: string;
  selection: any;
  notes: string | null;
  progressPercent: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  sourceOrg: { id: string; name: string };
  targets: JobTarget[];
};

const DEFAULT_SELECTION: Selection = {
  packages: {
    permissionOverrides: true,
    absenceTypes: true,
    ptoConfig: true,
    calendars: false,
  },
  calendars: {
    includeLocal: false,
    mapCostCentersBy: "CODE",
  },
};

function isDoneStatus(status: string): boolean {
  return status === "COMPLETED" || status === "COMPLETED_WITH_ERRORS" || status === "FAILED" || status === "CANCELLED";
}

export function GroupSyncWizard() {
  const { data: session } = useSession();
  const activeOrgId = session?.user?.orgId;

  const [step, setStep] = useState(1);

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string>("");
  const [organizations, setOrganizations] = useState<OrgSummary[]>([]);
  const [sourceOrgId, setSourceOrgId] = useState<string>("");
  const [targetOrgIds, setTargetOrgIds] = useState<string[]>([]);

  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>("MERGE");

  const [targetsSearch, setTargetsSearch] = useState("");
  const [preview, setPreview] = useState<TargetPreview[] | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [missingCostCentersByTarget, setMissingCostCentersByTarget] = useState<Record<string, MissingCostCenter[]>>({});
  const [targetCostCentersByOrg, setTargetCostCentersByOrg] = useState<Record<string, CostCenterSummary[]>>({});
  const [isLoadingCostCenters, setIsLoadingCostCenters] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobPayload | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const filteredOrganizations = useMemo(() => {
    const query = targetsSearch.trim().toLowerCase();
    if (!query) return organizations;
    return organizations.filter((org) => org.name.toLowerCase().includes(query));
  }, [organizations, targetsSearch]);

  const targetOrgsForSelection = useMemo(() => {
    return filteredOrganizations.filter((org) => org.id !== sourceOrgId);
  }, [filteredOrganizations, sourceOrgId]);

  const canContinueFromStep1 = Boolean(groupId && sourceOrgId);
  const canContinueFromStep2 = Object.values(selection.packages).some(Boolean);
  const canContinueFromStep3 = targetOrgIds.length > 0;
  const requiresLocalCalendarMapping = selection.packages.calendars && selection.calendars.includeLocal;
  const mustPreviewBeforeRun = requiresLocalCalendarMapping && preview === null;
  const needsCostCenterResolution =
    requiresLocalCalendarMapping && preview !== null && Object.keys(missingCostCentersByTarget).length > 0;

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/group-sync/groups", { credentials: "include" });
        if (!response.ok) throw new Error("No se pudieron cargar los grupos");
        const data = (await response.json()) as { groups: GroupSummary[]; defaultGroupId: string | null };
        setGroups(data.groups ?? []);
        setDefaultGroupId(data.defaultGroupId ?? null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los grupos";
        toast.error(message);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!groups.length) return;
    if (groupId) return;

    const nextGroupId = defaultGroupId ?? groups[0]?.id ?? "";
    if (nextGroupId) setGroupId(nextGroupId);
  }, [groups, groupId, defaultGroupId]);

  useEffect(() => {
    if (!groupId) return;

    const load = async () => {
      try {
        const response = await fetch(`/api/group-sync/groups/${groupId}/organizations`, { credentials: "include" });
        if (!response.ok) throw new Error("No se pudieron cargar las empresas del grupo");
        const data = (await response.json()) as { organizations: OrgSummary[] };
        const orgs = data.organizations ?? [];
        setOrganizations(orgs);

        const nextSource = orgs.find((o) => o.id === activeOrgId)?.id ?? orgs[0]?.id ?? "";
        setSourceOrgId(nextSource);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar las empresas del grupo";
        toast.error(message);
        setOrganizations([]);
      }
    };

    load();
  }, [groupId, activeOrgId]);

  useEffect(() => {
    if (!organizations.length || !sourceOrgId) return;

    const nextTargets = organizations.filter((org) => org.id !== sourceOrgId).map((org) => org.id);
    setTargetOrgIds(nextTargets);
  }, [organizations, sourceOrgId]);

  useEffect(() => {
    // Reset de preview cuando cambian inputs clave.
    setPreview(null);
  }, [groupId, sourceOrgId, targetOrgIds, selection, conflictStrategy]);

  useEffect(() => {
    // Si cambiamos el scope (grupo/origen/destinos), los conflictos previos ya no aplican.
    setMissingCostCentersByTarget({});
  }, [groupId, sourceOrgId, targetOrgIds]);

  useEffect(() => {
    // Si el usuario desactiva calendarios locales, ya no hay que resolver sedes.
    if (!selection.packages.calendars || !selection.calendars.includeLocal) {
      setMissingCostCentersByTarget({});
    }
  }, [selection.packages.calendars, selection.calendars.includeLocal]);

  async function loadPreview() {
    try {
      setIsPreviewLoading(true);
      const response = await fetch("/api/group-sync/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          sourceOrgId,
          targetOrgIds,
          selection,
          conflictStrategy,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        preview?: TargetPreview[];
        missingCostCentersByTarget?: Record<string, MissingCostCenter[]>;
        error?: string;
      };
      if (!response.ok || !payload.success || !payload.preview) {
        throw new Error(payload.error ?? "No se pudo generar la previsualización");
      }

      setPreview(payload.preview);
      setMissingCostCentersByTarget(payload.missingCostCentersByTarget ?? {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar la previsualización";
      toast.error(message);
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function loadCostCentersForOrg(targetOrgId: string): Promise<CostCenterSummary[]> {
    const response = await fetch(`/api/group-sync/orgs/${targetOrgId}/cost-centers?groupId=${groupId}`, {
      credentials: "include",
    });

    const payload = (await response.json()) as {
      success: boolean;
      costCenters?: CostCenterSummary[];
      error?: string;
    };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? "No se pudieron cargar las sedes");
    }

    return payload.costCenters ?? [];
  }

  async function ensureTargetCostCentersLoaded(targetOrgIdsToLoad: string[]) {
    const missing = targetOrgIdsToLoad.filter((id) => targetCostCentersByOrg[id] === undefined);
    if (missing.length === 0) return;

    try {
      setIsLoadingCostCenters(true);
      const next: Record<string, CostCenterSummary[]> = {};

      await Promise.all(
        missing.map(async (targetOrgId) => {
          next[targetOrgId] = await loadCostCentersForOrg(targetOrgId);
        }),
      );

      setTargetCostCentersByOrg((prev) => ({ ...prev, ...next }));
    } finally {
      setIsLoadingCostCenters(false);
    }
  }

  function setCostCenterMapping(params: {
    targetOrgId: string;
    sourceCostCenterId: string;
    targetCostCenterId: string;
  }) {
    const { targetOrgId, sourceCostCenterId, targetCostCenterId } = params;
    setSelection((prev) => ({
      ...prev,
      calendars: {
        ...prev.calendars,
        costCenterMappingsByOrg: {
          ...(prev.calendars.costCenterMappingsByOrg ?? {}),
          [targetOrgId]: {
            ...(prev.calendars.costCenterMappingsByOrg?.[targetOrgId] ?? {}),
            [sourceCostCenterId]: targetCostCenterId,
          },
        },
      },
    }));
  }

  async function createAndRunJob() {
    try {
      setIsRunning(true);

      const createResponse = await fetch("/api/group-sync/jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          sourceOrgId,
          targetOrgIds,
          selection,
          conflictStrategy,
        }),
      });

      const createPayload = (await createResponse.json()) as { success: boolean; jobId?: string; error?: string };
      if (!createResponse.ok || !createPayload.success || !createPayload.jobId) {
        throw new Error(createPayload.error ?? "No se pudo crear el trabajo");
      }

      setJobId(createPayload.jobId);

      const runResponse = await fetch(`/api/group-sync/jobs/${createPayload.jobId}/run`, {
        method: "POST",
        credentials: "include",
      });
      if (!runResponse.ok) {
        const runPayload = (await runResponse.json()) as { error?: string };
        throw new Error(runPayload.error ?? "No se pudo iniciar el trabajo");
      }

      toast.success("Despliegue iniciado. Puedes dejar esta pestaña abierta para ver el progreso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el despliegue";
      toast.error(message);
      setIsRunning(false);
    }
  }

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch(`/api/group-sync/jobs/${jobId}`, { credentials: "include" });
        const payload = (await response.json()) as { success: boolean; job?: JobPayload; error?: string };

        if (!response.ok || !payload.success || !payload.job) {
          throw new Error(payload.error ?? "No se pudo cargar el estado del trabajo");
        }

        if (cancelled) return;
        setJob(payload.job);

        if (isDoneStatus(payload.job.status)) {
          setIsRunning(false);
          return;
        }

        timer = setTimeout(poll, 1200);
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, 2000);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  const stepTitle = useMemo(() => {
    if (step === 1) return "1) Origen";
    if (step === 2) return "2) Entidades";
    if (step === 3) return "3) Destinos";
    return "4) Conflictos y despliegue";
  }, [step]);

  if (groups.length === 0) {
    return (
      <Card className="rounded-lg border p-6">
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Sin grupos disponibles"
          description="No tienes grupos gestionables o no hay grupos activos para desplegar políticas."
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 @xl/main:grid-cols-3">
      <Card className="rounded-lg border p-6 @xl/main:col-span-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{stepTitle}</h3>
            <p className="text-muted-foreground text-sm">
              Despliegue guiado para estandarizar configuración entre empresas del grupo.
            </p>
          </div>
          <Badge variant="outline">{conflictStrategy}</Badge>
        </div>

        <div className="mt-4">
          <Progress value={job?.progressPercent ?? 0} />
          <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
            <span>Paso {step} de 4</span>
            <span>{job ? `Progreso: ${job.progressPercent}%` : "—"}</span>
          </div>
        </div>

        {/* Paso 1 */}
        {step === 1 ? (
          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label>Grupo</Label>
              <Select
                value={groupId}
                onValueChange={(value) => {
                  setGroupId(value);
                  setOrganizations([]);
                  setSourceOrgId("");
                  setTargetOrgIds([]);
                  setJobId(null);
                  setJob(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Empresa origen</Label>
              <Select value={sourceOrgId} onValueChange={setSourceOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la empresa origen" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Recomendación: usa una empresa “plantilla” como fuente de la verdad.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={!canContinueFromStep1}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Paso 2 */}
        {step === 2 ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3">
              <div className="font-medium">📅 Calendarios y Jornada</div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pkg-calendars"
                  checked={selection.packages.calendars}
                  onCheckedChange={(checked) => {
                    const value = Boolean(checked);
                    setSelection((prev) => ({
                      ...prev,
                      packages: { ...prev.packages, calendars: value },
                    }));
                  }}
                />
                <div className="grid gap-1">
                  <Label htmlFor="pkg-calendars" className="cursor-pointer">
                    Calendarios laborales (festivos)
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Copia calendarios y eventos. Para locales, intentará vincular sedes por código/nombre.
                  </p>
                  {selection.packages.calendars ? (
                    <div className="mt-2 grid gap-3 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="cal-include-local"
                          checked={selection.calendars.includeLocal}
                          onCheckedChange={(checked) =>
                            setSelection((prev) => ({
                              ...prev,
                              calendars: { ...prev.calendars, includeLocal: Boolean(checked) },
                            }))
                          }
                        />
                        <Label htmlFor="cal-include-local" className="cursor-pointer text-sm">
                          Incluir calendarios locales por sede
                        </Label>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-sm">Mapeo de sedes</Label>
                        <Select
                          value={selection.calendars.mapCostCentersBy}
                          onValueChange={(value) =>
                            setSelection((prev) => ({
                              ...prev,
                              calendars: { ...prev.calendars, mapCostCentersBy: value as "CODE" | "NAME" },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CODE">Por código (recomendado)</SelectItem>
                            <SelectItem value="NAME">Por nombre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="font-medium">🛡️ Políticas y RRHH</div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pkg-perms"
                  checked={selection.packages.permissionOverrides}
                  onCheckedChange={(checked) =>
                    setSelection((prev) => ({
                      ...prev,
                      packages: { ...prev.packages, permissionOverrides: Boolean(checked) },
                    }))
                  }
                />
                <div className="grid gap-1">
                  <Label htmlFor="pkg-perms" className="cursor-pointer">
                    Roles y permisos (overrides)
                  </Label>
                  <p className="text-muted-foreground text-xs">Replica los overrides de permisos por rol.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pkg-absence"
                  checked={selection.packages.absenceTypes}
                  onCheckedChange={(checked) =>
                    setSelection((prev) => ({
                      ...prev,
                      packages: { ...prev.packages, absenceTypes: Boolean(checked) },
                    }))
                  }
                />
                <div className="grid gap-1">
                  <Label htmlFor="pkg-absence" className="cursor-pointer">
                    Tipos de ausencia
                  </Label>
                  <p className="text-muted-foreground text-xs">Replica los tipos de ausencia (por code).</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pkg-pto"
                  checked={selection.packages.ptoConfig}
                  onCheckedChange={(checked) =>
                    setSelection((prev) => ({
                      ...prev,
                      packages: { ...prev.packages, ptoConfig: Boolean(checked) },
                    }))
                  }
                />
                <div className="grid gap-1">
                  <Label htmlFor="pkg-pto" className="cursor-pointer">
                    Política de vacaciones (PTO)
                  </Label>
                  <p className="text-muted-foreground text-xs">Replica OrganizationPtoConfig y annualPtoDays.</p>
                </div>
              </div>
            </div>

            {!canContinueFromStep2 ? (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Selecciona al menos un paquete</AlertTitle>
                <AlertDescription>Marca qué políticas/configuración quieres desplegar.</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button variant="outline" onClick={() => setStep(3)} disabled={!canContinueFromStep2}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Paso 3 */}
        {step === 3 ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 @xl/main:flex-row @xl/main:items-end @xl/main:justify-between">
              <div className="grid gap-2">
                <Label>Buscar empresas</Label>
                <Input
                  value={targetsSearch}
                  onChange={(e) => setTargetsSearch(e.target.value)}
                  placeholder="Ej: Barcelona, Sevilla..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const all = organizations.filter((o) => o.id !== sourceOrgId).map((o) => o.id);
                    setTargetOrgIds(all);
                  }}
                >
                  Seleccionar todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTargetOrgIds([])}>
                  Limpiar
                </Button>
                <Badge variant="secondary">{targetOrgIds.length} seleccionadas</Badge>
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Empresa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targetOrgsForSelection.map((org) => {
                    const checked = targetOrgIds.includes(org.id);
                    return (
                      <TableRow key={org.id}>
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const next = Boolean(value);
                              setTargetOrgIds((prev) => {
                                if (next) return prev.includes(org.id) ? prev : [...prev, org.id];
                                return prev.filter((id) => id !== org.id);
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{org.name}</TableCell>
                      </TableRow>
                    );
                  })}
                  {targetOrgsForSelection.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground py-6 text-center">
                        No hay empresas para seleccionar.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {!canContinueFromStep3 ? (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Selecciona al menos una empresa destino</AlertTitle>
                <AlertDescription>El despliegue se aplicará solo a las empresas seleccionadas.</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button variant="outline" onClick={() => setStep(4)} disabled={!canContinueFromStep3}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Paso 4 */}
        {step === 4 ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label>Estrategia de conflictos</Label>
              <RadioGroup value={conflictStrategy} onValueChange={(v) => setConflictStrategy(v as ConflictStrategy)}>
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <RadioGroupItem value="SKIP" id="cs-skip" />
                  <div className="grid gap-1">
                    <Label htmlFor="cs-skip" className="cursor-pointer">
                      Conservador (SKIP)
                    </Label>
                    <p className="text-muted-foreground text-xs">Si ya existe algo equivalente, no se toca.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <RadioGroupItem value="MERGE" id="cs-merge" />
                  <div className="grid gap-1">
                    <Label htmlFor="cs-merge" className="cursor-pointer">
                      Fusión inteligente (MERGE)
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Recomendado. Actualiza configuración y añade elementos faltantes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <RadioGroupItem value="OVERWRITE" id="cs-overwrite" />
                  <div className="grid gap-1">
                    <Label htmlFor="cs-overwrite" className="cursor-pointer">
                      Reemplazo total (OVERWRITE)
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Peligroso. Reemplaza completamente la configuración equivalente en destino.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={loadPreview} disabled={isPreviewLoading}>
                {isPreviewLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Previsualizar
              </Button>
              <Button
                onClick={createAndRunJob}
                disabled={isRunning || !canContinueFromStep3 || mustPreviewBeforeRun || needsCostCenterResolution}
              >
                {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                Ejecutar despliegue
              </Button>
              {jobId ? (
                <Badge variant="outline" className="font-mono text-xs">
                  Job: {jobId}
                </Badge>
              ) : null}
            </div>

            {mustPreviewBeforeRun ? (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Previsualización requerida</AlertTitle>
                <AlertDescription>
                  Has activado calendarios locales por sede. Pulsa <strong>Previsualizar</strong> para detectar sedes
                  sin mapeo antes de ejecutar.
                </AlertDescription>
              </Alert>
            ) : null}

            {Object.keys(missingCostCentersByTarget).length > 0 ? (
              <Card className="rounded-lg border p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium">Resolver sedes (calendarios locales)</h4>
                    <p className="text-muted-foreground text-xs">
                      En algunas empresas destino no se encontró una sede equivalente. Selecciona la sede correcta y
                      vuelve a previsualizar.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await ensureTargetCostCentersLoaded(Object.keys(missingCostCentersByTarget));
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "No se pudieron cargar las sedes";
                        toast.error(message);
                      }
                    }}
                    disabled={isLoadingCostCenters}
                  >
                    {isLoadingCostCenters ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Cargar sedes
                  </Button>
                </div>

                <div className="space-y-4">
                  {Object.entries(missingCostCentersByTarget).map(([targetId, missing]) => {
                    const targetName = organizations.find((org) => org.id === targetId)?.name ?? targetId;
                    const options = targetCostCentersByOrg[targetId] ?? [];

                    return (
                      <div key={targetId} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-medium">{targetName}</div>
                          <Badge variant="outline">{missing.length} sedes</Badge>
                        </div>

                        <div className="space-y-2">
                          {missing.map((sourceCc) => {
                            const mapped =
                              selection.calendars.costCenterMappingsByOrg?.[targetId]?.[sourceCc.sourceCostCenterId] ??
                              "";

                            return (
                              <div
                                key={`${targetId}:${sourceCc.sourceCostCenterId}`}
                                className="grid gap-2 rounded-md border px-3 py-2 @xl/main:grid-cols-2 @xl/main:items-center"
                              >
                                <div className="text-sm">
                                  <div className="font-medium">{sourceCc.name}</div>
                                  <div className="text-muted-foreground text-xs">
                                    Code: {sourceCc.code ?? "—"} · Origen
                                  </div>
                                </div>

                                <div className="grid gap-1">
                                  <Label className="text-xs">Sede destino</Label>
                                  <Select
                                    value={mapped}
                                    onValueChange={(value) =>
                                      setCostCenterMapping({
                                        targetOrgId: targetId,
                                        sourceCostCenterId: sourceCc.sourceCostCenterId,
                                        targetCostCenterId: value,
                                      })
                                    }
                                    disabled={options.length === 0}
                                  >
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={options.length ? "Selecciona sede..." : "Cargar sedes"}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {options.map((cc) => (
                                        <SelectItem key={cc.id} value={cc.id}>
                                          {cc.name} {cc.code ? `(${cc.code})` : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-muted-foreground mt-3 text-xs">
                  Nota: tras resolver sedes, pulsa <strong>Previsualizar</strong> de nuevo para confirmar que no quedan
                  conflictos.
                </div>
              </Card>
            ) : null}

            {preview ? (
              <Card className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Previsualización</h4>
                    <p className="text-muted-foreground text-xs">Resumen por empresa destino.</p>
                  </div>
                  <Badge variant="secondary">{preview.length} empresas</Badge>
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead className="text-right">Crear</TableHead>
                        <TableHead className="text-right">Actualizar</TableHead>
                        <TableHead className="text-right">Omitir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row) => {
                        const all = Object.values(row.summaries);
                        const created = all.reduce((acc, s) => acc + (s?.created ?? 0), 0);
                        const updated = all.reduce((acc, s) => acc + (s?.updated ?? 0), 0);
                        const skipped = all.reduce((acc, s) => acc + (s?.skipped ?? 0), 0);
                        return (
                          <TableRow key={row.targetOrgId}>
                            <TableCell className="font-medium">{row.targetOrgName}</TableCell>
                            <TableCell className="text-right">{created}</TableCell>
                            <TableCell className="text-right">{updated}</TableCell>
                            <TableCell className="text-right">{skipped}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {preview.some((p) => Object.values(p.summaries).some((s) => (s?.warnings?.length ?? 0) > 0)) ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium">Warnings</div>
                    <div className="space-y-2">
                      {preview.map((p) => {
                        const warnings = Object.values(p.summaries).flatMap((s) => s?.warnings ?? []);
                        if (warnings.length === 0) return null;
                        return (
                          <div key={p.targetOrgId} className="text-muted-foreground text-xs">
                            <span className="text-foreground font-medium">{p.targetOrgName}:</span> {warnings[0]}
                            {warnings.length > 1 ? ` (+${warnings.length - 1} más)` : ""}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </Card>
            ) : null}

            {job ? (
              <Card className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Estado del despliegue</h4>
                    <p className="text-muted-foreground text-xs">
                      Origen: {job.sourceOrg.name} · Estado: {job.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/group-sync/jobs/${job.id}`}>Ver detalle</Link>
                    </Button>
                    <Badge variant={job.status === "COMPLETED_WITH_ERRORS" ? "destructive" : "outline"}>
                      {job.status}
                    </Badge>
                  </div>
                </div>

                <Progress value={job.progressPercent ?? 0} />

                <div className="mt-3 rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Detalles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {job.targets.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.targetOrg.name}</TableCell>
                          <TableCell>{t.status}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {t.error
                              ? `Error: ${t.error}`
                              : t.status === "SUCCESS"
                                ? (() => {
                                    const summaries = t.summary as Record<string, PackageSummary> | null;
                                    const all = summaries ? Object.values(summaries) : [];
                                    const created = all.reduce((acc, s) => acc + (s?.created ?? 0), 0);
                                    const updated = all.reduce((acc, s) => acc + (s?.updated ?? 0), 0);
                                    const skipped = all.reduce((acc, s) => acc + (s?.skipped ?? 0), 0);
                                    const warnings = all.flatMap((s) => s?.warnings ?? []);
                                    return `Crear ${created} · Actualizar ${updated} · Omitir ${skipped}${warnings.length ? ` · Warnings ${warnings.length}` : ""}`;
                                  })()
                                : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : null}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(3)} disabled={isRunning}>
                Atrás
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setPreview(null);
                  setJobId(null);
                  setJob(null);
                }}
                disabled={isRunning}
              >
                Reiniciar
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="rounded-lg border p-6">
        <h4 className="font-medium">Resumen</h4>
        <p className="text-muted-foreground mt-1 text-sm">
          Este MVP despliega: overrides de permisos, tipos de ausencia, política PTO y calendarios (opcional).
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Grupo</span>
            <span className="font-medium">{groups.find((g) => g.id === groupId)?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Origen</span>
            <span className="font-medium">{organizations.find((o) => o.id === sourceOrgId)?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Destinos</span>
            <span className="font-medium">{targetOrgIds.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estrategia</span>
            <span className="font-medium">{conflictStrategy}</span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="text-muted-foreground text-xs">Paquetes</div>
          <div className="flex flex-wrap gap-2">
            {selection.packages.permissionOverrides ? <Badge variant="secondary">Permisos</Badge> : null}
            {selection.packages.absenceTypes ? <Badge variant="secondary">Ausencias</Badge> : null}
            {selection.packages.ptoConfig ? <Badge variant="secondary">PTO</Badge> : null}
            {selection.packages.calendars ? <Badge variant="secondary">Calendarios</Badge> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
