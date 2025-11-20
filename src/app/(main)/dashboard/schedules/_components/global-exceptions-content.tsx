"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Plus, Trash2, Building2, Briefcase, Globe, Pencil, List, CalendarDays } from "lucide-react";
import { toast } from "sonner";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllGlobalExceptions, deleteExceptionDay } from "@/server/actions/schedules-v2";

import { CreateGlobalExceptionDialog } from "./create-global-exception-dialog";
import { ExceptionsCalendar, type ExceptionForCalendar } from "./exceptions-calendar";

// Mapeo de tipos de excepción
const exceptionTypeLabels: Record<
  string,
  { label: string; color: "default" | "secondary" | "outline" | "destructive" }
> = {
  HOLIDAY: { label: "Festivo", color: "destructive" },
  REDUCED_HOURS: { label: "Jornada Reducida", color: "secondary" },
  SPECIAL_SCHEDULE: { label: "Horario Especial", color: "default" },
  TRAINING: { label: "Formación", color: "outline" },
  EARLY_CLOSURE: { label: "Cierre Anticipado", color: "secondary" },
  CUSTOM: { label: "Personalizado", color: "default" },
};

export function GlobalExceptionsContent() {
  const [exceptions, setExceptions] = useState<Awaited<ReturnType<typeof getAllGlobalExceptions>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [exceptionToEdit, setExceptionToEdit] = useState<Awaited<ReturnType<typeof getAllGlobalExceptions>>[0] | null>(
    null,
  );
  const [currentView, setCurrentView] = useState<"table" | "calendar">("table");

  async function loadExceptions() {
    setIsLoading(true);
    try {
      const data = await getAllGlobalExceptions();
      setExceptions(data);
    } catch (error) {
      console.error("Error loading exceptions:", error);
      toast.error("Error al cargar las excepciones");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadExceptions();
  }, []);

  async function handleDelete() {
    if (!exceptionToDelete) return;

    try {
      const result = await deleteExceptionDay(exceptionToDelete);

      if (result.success) {
        toast.success("Excepción eliminada correctamente");
        loadExceptions();
      } else {
        toast.error(result.error ?? "Error al eliminar la excepción");
      }
    } catch (error) {
      console.error("Error deleting exception:", error);
      toast.error("Error al eliminar la excepción");
    } finally {
      setDeleteDialogOpen(false);
      setExceptionToDelete(null);
    }
  }

  function handleDeleteClick(exceptionId: string) {
    setExceptionToDelete(exceptionId);
    setDeleteDialogOpen(true);
  }

  function handleCreateSuccess() {
    loadExceptions();
    setCreateDialogOpen(false);
  }

  function handleEditClick(exception: Awaited<ReturnType<typeof getAllGlobalExceptions>>[0]) {
    setExceptionToEdit(exception);
    setEditDialogOpen(true);
  }

  function handleEditSuccess() {
    loadExceptions();
    setEditDialogOpen(false);
    setExceptionToEdit(null);
  }

  // Convertir excepciones al formato del calendario
  const exceptionsForCalendar: ExceptionForCalendar[] = exceptions.map((exception) => ({
    id: exception.id,
    date: new Date(exception.date),
    endDate: exception.endDate ? new Date(exception.endDate) : null,
    exceptionType: exception.exceptionType,
    reason: exception.reason,
    isRecurring: exception.isRecurring,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Cargando excepciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con botón de crear */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Excepciones Globales</h3>
          <p className="text-muted-foreground text-sm">
            Festivos, cierres y horarios especiales que afectan a múltiples personas
          </p>
        </div>
        <div className="flex gap-2">
          {/* Toggle de vistas */}
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "table" | "calendar")}>
            <TabsList>
              <TabsTrigger value="table" className="gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendario
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Excepción
          </Button>
        </div>
      </div>

      {/* Vista condicional: tabla o calendario */}
      {currentView === "calendar" ? (
        /* Vista de calendario */
        <ExceptionsCalendar
          exceptions={exceptionsForCalendar}
          onExceptionClick={(exception) => {
            const fullException = exceptions.find((e) => e.id === exception.id);
            if (fullException) {
              handleEditClick(fullException);
            }
          }}
          onCreateException={() => setCreateDialogOpen(true)}
        />
      ) : (
        /* Vista de tabla */
        <>
          {exceptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="text-muted-foreground mb-4 h-12 w-12" />
                <CardTitle className="mb-2">Sin excepciones globales</CardTitle>
                <CardDescription className="text-center">
                  No hay excepciones configuradas para la organización.
                  <br />
                  Crea excepciones globales, por departamento o por centro de costes.
                </CardDescription>
                <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Excepción
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Horarios</TableHead>
                <TableHead>Opciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.map((exception) => {
                const typeInfo = exceptionTypeLabels[exception.exceptionType] ?? {
                  label: exception.exceptionType,
                  color: "default" as const,
                };

                // Determinar alcance
                let scopeIcon = <Globe className="h-4 w-4" />;
                let scopeLabel = "Global";
                if (exception.departmentId && exception.department) {
                  scopeIcon = <Briefcase className="h-4 w-4" />;
                  scopeLabel = exception.department.name;
                } else if (exception.costCenterId && exception.costCenter) {
                  scopeIcon = <Building2 className="h-4 w-4" />;
                  scopeLabel = exception.costCenter.name;
                }

                return (
                  <TableRow key={exception.id}>
                    <TableCell className="font-medium">
                      {format(new Date(exception.date), "dd MMM yyyy", { locale: es })}
                      {exception.endDate && (
                        <>
                          {" - "}
                          {format(new Date(exception.endDate), "dd MMM yyyy", { locale: es })}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {scopeIcon}
                        <span className="text-sm">{scopeLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeInfo.color}>{typeInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{exception.reason ?? "-"}</TableCell>
                    <TableCell>
                      {exception.overrideSlots.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Sin horario (día completo)</span>
                      ) : (
                        <span className="text-sm">
                          {exception.overrideSlots.length} franja{exception.overrideSlots.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {exception.isRecurring && (
                          <Badge variant="outline" className="text-xs">
                            Anual
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(exception)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(exception.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
          )}
        </>
      )}

      {/* Dialog de creación */}
      <CreateGlobalExceptionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Dialog de edición */}
      <CreateGlobalExceptionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
        exceptionToEdit={exceptionToEdit}
      />

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar excepción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la excepción de horario. El registro se mantendrá en el historial para auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
