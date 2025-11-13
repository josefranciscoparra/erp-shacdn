/**
 * Componente de Estados Vacíos para el Módulo de Turnos
 *
 * Muestra mensajes e iconos cuando no hay datos para mostrar.
 */

"use client";

import { Calendar, Users, FileText, Layers, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  variant: "shifts" | "employees" | "templates" | "zones";
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ variant, onAction, actionLabel }: EmptyStateProps) {
  const configs = {
    shifts: {
      icon: Calendar,
      title: "No hay turnos para mostrar",
      description: "Comienza creando turnos o aplicando una plantilla para organizar tu equipo",
      defaultActionLabel: "Crear primer turno",
    },
    employees: {
      icon: Users,
      title: "No hay empleados con sistema de turnos",
      description: "Activa el sistema de turnos para los empleados que necesiten horarios rotativos",
      defaultActionLabel: "Ver empleados",
    },
    templates: {
      icon: FileText,
      title: "No hay plantillas creadas",
      description: "Crea plantillas de turnos rotativos para aplicarlas rápidamente a tu equipo",
      defaultActionLabel: "Crear plantilla",
    },
    zones: {
      icon: Layers,
      title: "No hay zonas de trabajo configuradas",
      description: "Define las zonas de trabajo (ej: Cocina, Barra) para organizar mejor los turnos",
      defaultActionLabel: "Crear zona",
    },
  };

  const config = configs[variant];
  const Icon = config.icon;

  return (
    <div className="border-muted-foreground/20 bg-muted/10 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 text-center">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-foreground text-lg font-semibold">{config.title}</h3>
        <p className="text-muted-foreground max-w-md text-sm">{config.description}</p>
      </div>

      {onAction && (
        <Button onClick={onAction} size="sm" className="mt-2">
          <Plus className="mr-2 h-4 w-4" />
          {actionLabel ?? config.defaultActionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Estado vacío para cuando hay filtros activos sin resultados
 */
interface EmptyFiltersStateProps {
  onClearFilters: () => void;
}

export function EmptyFiltersState({ onClearFilters }: EmptyFiltersStateProps) {
  return (
    <div className="border-muted-foreground/20 bg-muted/10 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 text-center">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <Calendar className="text-muted-foreground h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-foreground text-lg font-semibold">No se encontraron turnos con estos filtros</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          Intenta ajustar los filtros o limpiarlos para ver más resultados
        </p>
      </div>

      <Button onClick={onClearFilters} variant="outline" size="sm" className="mt-2">
        Limpiar filtros
      </Button>
    </div>
  );
}

/**
 * Estado de loading skeleton
 */
export function EmptyStateLoading() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}
