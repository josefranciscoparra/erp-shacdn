"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Loader2, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PackageSummary = {
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
  changes?: Array<Record<string, unknown>>;
};

type JobTarget = {
  id: string;
  status: string;
  summary: Record<string, PackageSummary> | null;
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

export default function GroupSyncJobPage() {
  const params = useParams<{ jobId?: string }>();
  const rawJobId = params?.jobId;
  const jobId = useMemo(() => (Array.isArray(rawJobId) ? rawJobId[0] : rawJobId), [rawJobId]);

  const [job, setJob] = useState<JobPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/group-sync/jobs/${jobId}`, { credentials: "include" });
        const payload = (await response.json()) as { success: boolean; job?: JobPayload; error?: string };

        if (!response.ok || !payload.success || !payload.job) {
          throw new Error(payload.error ?? "No se pudo cargar el trabajo");
        }

        if (!cancelled) {
          setJob(payload.job);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el trabajo");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <PermissionGuard
      permission="manage_group_configuration"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Despliegue de políticas" subtitle="Detalle de ejecución" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver este despliegue."
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Despliegue de políticas"
          subtitle="Qué se ha hecho y qué no (por empresa)"
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard/group-sync">Volver al asistente</Link>
            </Button>
          }
        />

        {isLoading ? (
          <Card className="rounded-lg border p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              <span className="text-muted-foreground ml-2">Cargando trabajo...</span>
            </div>
          </Card>
        ) : error ? (
          <Card className="rounded-lg border p-6">
            <EmptyState
              icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
              title="No se pudo cargar el trabajo"
              description={error}
            />
          </Card>
        ) : !job ? (
          <Card className="rounded-lg border p-6">
            <EmptyState
              icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
              title="Trabajo no encontrado"
              description="No existe o no tienes acceso."
            />
          </Card>
        ) : job ? (
          <>
            <div className="grid gap-4 @xl/main:grid-cols-3">
              <Card className="rounded-lg border p-6 @xl/main:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Job</div>
                    <div className="font-mono text-xs">{job.id}</div>
                    <div className="text-muted-foreground mt-1 text-sm">
                      Origen: <span className="text-foreground font-medium">{job.sourceOrg.name}</span>
                    </div>
                  </div>
                  <Badge variant={job.status === "COMPLETED_WITH_ERRORS" ? "destructive" : "outline"}>
                    {job.status}
                  </Badge>
                </div>

                <div className="mt-4">
                  <Progress value={job.progressPercent ?? 0} />
                  <div className="text-muted-foreground mt-2 text-xs">
                    Progreso: {job.progressPercent}% · Estrategia: {job.conflictStrategy}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Resumen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {job.targets.map((t) => {
                        const summaries = t.summary ?? {};
                        const all = Object.values(summaries);
                        const created = all.reduce((acc, s) => acc + (s?.created ?? 0), 0);
                        const updated = all.reduce((acc, s) => acc + (s?.updated ?? 0), 0);
                        const skipped = all.reduce((acc, s) => acc + (s?.skipped ?? 0), 0);
                        const warnings = all.flatMap((s) => s?.warnings ?? []);

                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.targetOrg.name}</TableCell>
                            <TableCell>{t.status}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {t.error
                                ? `Error: ${t.error}`
                                : `Crear ${created} · Actualizar ${updated} · Omitir ${skipped}${warnings.length ? ` · Warnings ${warnings.length}` : ""}`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {job.targets.some((t) => Object.values(t.summary ?? {}).some((s) => (s?.warnings?.length ?? 0) > 0)) ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium">Warnings (detalle)</div>
                    <div className="space-y-2">
                      {job.targets.map((t) => {
                        const warnings = Object.values(t.summary ?? {}).flatMap((s) => s?.warnings ?? []);
                        if (warnings.length === 0) return null;
                        return (
                          <div key={t.id} className="text-muted-foreground text-xs">
                            <span className="text-foreground font-medium">{t.targetOrg.name}:</span> {warnings[0]}
                            {warnings.length > 1 ? ` (+${warnings.length - 1} más)` : ""}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </Card>

              <Card className="rounded-lg border p-6">
                <h4 className="font-medium">Información</h4>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Empresas destino</span>
                    <span className="font-medium">{job.targets.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estrategia</span>
                    <span className="font-medium">{job.conflictStrategy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Inicio</span>
                    <span className="font-medium">
                      {job.startedAt ? new Date(job.startedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fin</span>
                    <span className="font-medium">
                      {job.finishedAt ? new Date(job.finishedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="rounded-lg border p-6">
              <h4 className="font-medium">Detalle por empresa</h4>
              <p className="text-muted-foreground mt-1 text-sm">
                Para entender por qué “Actualizar” puede no verse en UI (por ejemplo, MERGE con 0 eventos nuevos), aquí
                tienes el detalle de qué se tocó.
              </p>

              <div className="mt-4 rounded-lg border">
                <Accordion type="multiple">
                  {job.targets.map((t) => {
                    const summaries: Record<string, PackageSummary> = t.summary ?? {};
                    const enabledPackages = ["calendars", "absenceTypes", "ptoConfig", "permissionOverrides"].filter(
                      (key) => Boolean(job.selection?.packages?.[key]),
                    );

                    const firstTab = enabledPackages[0] ?? "calendars";

                    return (
                      <AccordionItem key={t.id} value={t.id} className="px-4">
                        <AccordionTrigger>
                          <div className="flex w-full items-center justify-between gap-3">
                            <div className="text-sm font-medium">{t.targetOrg.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant={t.status === "FAILED" ? "destructive" : "outline"}>{t.status}</Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {t.error ? (
                            <div className="text-muted-foreground text-sm">Error: {t.error}</div>
                          ) : enabledPackages.length === 0 ? (
                            <div className="text-muted-foreground text-sm">
                              Este job no tenía paquetes seleccionados.
                            </div>
                          ) : (
                            <Tabs defaultValue={firstTab}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <TabsList className="flex flex-wrap">
                                  {enabledPackages.map((key) => (
                                    <TabsTrigger key={key} value={key}>
                                      {key === "calendars"
                                        ? "Calendarios"
                                        : key === "absenceTypes"
                                          ? "Tipos de ausencia"
                                          : key === "ptoConfig"
                                            ? "PTO"
                                            : "Permisos"}
                                    </TabsTrigger>
                                  ))}
                                </TabsList>
                              </div>

                              {enabledPackages.map((key) => {
                                const s = summaries[key];
                                const changes = Array.isArray(s?.changes) ? s.changes : null;

                                return (
                                  <TabsContent key={key} value={key} className="mt-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="text-muted-foreground text-xs">
                                        Crear {s?.created ?? 0} · Actualizar {s?.updated ?? 0} · Omitir{" "}
                                        {s?.skipped ?? 0}
                                        {(s?.warnings?.length ?? 0) > 0 ? ` · Warnings ${s?.warnings.length}` : ""}
                                      </div>
                                    </div>

                                    {changes === null ? (
                                      <div className="text-muted-foreground mt-3 text-sm">
                                        Este job no guardó detalle por entidad (solo contadores). Si quieres ver
                                        exactamente qué se tocó, repite el despliegue.
                                      </div>
                                    ) : changes.length === 0 ? (
                                      <div className="text-muted-foreground mt-3 text-sm">
                                        Sin cambios en este paquete.
                                      </div>
                                    ) : (
                                      <div className="mt-3 overflow-hidden rounded-lg border">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Acción</TableHead>
                                              <TableHead>Elemento</TableHead>
                                              <TableHead>Detalle</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {changes.map((row, idx) => {
                                              const action = String(row.action ?? "—");
                                              const actionVariant =
                                                action === "CREATED"
                                                  ? "outline"
                                                  : action === "UPDATED"
                                                    ? "outline"
                                                    : "secondary";

                                              if (key === "absenceTypes") {
                                                return (
                                                  <TableRow key={`${idx}-${action}`}>
                                                    <TableCell>
                                                      <Badge variant={actionVariant}>{action}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                      {String(row.code ?? "—")}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">
                                                      {String(row.name ?? "—")}
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              }

                                              if (key === "permissionOverrides") {
                                                return (
                                                  <TableRow key={`${idx}-${action}`}>
                                                    <TableCell>
                                                      <Badge variant={actionVariant}>{action}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                      {String(row.role ?? "—")}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">
                                                      Overrides por rol
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              }

                                              if (key === "ptoConfig") {
                                                return (
                                                  <TableRow key={`${idx}-${action}`}>
                                                    <TableCell>
                                                      <Badge variant={actionVariant}>{action}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">Política PTO</TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">
                                                      {`Vacaciones anuales: ${String(row.annualPtoDays ?? "—")} · Carryover: ${String(row.carryoverMode ?? "—")}`}
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              }

                                              // calendars
                                              const sourceCC = row.sourceCostCenter as {
                                                name?: string;
                                                code?: string | null;
                                              } | null;
                                              const targetCC = row.targetCostCenter as {
                                                name?: string;
                                                code?: string | null;
                                              } | null;
                                              const ccText = sourceCC
                                                ? `${sourceCC.code ?? "—"} · ${sourceCC.name ?? "—"} → ${targetCC ? `${targetCC.code ?? "—"} · ${targetCC.name ?? "—"}` : "—"}`
                                                : "Global";
                                              const eventsAdded =
                                                typeof row.eventsAdded === "number"
                                                  ? ` · +${row.eventsAdded} eventos`
                                                  : "";
                                              const reason = row.reason ? ` · ${String(row.reason)}` : "";

                                              return (
                                                <TableRow key={`${idx}-${action}`}>
                                                  <TableCell>
                                                    <Badge variant={actionVariant}>{action}</Badge>
                                                  </TableCell>
                                                  <TableCell className="font-medium">
                                                    {`${String(row.name ?? "—")} (${String(row.year ?? "—")})`}
                                                  </TableCell>
                                                  <TableCell className="text-muted-foreground text-xs">
                                                    {`${ccText}${eventsAdded}${reason}`}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    )}

                                    {(s?.warnings?.length ?? 0) > 0 ? (
                                      <div className="mt-3 space-y-1">
                                        <div className="text-sm font-medium">Warnings</div>
                                        <div className="space-y-1">
                                          {s.warnings.map((w, i) => (
                                            <div key={`${key}-w-${i}`} className="text-muted-foreground text-xs">
                                              {w}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </TabsContent>
                                );
                              })}
                            </Tabs>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </PermissionGuard>
  );
}
