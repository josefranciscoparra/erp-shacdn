"use client";

import { useEffect, useMemo, useState } from "react";

import { useReactTable, getCoreRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table";
import { eachDayOfInterval, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, MoreHorizontal, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmployeesForFilter } from "@/server/actions/admin-time-tracking";
import {
  cancelOnCallSchedule,
  createOnCallIntervention,
  createOnCallSchedule,
  getOnCallInterventions,
  getOnCallSchedules,
  rejectOnCallIntervention,
  updateOnCallIntervention,
  updateOnCallSchedule,
} from "@/server/actions/on-call";

import { OnCallInterventionDialog } from "./_components/on-call-intervention-dialog";
import { OnCallScheduleDialog } from "./_components/on-call-schedule-dialog";

type ScheduleRow = Awaited<ReturnType<typeof getOnCallSchedules>>[number];
type InterventionRow = Awaited<ReturnType<typeof getOnCallInterventions>>[number];

export default function OnCallPage() {
  const [activeTab, setActiveTab] = useState("schedules");
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [interventionDialogOpen, setInterventionDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null);
  const [editingIntervention, setEditingIntervention] = useState<InterventionRow | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [scheduleData, interventionData, employeeData] = await Promise.all([
        getOnCallSchedules(),
        getOnCallInterventions(),
        getEmployeesForFilter(),
      ]);
      setSchedules(scheduleData);
      setInterventions(interventionData);
      setEmployees(employeeData);
    } catch (error) {
      console.error("Error cargando guardias:", error);
      setSchedules([]);
      setInterventions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const calendarData = useMemo(() => {
    const scheduleMap = new Map<string, ScheduleRow[]>();
    const dates = new Set<string>();

    for (const schedule of schedules) {
      const start = startOfDay(new Date(schedule.startAt));
      const end = startOfDay(new Date(schedule.endAt));
      const days = eachDayOfInterval({ start, end });

      for (const day of days) {
        const key = format(day, "yyyy-MM-dd");
        dates.add(key);
        const list = scheduleMap.get(key) ?? [];
        list.push(schedule);
        scheduleMap.set(key, list);
      }
    }

    return {
      scheduleMap,
      dates: Array.from(dates).map((key) => new Date(key)),
    };
  }, [schedules]);

  const selectedCalendarKey = calendarDate ? format(calendarDate, "yyyy-MM-dd") : null;
  const selectedSchedules = selectedCalendarKey ? (calendarData.scheduleMap.get(selectedCalendarKey) ?? []) : [];

  const scheduleColumns = useMemo<ColumnDef<ScheduleRow>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Empleado",
        cell: ({ row }) => {
          if (row.original.scope === "ORGANIZATION") {
            return (
              <div className="flex flex-col">
                <span className="font-medium">Organización</span>
                <span className="text-muted-foreground text-xs">Guardia general</span>
              </div>
            );
          }

          return (
            <div className="flex flex-col">
              <span className="font-medium">{row.original.employee?.name ?? "Sin empleado"}</span>
              <span className="text-muted-foreground text-xs">{row.original.employee?.email ?? ""}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "startAt",
        header: "Inicio",
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.original.startAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
          </span>
        ),
      },
      {
        accessorKey: "endAt",
        header: "Fin",
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.original.endAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "CANCELLED" ? "secondary" : "default"}>
            {row.original.status === "CANCELLED" ? "Cancelada" : "Programada"}
          </Badge>
        ),
      },
      {
        accessorKey: "compensation",
        header: "Compensación",
        cell: ({ row }) => {
          const type = row.original.availabilityCompensationType;
          if (type === "NONE") {
            return <span className="text-muted-foreground text-sm">Sin compensación</span>;
          }

          const parts: string[] = [];
          if (type === "TIME" || type === "MIXED") {
            const minutes = row.original.availabilityCompensationMinutes ?? 0;
            parts.push(`${minutes} min`);
          }
          if (type === "PAY" || type === "MIXED") {
            const amount = Number(row.original.availabilityCompensationAmount ?? 0);
            const currency = row.original.availabilityCompensationCurrency ?? "EUR";
            parts.push(new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount));
          }

          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{parts.join(" + ")}</span>
              {row.original.allowance && (
                <span className="text-muted-foreground text-xs">
                  {row.original.allowance.status === "SETTLED"
                    ? "Liquidada"
                    : row.original.allowance.status === "CANCELLED"
                      ? "Cancelada"
                      : "Pendiente"}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "interventionCount",
        header: "Intervenciones",
        cell: ({ row }) => <span className="text-sm">{row.original.interventionCount}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setEditingSchedule(row.original);
                  setScheduleDialogOpen(true);
                }}
              >
                Editar
              </DropdownMenuItem>
              {row.original.status !== "CANCELLED" && (
                <DropdownMenuItem
                  onClick={async () => {
                    await cancelOnCallSchedule(row.original.id);
                    await loadData();
                  }}
                >
                  Cancelar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const interventionColumns = useMemo<ColumnDef<InterventionRow>[]>(
    () => [
      {
        accessorKey: "employee",
        header: "Empleado",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.employee?.name ?? "Sin empleado"}</span>
            <span className="text-muted-foreground text-xs">{row.original.employee?.email ?? ""}</span>
          </div>
        ),
      },
      {
        accessorKey: "startAt",
        header: "Inicio",
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.original.startAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
          </span>
        ),
      },
      {
        accessorKey: "endAt",
        header: "Fin",
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.original.endAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === "PENDING_APPROVAL") {
            return (
              <Badge variant="secondary" className="gap-1">
                Pendiente
              </Badge>
            );
          }
          if (status === "APPROVED") {
            return <Badge variant="default">Aprobada</Badge>;
          }
          if (status === "REJECTED") {
            return <Badge variant="secondary">Rechazada</Badge>;
          }
          return <Badge variant="default">Registrada</Badge>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setEditingIntervention(row.original);
                  setInterventionDialogOpen(true);
                }}
              >
                Editar
              </DropdownMenuItem>
              {row.original.status !== "REJECTED" && (
                <DropdownMenuItem
                  onClick={async () => {
                    await rejectOnCallIntervention(row.original.id);
                    await loadData();
                  }}
                >
                  Rechazar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const schedulesTable = useReactTable({
    data: schedules,
    columns: scheduleColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const interventionsTable = useReactTable({
    data: interventions,
    columns: interventionColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <PermissionGuard
      permission="manage_time_tracking"
      fallback={
        <div className="@container/main flex flex-col gap-6">
          <SectionHeader title="Guardias" description="Gestiona guardias e intervenciones." />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para gestionar guardias."
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Guardias e intervenciones"
          description="Planifica guardias y registra intervenciones reales."
          actionLabel={activeTab === "interventions" ? "Nueva intervención" : "Nueva guardia"}
          onAction={() => {
            if (activeTab === "interventions") {
              setEditingIntervention(null);
              setInterventionDialogOpen(true);
            } else {
              setEditingSchedule(null);
              setScheduleDialogOpen(true);
            }
          }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
            <div className="@4xl/main:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedules">Guardias</SelectItem>
                  <SelectItem value="interventions">Intervenciones</SelectItem>
                  <SelectItem value="calendar">Calendario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsList className="hidden @4xl/main:flex">
              <TabsTrigger value="schedules">
                Guardias <Badge variant="secondary">{schedules.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="interventions">
                Intervenciones <Badge variant="secondary">{interventions.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="calendar">Calendario</TabsTrigger>
            </TabsList>

            {activeTab !== "calendar" && (
              <div className="flex items-center gap-2">
                <DataTableViewOptions table={activeTab === "schedules" ? schedulesTable : interventionsTable} />
              </div>
            )}
          </div>

          <TabsContent value="schedules" className="mt-4">
            <Card className="overflow-hidden rounded-lg border">
              <DataTable
                table={schedulesTable}
                columns={scheduleColumns}
                emptyStateTitle={isLoading ? "Cargando..." : "Sin guardias programadas"}
                emptyStateDescription={isLoading ? "Cargando guardias..." : "Añade una nueva guardia para empezar."}
              />
            </Card>
            <DataTablePagination table={schedulesTable} />
          </TabsContent>

          <TabsContent value="interventions" className="mt-4">
            <Card className="overflow-hidden rounded-lg border">
              <DataTable
                table={interventionsTable}
                columns={interventionColumns}
                emptyStateTitle={isLoading ? "Cargando..." : "Sin intervenciones registradas"}
                emptyStateDescription={isLoading ? "Cargando intervenciones..." : "Registra una intervención real."}
              />
            </Card>
            <DataTablePagination table={interventionsTable} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="grid gap-4 @4xl/main:grid-cols-[320px_1fr]">
              <Card className="p-4">
                <UiCalendar
                  mode="single"
                  selected={calendarDate}
                  onSelect={setCalendarDate}
                  locale={es}
                  modifiers={{ hasOnCall: calendarData.dates }}
                  modifiersClassNames={{
                    hasOnCall: "bg-primary/10 text-primary font-semibold",
                  }}
                />
              </Card>

              <Card className="flex flex-col gap-4 p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">
                    {calendarDate ? format(calendarDate, "PPP", { locale: es }) : "Selecciona una fecha"}
                  </span>
                </div>

                {selectedSchedules.length === 0 ? (
                  <EmptyState
                    icon={<CalendarDays className="text-muted-foreground mx-auto h-10 w-10" />}
                    title="Sin guardias"
                    description="No hay guardias programadas para este día."
                  />
                ) : (
                  <div className="space-y-3">
                    {selectedSchedules.map((schedule) => {
                      const hasCompensation = schedule.availabilityCompensationType !== "NONE";
                      const compParts: string[] = [];

                      if (
                        schedule.availabilityCompensationType === "TIME" ||
                        schedule.availabilityCompensationType === "MIXED"
                      ) {
                        compParts.push(`${schedule.availabilityCompensationMinutes ?? 0} min`);
                      }
                      if (
                        schedule.availabilityCompensationType === "PAY" ||
                        schedule.availabilityCompensationType === "MIXED"
                      ) {
                        const amount = Number(schedule.availabilityCompensationAmount ?? 0);
                        const currency = schedule.availabilityCompensationCurrency ?? "EUR";
                        compParts.push(new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount));
                      }

                      return (
                        <div key={schedule.id} className="rounded-lg border p-3">
                          <div className="flex flex-col gap-2 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
                            <div>
                              <p className="font-medium">
                                {schedule.scope === "ORGANIZATION"
                                  ? "Organización"
                                  : (schedule.employee?.name ?? "Sin empleado")}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {format(new Date(schedule.startAt), "Pp", { locale: es })} →{" "}
                                {format(new Date(schedule.endAt), "Pp", { locale: es })}
                              </p>
                            </div>
                            <Badge variant={schedule.status === "CANCELLED" ? "secondary" : "default"}>
                              {schedule.status === "CANCELLED" ? "Cancelada" : "Programada"}
                            </Badge>
                          </div>

                          {hasCompensation && (
                            <p className="text-muted-foreground mt-2 text-xs">Compensación: {compParts.join(" + ")}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <OnCallScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        employees={employees}
        initialData={editingSchedule}
        onSave={async (payload) => {
          if (editingSchedule) {
            await updateOnCallSchedule(editingSchedule.id, payload);
          } else {
            await createOnCallSchedule(payload);
          }
          await loadData();
        }}
      />

      <OnCallInterventionDialog
        open={interventionDialogOpen}
        onOpenChange={setInterventionDialogOpen}
        employees={employees}
        schedules={schedules}
        initialData={editingIntervention}
        onSave={async (payload) => {
          if (editingIntervention) {
            await updateOnCallIntervention(editingIntervention.id, payload);
          } else {
            await createOnCallIntervention(payload);
          }
          await loadData();
        }}
      />
    </PermissionGuard>
  );
}
