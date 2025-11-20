/**
 * Tabla de Zonas de Trabajo
 *
 * Muestra todas las zonas configuradas por lugar de trabajo con opciones para crear, editar y eliminar.
 */

"use client";

import { useMemo, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Pencil, Trash2, MapPin, Users } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Zone } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

export function ZonesTable() {
  const { zones, costCenters, openZoneDialog, deleteZone } = useShiftsStore();

  const [activeTab, setActiveTab] = useState("active");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);

  // Filtrar zonas por estado
  const activeZones = useMemo(() => zones.filter((z) => z.active), [zones]);
  const allZones = useMemo(() => zones, [zones]);

  // Zonas a mostrar según tab activo
  const displayedZones = activeTab === "active" ? activeZones : allZones;

  // Obtener nombre del lugar
  const getCostCenterName = (costCenterId: string) => {
    const cc = costCenters.find((c) => c.id === costCenterId);
    return cc?.name ?? "Desconocido";
  };

  // Handlers
  const handleOpenDeleteDialog = (zone: Zone) => {
    setZoneToDelete(zone);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (zoneToDelete) {
      await deleteZone(zoneToDelete.id);
      setDeleteDialogOpen(false);
      setZoneToDelete(null);
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Zonas de Trabajo</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configura las zonas de trabajo dentro de cada lugar (cocina, barra, etc.)
          </p>
        </div>

        <Button onClick={() => openZoneDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Zona
        </Button>
      </div>

      {/* Tabs con filtros */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          {/* Mobile: Select */}
          <div className="flex @4xl/main:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activas ({activeZones.length})</SelectItem>
                <SelectItem value="all">Todas ({allZones.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: TabsList */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="active" className="gap-2">
              Activas
              <Badge variant="secondary" className="rounded-full">
                {activeZones.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              Todas
              <Badge variant="outline" className="rounded-full">
                {allZones.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {displayedZones.length} {displayedZones.length === 1 ? "zona" : "zonas"}
            </span>
          </div>
        </div>

        {/* Contenido de tabs */}
        <TabsContent value={activeTab} className="space-y-6">
          {displayedZones.length === 0 ? (
            <EmptyZonesState
              variant={activeTab === "active" ? "active" : "all"}
              onCreateZone={() => openZoneDialog()}
            />
          ) : (
            <>
              {/* Agrupar zonas por centro de coste */}
              {Array.from(new Set(displayedZones.map((z) => z.costCenterId))).map((costCenterId) => {
                const zonesInCenter = displayedZones.filter((z) => z.costCenterId === costCenterId);
                const centerName = getCostCenterName(costCenterId);

                return (
                  <div key={costCenterId} className="space-y-3">
                    {/* Header del centro */}
                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg px-4 py-3">
                      <Users className="text-muted-foreground h-5 w-5" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{centerName}</h3>
                        <p className="text-muted-foreground text-sm">
                          {zonesInCenter.length} {zonesInCenter.length === 1 ? "zona" : "zonas"}
                        </p>
                      </div>
                      <Badge variant="outline">{zonesInCenter.length}</Badge>
                    </div>

                    {/* Tabla de zonas del centro */}
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Zona</TableHead>
                            <TableHead className="text-center">Cobertura M/T/N</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead>Creada</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {zonesInCenter.map((zone) => (
                            <TableRow key={zone.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <MapPin className="text-muted-foreground h-4 w-4" />
                                  <span className="font-medium">{zone.name}</span>
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20">
                                    {zone.requiredCoverage.morning}
                                  </Badge>
                                  <span className="text-muted-foreground">/</span>
                                  <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20">
                                    {zone.requiredCoverage.afternoon}
                                  </Badge>
                                  <span className="text-muted-foreground">/</span>
                                  <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/20">
                                    {zone.requiredCoverage.night}
                                  </Badge>
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                <Badge variant={zone.active ? "default" : "secondary"}>
                                  {zone.active ? "Activa" : "Inactiva"}
                                </Badge>
                              </TableCell>

                              <TableCell>
                                <span className="text-muted-foreground text-sm">
                                  {format(zone.createdAt, "d 'de' MMM yyyy", { locale: es })}
                                </span>
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Editar */}
                                  <Button variant="ghost" size="icon-sm" onClick={() => openZoneDialog(zone)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>

                                  {/* Eliminar */}
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleOpenDeleteDialog(zone)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la zona <strong>&quot;{zoneToDelete?.name}&quot;</strong>. Los turnos asignados
              a esta zona NO se eliminarán, pero ya no podrás crear nuevos turnos en ella. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Estado vacío para cuando no hay zonas
 */
interface EmptyZonesStateProps {
  variant: "active" | "all";
  onCreateZone: () => void;
}

function EmptyZonesState({ variant, onCreateZone }: EmptyZonesStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center">
      <MapPin className="text-muted-foreground h-12 w-12" />
      <div>
        <h3 className="text-lg font-semibold">
          {variant === "active" ? "No hay zonas activas" : "No hay zonas creadas"}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {variant === "active"
            ? "Activa una zona existente o crea una nueva para empezar."
            : "Crea tu primera zona de trabajo para organizar turnos por áreas (cocina, barra, etc.)."}
        </p>
      </div>

      {variant === "all" && (
        <Button onClick={onCreateZone}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Primera Zona
        </Button>
      )}
    </div>
  );
}
