"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Building2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { getConflictTypeLabel } from "../_lib/conflicts-utils";
import type { ConflictType, ShiftConflict, Conflict } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

// Iconos para cada tipo de conflicto
const CONFLICT_ICONS: Record<ConflictType, typeof AlertTriangle> = {
  overlap: AlertCircle,
  min_rest: Clock,
  absence: Calendar,
  weekly_hours: Clock,
};

// Colores para cada severidad
const SEVERITY_STYLES = {
  error: {
    container: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
    icon: "text-red-600 dark:text-red-400",
    badge: "destructive" as const,
  },
  warning: {
    container: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "warning" as const,
  },
};

export function ConflictsPanel() {
  const isOpen = useShiftsStore((s) => s.isConflictsPanelOpen);
  const closePanel = useShiftsStore((s) => s.closeConflictsPanel);
  const conflictsFilter = useShiftsStore((s) => s.conflictsFilter);
  const setConflictsFilter = useShiftsStore((s) => s.setConflictsFilter);
  const conflictsPage = useShiftsStore((s) => s.conflictsPage);
  const setConflictsPage = useShiftsStore((s) => s.setConflictsPage);
  const navigateToShift = useShiftsStore((s) => s.navigateToShift);
  const getFilteredConflicts = useShiftsStore((s) => s.getFilteredConflicts);
  const getConflictsState = useShiftsStore((s) => s.getConflictsState);

  const paginatedConflicts = getFilteredConflicts();
  const conflictsState = getConflictsState();

  const handleTypeChange = (value: string) => {
    setConflictsFilter({ type: value as ConflictType | "all" });
  };

  const handleSeverityChange = (value: string) => {
    setConflictsFilter({ severity: value as "all" | "error" | "warning" });
  };

  const handleSearchChange = (value: string) => {
    setConflictsFilter({ search: value });
  };

  const handlePreviousPage = () => {
    if (conflictsPage > 0) {
      setConflictsPage(conflictsPage - 1);
    }
  };

  const handleNextPage = () => {
    if (paginatedConflicts.hasMore) {
      setConflictsPage(conflictsPage + 1);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        {/* Header */}
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <SheetTitle className="text-left">Conflictos</SheetTitle>
                <p className="text-muted-foreground text-sm">
                  {conflictsState.totalCount} turno{conflictsState.totalCount !== 1 ? "s" : ""} con problemas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {conflictsState.errorCount > 0 && (
                <Badge variant="destructive">{conflictsState.errorCount} errores</Badge>
              )}
              {conflictsState.warningCount > 0 && <Badge variant="warning">{conflictsState.warningCount} avisos</Badge>}
            </div>
          </div>
        </SheetHeader>

        {/* Filtros */}
        <div className="flex flex-col gap-3 border-b px-6 py-4">
          <div className="flex gap-2">
            {/* Filtro por tipo */}
            <Select value={conflictsFilter.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="overlap">Solapamiento</SelectItem>
                <SelectItem value="min_rest">Descanso mín.</SelectItem>
                <SelectItem value="absence">Ausencia</SelectItem>
                <SelectItem value="weekly_hours">Horas sem.</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por severidad */}
            <Select value={conflictsFilter.severity} onValueChange={handleSeverityChange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="error">Solo errores</SelectItem>
                <SelectItem value="warning">Solo avisos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Búsqueda por empleado */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por empleado..."
              value={conflictsFilter.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
            {conflictsFilter.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Lista de conflictos */}
        <ScrollArea className="flex-1">
          <div className="space-y-3 p-6">
            {paginatedConflicts.data.length === 0 ? (
              <EmptyState
                hasFilters={
                  conflictsFilter.search !== "" || conflictsFilter.type !== "all" || conflictsFilter.severity !== "all"
                }
              />
            ) : (
              paginatedConflicts.data.map((shiftConflict) => (
                <ConflictCard
                  key={shiftConflict.shiftId}
                  shiftConflict={shiftConflict}
                  onNavigate={() => navigateToShift(shiftConflict.shiftId)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Paginación */}
        {paginatedConflicts.total > 0 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <span className="text-muted-foreground text-sm">
              Mostrando {conflictsPage * 20 + 1}-{Math.min((conflictsPage + 1) * 20, paginatedConflicts.total)} de{" "}
              {paginatedConflicts.total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={conflictsPage === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!paginatedConflicts.hasMore}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Componente para cada conflicto
function ConflictCard({ shiftConflict, onNavigate }: { shiftConflict: ShiftConflict; onNavigate: () => void }) {
  const mainSeverity = shiftConflict.hasErrors ? "error" : "warning";
  const styles = SEVERITY_STYLES[mainSeverity];

  const formattedDate = format(parseISO(shiftConflict.date), "EEE d MMM", { locale: es });

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border p-4", styles.container)}>
      {/* Header del turno */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
              mainSeverity === "error"
                ? "border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-900/50"
                : "border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-900/50",
            )}
          >
            <User className={cn("h-5 w-5", styles.icon)} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{shiftConflict.employeeName}</span>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3" />
              <span className="capitalize">{formattedDate}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>
                {shiftConflict.startTime} - {shiftConflict.endTime}
              </span>
            </div>
            {shiftConflict.costCenterName && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Building2 className="h-3 w-3" />
                <span>{shiftConflict.costCenterName}</span>
                {shiftConflict.zoneName && (
                  <>
                    <span>•</span>
                    <span>{shiftConflict.zoneName}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <Badge variant={styles.badge} className="shrink-0">
          {shiftConflict.totalConflicts}
        </Badge>
      </div>

      {/* Lista de conflictos */}
      <div className="space-y-2 pl-[52px]">
        {shiftConflict.conflicts.map((conflict, idx) => (
          <ConflictItem key={idx} conflict={conflict} />
        ))}
      </div>

      {/* Acción */}
      <div className="flex justify-end pl-[52px]">
        <Button variant="ghost" size="sm" className="gap-2" onClick={onNavigate}>
          <span>Ver turno</span>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Componente para cada conflicto individual
function ConflictItem({ conflict }: { conflict: Conflict }) {
  const Icon = CONFLICT_ICONS[conflict.type];
  const styles = SEVERITY_STYLES[conflict.severity];

  return (
    <div className="flex items-start gap-2">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)} />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium">{getConflictTypeLabel(conflict.type)}</span>
        <span className="text-muted-foreground text-xs">{conflict.message}</span>
      </div>
    </div>
  );
}

// Estado vacío
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <AlertTriangle className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      {hasFilters ? (
        <>
          <h3 className="text-lg font-semibold">Sin resultados</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            No hay conflictos que coincidan con los filtros aplicados
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold">Sin conflictos</h3>
          <p className="text-muted-foreground mt-1 text-sm">Todos los turnos están correctamente configurados</p>
        </>
      )}
    </div>
  );
}
