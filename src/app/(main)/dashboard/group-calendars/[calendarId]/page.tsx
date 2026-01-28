"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CalendarDays, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OrgRow = { id: string; name: string };
type CostCenterRow = { id: string; name: string; code: string | null };

type GroupCalendarEvent = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  endDate: string | null;
  eventType: string;
  isRecurring: boolean;
};

type AssignmentRow = {
  orgId: string;
  orgName: string;
  enabled: boolean;
  costCenters: CostCenterRow[];
};

type CalendarPayload = {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  description: string | null;
  year: number;
  calendarType: string;
  color: string;
  active: boolean;
  applyToAllOrganizations: boolean;
  events: GroupCalendarEvent[];
  organizations: OrgRow[];
  assignments: AssignmentRow[];
};

const eventTypeOptions = [
  { value: "HOLIDAY", label: "Festivo" },
  { value: "CLOSURE", label: "Cierre" },
  { value: "EVENT", label: "Evento" },
  { value: "MEETING", label: "Reunión" },
  { value: "DEADLINE", label: "Fecha límite" },
  { value: "OTHER", label: "Otro" },
];

function toUtcNoonIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).toISOString();
}

export default function GroupCalendarDetailPage() {
  const params = useParams<{ calendarId?: string }>();
  const rawCalendarId = params?.calendarId;
  const calendarId = useMemo(() => (Array.isArray(rawCalendarId) ? rawCalendarId[0] : rawCalendarId), [rawCalendarId]);

  const [calendar, setCalendar] = useState<CalendarPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventType, setNewEventType] = useState("HOLIDAY");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentOrg, setAssignmentOrg] = useState<OrgRow | null>(null);
  const [assignmentIncluded, setAssignmentIncluded] = useState(false);
  const [availableCostCenters, setAvailableCostCenters] = useState<CostCenterRow[]>([]);
  const [selectedCostCenterIds, setSelectedCostCenterIds] = useState<Record<string, boolean>>({});
  const [isLoadingCostCenters, setIsLoadingCostCenters] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const load = async () => {
    if (!calendarId) return;
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/group-calendars/calendars/${calendarId}`, { credentials: "include" });
      const payload = (await res.json()) as { success?: boolean; calendar?: CalendarPayload; error?: string };
      if (!res.ok || !payload.calendar) throw new Error(payload.error ?? "No se pudo cargar el calendario");
      setCalendar(payload.calendar);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el calendario");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarId]);

  const assignmentsByOrgId = useMemo(() => {
    const map = new Map<string, AssignmentRow>();
    (calendar?.assignments ?? []).forEach((a) => map.set(a.orgId, a));
    return map;
  }, [calendar]);

  const openAssignment = async (org: OrgRow) => {
    if (!calendar) return;
    setAssignmentOrg(org);
    setAvailableCostCenters([]);
    setSelectedCostCenterIds({});
    setAssignmentDialogOpen(true);

    const existing = assignmentsByOrgId.get(org.id);
    setAssignmentIncluded(existing?.enabled ?? false);

    if (calendar.calendarType !== "LOCAL_HOLIDAY") return;

    try {
      setIsLoadingCostCenters(true);
      const res = await fetch(`/api/group-sync/orgs/${org.id}/cost-centers?groupId=${calendar.groupId}`, {
        credentials: "include",
      });
      const payload = (await res.json()) as { success?: boolean; costCenters?: CostCenterRow[]; error?: string };
      if (!res.ok || !payload.costCenters) throw new Error(payload.error ?? "No se pudieron cargar las sedes");
      setAvailableCostCenters(payload.costCenters);

      const initial: Record<string, boolean> = {};
      (existing?.costCenters ?? []).forEach((cc) => {
        initial[cc.id] = true;
      });
      setSelectedCostCenterIds(initial);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron cargar las sedes");
    } finally {
      setIsLoadingCostCenters(false);
    }
  };

  const saveAssignment = async () => {
    if (!calendar || !assignmentOrg) return;
    try {
      setIsSavingAssignment(true);

      const costCenterIds = Object.entries(selectedCostCenterIds)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const res = await fetch(`/api/group-calendars/calendars/${calendar.id}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId: assignmentOrg.id,
          enabled: calendar.calendarType === "LOCAL_HOLIDAY" ? true : assignmentIncluded,
          costCenterIds: calendar.calendarType === "LOCAL_HOLIDAY" ? costCenterIds : undefined,
        }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo guardar la asignación");

      toast.success("Asignación guardada");
      setAssignmentDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la asignación");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const createEvent = async () => {
    if (!calendarId) return;
    if (!newEventName.trim() || !newEventDate) {
      toast.error("Nombre y fecha son obligatorios");
      return;
    }
    try {
      setIsCreatingEvent(true);
      const res = await fetch(`/api/group-calendars/calendars/${calendarId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newEventName,
          date: toUtcNoonIso(newEventDate),
          eventType: newEventType,
          isRecurring: false,
        }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo crear el evento");

      setNewEventName("");
      setNewEventDate("");
      toast.success("Evento creado");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el evento");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!calendarId) return;
    try {
      const res = await fetch(`/api/group-calendars/calendars/${calendarId}/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo eliminar el evento");
      toast.success("Evento eliminado");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el evento");
    }
  };

  return (
    <PermissionGuard
      permission="manage_group_configuration"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Calendarios corporativos" subtitle="Detalle" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para gestionar calendarios corporativos."
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Calendarios corporativos"
          subtitle={calendar ? `${calendar.groupName} · ${calendar.name}` : "Detalle"}
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard/group-calendars">Volver</Link>
            </Button>
          }
        />

        {isLoading ? (
          <Card className="rounded-lg border p-6">
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando calendario...
            </div>
          </Card>
        ) : error ? (
          <Card className="rounded-lg border p-6">
            <EmptyState
              icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
              title="No se pudo cargar el calendario"
              description={error}
            />
          </Card>
        ) : !calendar ? null : (
          <Card className="rounded-lg border p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border">
                  <CalendarDays className="text-muted-foreground h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">{calendar.name}</div>
                    <Badge variant="outline">{calendar.year}</Badge>
                    <Badge variant="secondary">{calendar.calendarType}</Badge>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {calendar.calendarType === "LOCAL_HOLIDAY"
                      ? "Local por sede (requiere asignación por empresa y sedes)."
                      : calendar.applyToAllOrganizations
                        ? "Global (aplica a todas las empresas del grupo)."
                        : "Por asignación (elige qué empresas lo reciben). Nota: este tipo no mapea sedes; si quieres Barcelona por centros, usa LOCAL_HOLIDAY."}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Tabs defaultValue="events">
                <TabsList>
                  <TabsTrigger value="events">Eventos</TabsTrigger>
                  <TabsTrigger value="assignments">Asignación</TabsTrigger>
                </TabsList>

                <TabsContent value="events" className="mt-4">
                  <div className="grid gap-4 @xl/main:grid-cols-5">
                    <div className="@xl/main:col-span-2">
                      <Label>Nombre</Label>
                      <Input className="mt-2" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input
                        className="mt-2"
                        type="date"
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={newEventType} onValueChange={setNewEventType}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypeOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button onClick={() => void createEvent()} disabled={isCreatingEvent}>
                        {isCreatingEvent ? "Creando..." : "Añadir"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calendar.events.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-muted-foreground py-10 text-center text-sm">
                              Sin eventos todavía.
                            </TableCell>
                          </TableRow>
                        ) : (
                          calendar.events.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="text-muted-foreground text-xs">
                                {new Date(e.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-medium">{e.name}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{e.eventType}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => void deleteEvent(e.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="assignments" className="mt-4">
                  {calendar.applyToAllOrganizations && calendar.calendarType !== "LOCAL_HOLIDAY" ? (
                    <div className="text-muted-foreground text-sm">
                      Este calendario es global: se aplica automáticamente a todas las empresas del grupo.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Detalle</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calendar.organizations.map((org) => {
                            const a = assignmentsByOrgId.get(org.id) ?? null;
                            const mappedCount = a?.costCenters.length ?? 0;
                            const isOk =
                              calendar.calendarType === "LOCAL_HOLIDAY" ? mappedCount > 0 : (a?.enabled ?? false);

                            return (
                              <TableRow key={org.id}>
                                <TableCell className="font-medium">{org.name}</TableCell>
                                <TableCell>
                                  {calendar.calendarType === "LOCAL_HOLIDAY" ? (
                                    <Badge variant={isOk ? "success" : "warning"}>{isOk ? "OK" : "Sin sedes"}</Badge>
                                  ) : (
                                    <Badge variant={isOk ? "success" : "warning"}>
                                      {isOk ? "Incluida" : "No incluida"}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                  {calendar.calendarType === "LOCAL_HOLIDAY"
                                    ? mappedCount > 0
                                      ? `${mappedCount} sedes mapeadas`
                                      : "Sin sedes asignadas"
                                    : a?.enabled
                                      ? "Incluida"
                                      : "No incluida"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm" onClick={() => void openAssignment(org)}>
                                    {calendar.calendarType === "LOCAL_HOLIDAY" ? "Mapear sedes" : "Configurar"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        )}
      </div>

      <Dialog
        open={assignmentDialogOpen}
        onOpenChange={(open) => {
          setAssignmentDialogOpen(open);
          if (!open) {
            setAssignmentOrg(null);
            setAssignmentIncluded(false);
            setAvailableCostCenters([]);
            setSelectedCostCenterIds({});
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {calendar?.calendarType === "LOCAL_HOLIDAY" ? "Mapear sedes" : "Asignación"}
              {assignmentOrg ? ` · ${assignmentOrg.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          {!calendar || !assignmentOrg ? null : calendar.calendarType === "LOCAL_HOLIDAY" ? (
            <div className="space-y-3">
              <div className="text-muted-foreground text-sm">
                Selecciona qué sedes (centros de trabajo) de esta empresa deben recibir este calendario local.
              </div>

              {isLoadingCostCenters ? (
                <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando sedes...
                </div>
              ) : availableCostCenters.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="text-muted-foreground/40 mx-auto h-12 w-12" />}
                  title="Sin sedes"
                  description="Esta empresa no tiene sedes activas."
                />
              ) : (
                <div className="grid gap-2">
                  {availableCostCenters.map((cc) => {
                    const checked = Boolean(selectedCostCenterIds[cc.id]);
                    return (
                      <label
                        key={cc.id}
                        className="flex cursor-pointer items-center justify-between rounded-md border p-3"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{cc.name}</span>
                          <span className="text-muted-foreground text-xs">{cc.code ?? "—"}</span>
                        </div>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setSelectedCostCenterIds((prev) => ({ ...prev, [cc.id]: Boolean(v) }));
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-muted-foreground text-sm">
                Para calendarios no locales, basta con incluir o excluir la empresa.
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Incluir empresa</div>
                  <div className="text-muted-foreground text-xs">
                    Si no está incluida, no verá los eventos de grupo.
                  </div>
                </div>
                <Checkbox checked={assignmentIncluded} onCheckedChange={(v) => setAssignmentIncluded(Boolean(v))} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)} disabled={isSavingAssignment}>
              Cancelar
            </Button>
            <Button onClick={() => void saveAssignment()} disabled={isSavingAssignment || !calendar || !assignmentOrg}>
              {isSavingAssignment ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
