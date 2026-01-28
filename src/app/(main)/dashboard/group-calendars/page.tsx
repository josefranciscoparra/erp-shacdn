"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { CalendarDays, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type GroupRow = { id: string; name: string };
type CalendarRow = {
  id: string;
  name: string;
  description: string | null;
  year: number;
  calendarType: string;
  color: string;
  active: boolean;
  applyToAllOrganizations: boolean;
  counts: { events: number; assignments: number };
};

const calendarTypeLabels: Record<string, string> = {
  NATIONAL_HOLIDAY: "Festivos nacionales",
  LOCAL_HOLIDAY: "Festivos locales (por sede)",
  CORPORATE_EVENT: "Eventos corporativos",
  CUSTOM: "Personalizado",
};

export default function GroupCalendarsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const [calendars, setCalendars] = useState<CalendarRow[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newType, setNewType] = useState<"NATIONAL_HOLIDAY" | "LOCAL_HOLIDAY" | "CORPORATE_EVENT" | "CUSTOM">(
    "NATIONAL_HOLIDAY",
  );
  const [newApplyAll, setNewApplyAll] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoadingGroups(true);
        const res = await fetch("/api/group-sync/groups", { credentials: "include" });
        const payload = (await res.json()) as { groups?: GroupRow[]; defaultGroupId?: string | null; error?: string };
        if (!res.ok || !payload.groups) throw new Error(payload.error ?? "No se pudieron cargar los grupos");
        if (cancelled) return;

        setGroups(payload.groups);
        setGroupId((prev) => prev || payload.defaultGroupId || payload.groups[0]?.id || "");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudieron cargar los grupos");
      } finally {
        if (!cancelled) setIsLoadingGroups(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupId) ?? null, [groups, groupId]);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    const loadCalendars = async () => {
      try {
        setIsLoadingCalendars(true);
        const res = await fetch(`/api/group-calendars/groups/${groupId}/calendars`, { credentials: "include" });
        const payload = (await res.json()) as { success?: boolean; calendars?: CalendarRow[]; error?: string };
        if (!res.ok || !payload.calendars) throw new Error(payload.error ?? "No se pudieron cargar los calendarios");
        if (!cancelled) setCalendars(payload.calendars);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudieron cargar los calendarios");
      } finally {
        if (!cancelled) setIsLoadingCalendars(false);
      }
    };

    void loadCalendars();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const createCalendar = async () => {
    if (!groupId) return;
    if (!newName.trim()) {
      toast.error("Introduce un nombre");
      return;
    }

    try {
      setIsCreating(true);
      const res = await fetch(`/api/group-calendars/groups/${groupId}/calendars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName,
          year: newYear,
          calendarType: newType,
          applyToAllOrganizations: newType === "LOCAL_HOLIDAY" ? false : newApplyAll,
        }),
      });
      const payload = (await res.json()) as { success?: boolean; calendarId?: string; error?: string };
      if (!res.ok || !payload.calendarId) throw new Error(payload.error ?? "No se pudo crear el calendario");

      setNewName("");
      const listRes = await fetch(`/api/group-calendars/groups/${groupId}/calendars`, { credentials: "include" });
      const listPayload = (await listRes.json()) as { calendars?: CalendarRow[] };
      setCalendars(listPayload.calendars ?? []);
      toast.success("Calendario corporativo creado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el calendario");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PermissionGuard
      permission="manage_group_configuration"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Calendarios corporativos" subtitle="Gestión centralizada de festivos por grupo" />
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
          subtitle="Crea calendarios a nivel de grupo y asígnalos a empresas y sedes (sin copiar datos)."
        />

        <Card className="rounded-lg border p-6">
          <div className="grid gap-4 @xl/main:grid-cols-3">
            <div className="@xl/main:col-span-1">
              <Label>Grupo</Label>
              {isLoadingGroups ? (
                <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando grupos...
                </div>
              ) : (
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="mt-2">
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
              )}
            </div>

            <div className="@xl/main:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Nuevo calendario</div>
                  <div className="text-muted-foreground text-xs">Crea el “source of truth” del grupo.</div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 @xl/main:grid-cols-4">
                <div className="@xl/main:col-span-2">
                  <Label>Nombre</Label>
                  <Input className="mt-2" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div>
                  <Label>Año</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NATIONAL_HOLIDAY">Festivos nacionales</SelectItem>
                      <SelectItem value="LOCAL_HOLIDAY">Festivos locales (por sede)</SelectItem>
                      <SelectItem value="CORPORATE_EVENT">Eventos corporativos</SelectItem>
                      <SelectItem value="CUSTOM">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-muted-foreground text-xs">
                  {newType === "LOCAL_HOLIDAY"
                    ? "Los locales requieren asignación por empresa y sede."
                    : "Puedes marcarlo como global para que aplique a todas las empresas del grupo."}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={newApplyAll ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setNewApplyAll(true)}
                    disabled={newType === "LOCAL_HOLIDAY"}
                  >
                    Global
                  </Button>
                  <Button
                    type="button"
                    variant={!newApplyAll ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setNewApplyAll(false)}
                    disabled={newType === "LOCAL_HOLIDAY"}
                  >
                    Por asignación
                  </Button>
                  <Button onClick={() => void createCalendar()} disabled={isCreating || !groupId} size="sm">
                    {isCreating ? "Creando..." : "Crear"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-lg border p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-muted-foreground h-4 w-4" />
              <div className="font-medium">Calendarios</div>
              {selectedGroup ? (
                <Badge variant="outline" className="ml-1">
                  {selectedGroup.name}
                </Badge>
              ) : null}
            </div>
          </div>

          {isLoadingCalendars ? (
            <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando calendarios...
            </div>
          ) : calendars.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="text-muted-foreground/40 mx-auto h-12 w-12" />}
              title="Sin calendarios corporativos"
              description="Crea un calendario nacional y uno local por sede (ej. Barcelona) y asígnalos."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Alcance</TableHead>
                    <TableHead>Eventos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calendars.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.year}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {calendarTypeLabels[c.calendarType] ?? c.calendarType}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {c.calendarType === "LOCAL_HOLIDAY"
                          ? `Asignación (${c.counts.assignments})`
                          : c.applyToAllOrganizations
                            ? "Global"
                            : `Asignación (${c.counts.assignments})`}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.counts.events}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/group-calendars/${c.id}`}>Gestionar</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </PermissionGuard>
  );
}
