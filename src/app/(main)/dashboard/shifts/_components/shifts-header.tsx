"use client";

import { useEffect, useState, useMemo } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Settings2,
  Share2,
  Filter,
  Users,
  Building2,
  Copy,
  RotateCcw,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { formatWeekRange, getWeekStart } from "../_lib/shift-utils";
import type { CalendarView, CalendarMode } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

import { CopyWeekDialog } from "./copy-week-dialog";
import { PublishDialog } from "./publish-dialog";

export function ShiftsHeader() {
  const {
    currentWeekStart,
    goToPreviousWeek,
    goToNextWeek,
    goToToday,
    calendarView,
    setCalendarView,
    calendarMode,
    setCalendarMode,
    filters,
    setFilters,
    costCenters,
    zones,
    fetchEmployees,
    shifts,
    copyPreviousWeek,
    undoLastCopy,
    previousShiftsBackup,
    isLoading,
  } = useShiftsStore();

  const [searchTerm, setSearchTerm] = useState(filters.searchQuery ?? "");
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.searchQuery) {
        setFilters({ searchQuery: searchTerm });
        fetchEmployees(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, filters.searchQuery, setFilters, fetchEmployees]);

  const weekDisplay = formatWeekRange(currentWeekStart);
  const monthDisplay = format(currentWeekStart, "MMMM yyyy", { locale: es });

  const filteredZones = filters.costCenterId ? zones.filter((z) => z.costCenterId === filters.costCenterId) : zones;

  // Logic for Copy/Publish
  const draftShiftsCount = useMemo(() => shifts.filter((s) => s.status === "draft").length, [shifts]);
  const conflictShiftsCount = useMemo(() => shifts.filter((s) => s.status === "conflict").length, [shifts]);
  const hasShifts = shifts.length > 0;

  const handleCopyClick = () => {
    if (hasShifts) {
      setIsCopyDialogOpen(true);
    } else {
      copyPreviousWeek(false);
    }
  };

  // Status Badge
  const getWeekStatus = () => {
    if (shifts.length === 0) return { label: "Vacía", color: "text-muted-foreground" };
    if (shifts.some((s) => s.status === "conflict"))
      return { label: "Conflictos", color: "text-destructive font-medium" };
    if (shifts.some((s) => s.status === "draft")) return { label: "Borrador", color: "text-amber-600 font-medium" };
    return { label: "Publicada", color: "text-emerald-600 font-medium" };
  };
  const status = getWeekStatus();

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex flex-col gap-4 border-b p-4 shadow-sm backdrop-blur">
      {/* Top Row: Navigation & Main Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="bg-background flex items-center rounded-md border shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousWeek}
              className="h-8 w-8 rounded-none rounded-l-md border-r"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="hidden h-8 rounded-none px-3 text-xs font-medium sm:flex"
            >
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextWeek}
              className="h-8 w-8 rounded-none rounded-r-md border-l"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col">
            <span className="text-foreground text-sm leading-none font-semibold capitalize">
              {calendarView === "month" ? monthDisplay : weekDisplay}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-[10px] tracking-wider uppercase ${status.color}`}>{status.label}</span>
              {conflictShiftsCount > 0 && (
                <span className="text-destructive flex items-center text-[10px] font-medium">
                  <AlertTriangle className="mr-0.5 h-3 w-3" /> {conflictShiftsCount} problemas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions & View Toggle */}
        <div className="ml-auto flex items-center gap-2">
          {/* Undo Copy */}
          {previousShiftsBackup && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => undoLastCopy()}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground hidden h-8 text-xs md:flex"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Deshacer copia
            </Button>
          )}

          {/* Copy Week */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyClick}
            disabled={isLoading}
            className="hidden h-8 text-xs md:flex"
          >
            <Copy className="mr-2 h-3.5 w-3.5" /> Copiar Semana
          </Button>

          {/* Publish */}
          <Button
            variant={draftShiftsCount > 0 ? "default" : "secondary"}
            size="sm"
            className={
              draftShiftsCount > 0
                ? "h-8 bg-indigo-600 text-xs text-white shadow-sm hover:bg-indigo-700"
                : "h-8 text-xs"
            }
            onClick={() => setIsPublishDialogOpen(true)}
            disabled={!hasShifts}
          >
            <Share2 className="mr-2 h-3.5 w-3.5" />
            {draftShiftsCount > 0 ? `Publicar (${draftShiftsCount})` : "Publicar"}
          </Button>

          {/* Mobile Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyClick}>Copiar Semana</DropdownMenuItem>
              {previousShiftsBackup && (
                <DropdownMenuItem onClick={() => undoLastCopy()}>Deshacer Copia</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsPublishDialogOpen(true)}>Publicar Turnos</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* View Toggles */}
          <div className="bg-muted/20 flex items-center rounded-lg border p-1">
            <ToggleGroup
              type="single"
              value={calendarView}
              onValueChange={(v) => v && setCalendarView(v as CalendarView)}
              className="gap-0"
            >
              <ToggleGroupItem
                value="week"
                size="sm"
                className="dark:data-[state=on]:bg-background data-[state=on]:text-foreground text-muted-foreground hover:text-foreground h-6 rounded-sm px-2 text-[10px] transition-all data-[state=on]:bg-white data-[state=on]:font-medium data-[state=on]:shadow-sm sm:text-xs"
              >
                Semana
              </ToggleGroupItem>
              <ToggleGroupItem
                value="month"
                size="sm"
                className="dark:data-[state=on]:bg-background data-[state=on]:text-foreground text-muted-foreground hover:text-foreground h-6 rounded-sm px-2 text-[10px] transition-all data-[state=on]:bg-white data-[state=on]:font-medium data-[state=on]:shadow-sm sm:text-xs"
              >
                Mes
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Bottom Row: Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-[240px]">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted/30 border-muted-foreground/20 focus:bg-background h-9 pl-9 transition-colors"
          />
        </div>

        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Select
            value={filters.costCenterId ?? "all"}
            onValueChange={(value) =>
              setFilters({ costCenterId: value === "all" ? undefined : value, zoneId: undefined })
            }
          >
            <SelectTrigger className="h-9 w-[160px] border-dashed bg-transparent text-xs">
              <div className="flex items-center truncate">
                <Building2 className="text-muted-foreground mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Todos los centros" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {costCenters.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.zoneId ?? "all"}
            onValueChange={(value) => setFilters({ zoneId: value === "all" ? undefined : value })}
            disabled={!filters.costCenterId && filteredZones.length === 0}
          >
            <SelectTrigger className="h-9 w-[140px] border-dashed bg-transparent text-xs">
              <div className="flex items-center truncate">
                <Filter className="text-muted-foreground mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Todas las zonas" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las zonas</SelectItem>
              {filteredZones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status ?? "all"}
            onValueChange={(value) => setFilters({ status: value === "all" ? undefined : (value as any) })}
          >
            <SelectTrigger className="h-9 w-[130px] border-dashed bg-transparent text-xs">
              <div className="flex items-center truncate">
                <Settings2 className="text-muted-foreground mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="conflict">Conflicto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle (Employee/Area) */}
        <div className="bg-muted/20 ml-auto hidden items-center rounded-lg border p-1 md:flex">
          <ToggleGroup
            type="single"
            value={calendarMode}
            onValueChange={(v) => v && setCalendarMode(v as CalendarMode)}
            className="gap-0"
          >
            <ToggleGroupItem
              value="employee"
              size="sm"
              className="dark:data-[state=on]:bg-background data-[state=on]:text-foreground text-muted-foreground hover:text-foreground h-7 rounded-sm px-2 text-xs transition-all data-[state=on]:bg-white data-[state=on]:font-medium data-[state=on]:shadow-sm"
            >
              <Users className="mr-1 h-3.5 w-3.5" /> Empleados
            </ToggleGroupItem>
            <ToggleGroupItem
              value="area"
              size="sm"
              className="dark:data-[state=on]:bg-background data-[state=on]:text-foreground text-muted-foreground hover:text-foreground h-7 rounded-sm px-2 text-xs transition-all data-[state=on]:bg-white data-[state=on]:font-medium data-[state=on]:shadow-sm"
            >
              <Building2 className="mr-1 h-3.5 w-3.5" /> Áreas
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Dialogs */}
      <CopyWeekDialog
        open={isCopyDialogOpen}
        onOpenChange={setIsCopyDialogOpen}
        shiftCount={shifts.length}
        onConfirm={() => copyPreviousWeek(true)}
      />
      <PublishDialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen} />
    </div>
  );
}
