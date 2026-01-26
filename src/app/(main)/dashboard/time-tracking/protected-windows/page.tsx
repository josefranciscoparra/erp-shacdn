"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { useReactTable, getCoreRowModel, getPaginationRowModel, type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { deleteProtectedWindow, getProtectedWindows } from "@/server/actions/protected-windows";

import { ProtectedWindowDialog } from "./_components/protected-window-dialog";

type ProtectedWindowRow = Awaited<ReturnType<typeof getProtectedWindows>>[number];

const weekdayLabels: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor(minutes % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${mins}`;
}

export default function ProtectedWindowsPage() {
  const [windows, setWindows] = useState<ProtectedWindowRow[]>([]);
  const [activeTab, setActiveTab] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<ProtectedWindowRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ProtectedWindowRow | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const windowsData = await getProtectedWindows();
      setWindows(windowsData);
    } catch (error) {
      console.error("Error al cargar excepciones de autocierre:", error);
      setWindows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeWindows = useMemo(() => windows.filter((window) => window.isActive), [windows]);
  const visibleWindows = activeTab === "active" ? activeWindows : windows;

  const columns = useMemo<ColumnDef<ProtectedWindowRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            {row.original.description ? (
              <span className="text-muted-foreground line-clamp-1 text-xs">{row.original.description}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "scope",
        header: "Ámbito",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm">{row.original.scope === "EMPLOYEE" ? "Empleado" : "Organización"}</span>
            {row.original.employee ? (
              <span className="text-muted-foreground text-xs">{row.original.employee.name}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "weekdays",
        header: "Días",
        cell: ({ row }) => (
          <span className="text-sm">{(row.original.weekdays || []).map((day) => weekdayLabels[day]).join(", ")}</span>
        ),
      },
      {
        accessorKey: "timeRange",
        header: "Horario",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="text-sm">
              {formatMinutes(row.original.startMinutes)} - {formatMinutes(row.original.endMinutes)}
            </span>
            {row.original.endMinutes <= row.original.startMinutes ? (
              <span className="text-muted-foreground text-xs">Cruza medianoche</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "overrides",
        header: "Ajustes",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.overrideToleranceMinutes ? (
              <Badge variant="secondary">Latencia +{row.original.overrideToleranceMinutes}m</Badge>
            ) : null}
            {row.original.overrideMaxOpenHours ? (
              <Badge variant="secondary">Max {row.original.overrideMaxOpenHours}h</Badge>
            ) : null}
            {!row.original.overrideToleranceMinutes && !row.original.overrideMaxOpenHours ? (
              <span className="text-muted-foreground text-xs">Sin ajustes</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Activa" : "Inactiva"}
          </Badge>
        ),
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
                  setEditingWindow(row.original);
                  setDialogOpen(true);
                }}
              >
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(row.original)}>Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: visibleWindows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProtectedWindow(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      console.error("Error al eliminar excepción:", error);
    }
  };

  return (
    <PermissionGuard
      permission="manage_time_tracking"
      fallback={
        <div className="@container/main flex flex-col gap-6">
          <SectionHeader
            title="Excepciones de autocierre"
            description="Configura ventanas especiales para guardias y cierres operativos."
          />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para gestionar las excepciones de autocierre."
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Excepciones de autocierre"
          description="Define ventanas (guardias/cierres) donde el sistema relaja los límites del autocierre."
          actionLabel="Nueva excepción"
          onAction={() => {
            setEditingWindow(null);
            setDialogOpen(true);
          }}
        />

        <Card className="rounded-lg border p-4">
          <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">¿Qué cambia durante una ventana?</p>
              <p className="text-muted-foreground text-sm">
                Estas reglas solo aplican mientras la hora actual esté dentro del rango configurado.
              </p>
              <p className="text-muted-foreground text-xs">
                Sobrescribe: <span className="font-medium">Latencia de cierre</span> y/o{" "}
                <span className="font-medium">Tiempo máximo de sesión</span>.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/dashboard/settings?tab=validations">Ver configuración base</Link>
            </Button>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
            <div className="flex items-center gap-2">
              <div className="@4xl/main:hidden">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="all">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <TabsList className="hidden @4xl/main:flex">
                <TabsTrigger value="active">
                  Activas <Badge variant="secondary">{activeWindows.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="all">
                  Todas <Badge variant="secondary">{windows.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              <DataTableViewOptions table={table} />
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-4">
            <Card className="overflow-hidden rounded-lg border">
              <DataTable
                table={table}
                columns={columns}
                emptyStateTitle={isLoading ? "Cargando..." : "Sin excepciones"}
                emptyStateDescription={
                  isLoading ? "Cargando configuración..." : "Crea una excepción para guardias o cierres operativos."
                }
              />
            </Card>
            <DataTablePagination table={table} />
          </TabsContent>
        </Tabs>
      </div>

      <ProtectedWindowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editingWindow}
        onSaved={loadData}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar excepción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar &quot;{deleteTarget?.name ?? ""}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PermissionGuard>
  );
}
