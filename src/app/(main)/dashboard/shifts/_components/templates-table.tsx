/**
 * Tabla de Plantillas de Turnos
 *
 * Muestra todas las plantillas rotativas disponibles con opciones para crear, editar, aplicar y eliminar.
 */

"use client";

import { useMemo, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Pencil, Trash2, Play, Copy, Calendar } from "lucide-react";

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
import { cn } from "@/lib/utils";

import type { ShiftTemplate, ShiftType } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

export function TemplatesTable() {
  const { templates, deleteTemplate } = useShiftsStore();

  const [activeTab, setActiveTab] = useState("active");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ShiftTemplate | null>(null);

  // Filtrar plantillas por estado
  const activeTemplates = useMemo(() => templates.filter((t) => t.active), [templates]);
  const allTemplates = useMemo(() => templates, [templates]);

  // Plantillas a mostrar según tab activo
  const displayedTemplates = activeTab === "active" ? activeTemplates : allTemplates;

  // Handlers
  const handleOpenDeleteDialog = (template: ShiftTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleCreateTemplate = () => {
    // TODO: Abrir modal de creación de plantilla (TemplateDialog)
    console.log("Crear nueva plantilla");
  };

  const handleEditTemplate = (template: ShiftTemplate) => {
    // TODO: Abrir modal de edición de plantilla (TemplateDialog)
    console.log("Editar plantilla:", template.id);
  };

  const handleApplyTemplate = (template: ShiftTemplate) => {
    // TODO: Abrir modal de aplicación de plantilla (TemplateApplyDialog)
    console.log("Aplicar plantilla:", template.id);
  };

  const handleDuplicateTemplate = (template: ShiftTemplate) => {
    // TODO: Implementar duplicación de plantilla
    console.log("Duplicar plantilla:", template.id);
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Plantillas de Turnos</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Crea plantillas rotativas para asignar turnos de forma masiva
          </p>
        </div>

        <Button onClick={handleCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
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
                <SelectItem value="active">Activas ({activeTemplates.length})</SelectItem>
                <SelectItem value="all">Todas ({allTemplates.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: TabsList */}
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="active" className="gap-2">
              Activas
              <Badge variant="secondary" className="rounded-full">
                {activeTemplates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              Todas
              <Badge variant="outline" className="rounded-full">
                {allTemplates.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {displayedTemplates.length} {displayedTemplates.length === 1 ? "plantilla" : "plantillas"}
            </span>
          </div>
        </div>

        {/* Contenido de tabs */}
        <TabsContent value={activeTab} className="space-y-4">
          {displayedTemplates.length === 0 ? (
            <EmptyTemplatesState
              variant={activeTab === "active" ? "active" : "all"}
              onCreateTemplate={handleCreateTemplate}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Patrón de Turnos</TableHead>
                    <TableHead className="text-center">Duración</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.description && (
                            <p className="text-muted-foreground mt-1 text-xs">{template.description}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <PatternBadges pattern={template.pattern} />
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="outline">{template.shiftDuration}h</Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant={template.active ? "default" : "secondary"}>
                          {template.active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {format(template.createdAt, "d 'de' MMM yyyy", { locale: es })}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Aplicar plantilla */}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApplyTemplate(template)}
                            disabled={!template.active}
                          >
                            <Play className="mr-2 h-3 w-3" />
                            Aplicar
                          </Button>

                          {/* Duplicar */}
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDuplicateTemplate(template)}>
                            <Copy className="h-3 w-3" />
                          </Button>

                          {/* Editar */}
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEditTemplate(template)}>
                            <Pencil className="h-3 w-3" />
                          </Button>

                          {/* Eliminar */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenDeleteDialog(template)}
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
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la plantilla <strong>&quot;{templateToDelete?.name}&quot;</strong>. Esta acción
              no se puede deshacer.
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
 * Componente para mostrar el patrón de turnos como badges
 */
interface PatternBadgesProps {
  pattern: ShiftType[];
}

function PatternBadges({ pattern }: PatternBadgesProps) {
  const maxVisible = 5;

  const getShiftTypeLabel = (type: ShiftType): string => {
    const labels: Record<ShiftType, string> = {
      morning: "M",
      afternoon: "T",
      night: "N",
      off: "L",
      saturday: "S",
      sunday: "D",
      custom: "C",
    };
    return labels[type] ?? "?";
  };

  const getShiftTypeColor = (type: ShiftType): string => {
    const colors: Record<ShiftType, string> = {
      morning:
        "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800",
      afternoon:
        "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800",
      night:
        "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800",
      off: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800",
      saturday: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800",
      sunday: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800",
      custom:
        "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800",
    };
    return colors[type] ?? "bg-gray-100 text-gray-700";
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {pattern.slice(0, maxVisible).map((type, idx) => (
        <span
          key={idx}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded border text-xs font-bold",
            getShiftTypeColor(type),
          )}
        >
          {getShiftTypeLabel(type)}
        </span>
      ))}
      {pattern.length > maxVisible && (
        <span className="text-muted-foreground text-xs">+{pattern.length - maxVisible} más</span>
      )}
    </div>
  );
}

/**
 * Estado vacío para cuando no hay plantillas
 */
interface EmptyTemplatesStateProps {
  variant: "active" | "all";
  onCreateTemplate: () => void;
}

function EmptyTemplatesState({ variant, onCreateTemplate }: EmptyTemplatesStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center">
      <Calendar className="text-muted-foreground h-12 w-12" />
      <div>
        <h3 className="text-lg font-semibold">
          {variant === "active" ? "No hay plantillas activas" : "No hay plantillas creadas"}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {variant === "active"
            ? "Activa una plantilla existente o crea una nueva para empezar."
            : "Crea tu primera plantilla rotativa para asignar turnos de forma rápida."}
        </p>
      </div>

      {variant === "all" && (
        <Button onClick={onCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Primera Plantilla
        </Button>
      )}
    </div>
  );
}
