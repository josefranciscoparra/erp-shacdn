"use client";

import { useEffect, useState } from "react";

import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import type { Shift } from "@prisma/client";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Users, Store } from "lucide-react";
import { toast } from "sonner";

import { CoverageHeatmap } from "@/components/shifts/coverage-heatmap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCostCentersStore } from "@/stores/cost-centers-store";
import { useShiftConfigurationStore } from "@/stores/shift-configuration-store";
import { useShiftCoverageStore } from "@/stores/shift-coverage-store";
import { useShiftsStore } from "@/stores/shifts-store";

import { ApplyTemplateDialog } from "./apply-template-dialog";
import { CreateShiftDialog } from "./create-shift-dialog";
import { DroppableDay } from "./droppable-day";
import { ShiftCard } from "./shift-card";

type ShiftWithRelations = Shift & {
  position: { id: string; title: string } | null;
  costCenter: { id: string; name: string };
  template: { id: string; name: string; color: string } | null;
  assignments: Array<{
    id: string;
    employeeId: string;
    status: string;
  }>;
};

export function ShiftCalendar() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "coverage">("week");
  const [activeShift, setActiveShift] = useState<ShiftWithRelations | null>(null);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("all");

  const { shifts, fetchShifts, updateShift, isLoading } = useShiftsStore();
  const { config } = useShiftConfigurationStore();
  const { heatmap, fetchHeatmap } = useShiftCoverageStore();
  const { costCenters, fetchCostCenters } = useCostCentersStore();

  const weekStartDay = config?.weekStartDay ?? 1;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Cargar centros de coste al montar
  useEffect(() => {
    if (costCenters.length === 0) {
      fetchCostCenters();
    }
  }, [costCenters.length, fetchCostCenters]);

  // Cargar selección de centro desde localStorage
  useEffect(() => {
    const savedCenter = localStorage.getItem("shifts-selected-cost-center");
    if (savedCenter) {
      setSelectedCostCenter(savedCenter);
    }
  }, []);

  useEffect(() => {
    // Cargar turnos de la semana actual con filtro de centro
    const filters: any = {
      dateFrom: currentWeekStart,
      dateTo: addDays(currentWeekStart, 6),
    };

    if (selectedCostCenter !== "all") {
      filters.costCenterId = selectedCostCenter;
    }

    fetchShifts(filters);

    // Cargar heatmap si estamos en vista de cobertura
    if (viewMode === "coverage") {
      fetchHeatmap(currentWeekStart);
    }
  }, [currentWeekStart, viewMode, selectedCostCenter, fetchShifts, fetchHeatmap]);

  const handleCostCenterChange = (value: string) => {
    setSelectedCostCenter(value);
    localStorage.setItem("shifts-selected-cost-center", value);
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: weekStartDay }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const shift = shifts.find((s) => s.id === event.active.id);
    if (shift) {
      setActiveShift(shift);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShift(null);

    if (!over) return;

    const shiftId = active.id as string;
    const newDateStr = over.id as string; // formato YYYY-MM-DD
    const newDate = new Date(newDateStr);

    // TODO: Sprint 2.6 - Implementar validación antes de mover
    try {
      await updateShift(shiftId, { date: newDate });
      toast.success("Turno movido correctamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al mover turno");
    }
  };

  const getShiftsForDay = (day: Date) => {
    return shifts.filter((shift) => isSameDay(new Date(shift.date), day));
  };

  const handleShiftUpdate = () => {
    // Refrescar turnos cuando cambian las asignaciones
    const filters: any = {
      dateFrom: currentWeekStart,
      dateTo: addDays(currentWeekStart, 6),
    };

    if (selectedCostCenter !== "all") {
      filters.costCenterId = selectedCostCenter;
    }

    fetchShifts(filters);
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendario de Turnos</h1>
            <p className="text-muted-foreground">Planifica y gestiona turnos con drag & drop</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Centro */}
            <Select value={selectedCostCenter} onValueChange={handleCostCenterChange}>
              <SelectTrigger className="w-[220px]">
                <Store className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Seleccionar tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tiendas</SelectItem>
                {costCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleToday}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <ApplyTemplateDialog />
            <CreateShiftDialog
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Turno
                </Button>
              }
              defaultDate={selectedDate ?? new Date()}
            />
          </div>
        </div>

        {/* Week selector and view mode */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "coverage")}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {format(currentWeekStart, "d 'de' MMMM", { locale: es })} -{" "}
              {format(addDays(currentWeekStart, 6), "d 'de' MMMM yyyy", { locale: es })}
            </h2>
            <TabsList>
              <TabsTrigger value="week">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Vista Semanal
              </TabsTrigger>
              <TabsTrigger value="coverage">
                <Users className="mr-2 h-4 w-4" />
                Cobertura
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Calendar Grid */}
          <TabsContent value="week" className="mt-0">
            {isLoading ? (
              <div className="flex h-96 items-center justify-center">
                <p className="text-muted-foreground">Cargando turnos...</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dayShifts = getShiftsForDay(day);

                  return (
                    <DroppableDay
                      key={format(day, "yyyy-MM-dd")}
                      day={day}
                      shifts={dayShifts}
                      onShiftClick={setSelectedDate}
                      onShiftUpdate={handleShiftUpdate}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Coverage View */}
          <TabsContent value="coverage" className="mt-0">
            {isLoading ? (
              <div className="flex h-96 items-center justify-center">
                <p className="text-muted-foreground">Cargando cobertura...</p>
              </div>
            ) : heatmap ? (
              <CoverageHeatmap days={heatmap.days} hours={heatmap.hours} data={heatmap.data} />
            ) : (
              <Card className="flex h-96 items-center justify-center">
                <div className="text-center">
                  <Users className="text-muted-foreground mx-auto h-12 w-12" />
                  <h3 className="mt-4 text-lg font-semibold">Sin datos de cobertura</h3>
                  <p className="text-muted-foreground text-sm">No hay turnos publicados para esta semana</p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Drag overlay */}
        <DragOverlay>
          {activeShift ? (
            <div className="rotate-3 opacity-80">
              <ShiftCard shift={activeShift} />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
