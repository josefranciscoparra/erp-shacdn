/**
 * Página Principal del Módulo de Turnos
 *
 * ESTADO: ✅ Estructura básica creada, ⚠️ Pendiente completar vistas calendario y modales
 *
 * COMPLETADO:
 * - ✅ Store Zustand con toda la lógica
 * - ✅ Servicio mock con datos seed
 * - ✅ Componentes base (EmptyStates, ShiftBlock, Filters, ViewSelector)
 * - ✅ Estructura de página con tabs
 *
 * PENDIENTE (completar en siguiente iteración):
 * - ⚠️ CalendarWeekEmployee (vista semanal por empleado con DnD)
 * - ⚠️ CalendarMonthEmployee (vista mensual compacta)
 * - ⚠️ CalendarWeekArea (vista por áreas con heatmap)
 * - ⚠️ ShiftDialog (modal crear/editar turno)
 * - ⚠️ TemplateApplyDialog (modal aplicar plantilla)
 * - ⚠️ TemplatesTable (tabla de plantillas)
 * - ⚠️ PublishBar (barra de acciones masivas)
 * - ⚠️ Instalar @dnd-kit (npm install @dnd-kit/core @dnd-kit/sortable)
 */

"use client";

import { useEffect } from "react";

import { FileText, Settings, LayoutDashboard } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CalendarMonthArea } from "./_components/calendar-month-area";
import { CalendarMonthEmployee } from "./_components/calendar-month-employee";
import { CalendarWeekArea } from "./_components/calendar-week-area";
import { CalendarWeekEmployee } from "./_components/calendar-week-employee";
import { EmptyState, EmptyFiltersState, EmptyStateLoading } from "./_components/empty-states";
import { PublishBar } from "./_components/publish-bar";
import { ShiftDialog } from "./_components/shift-dialog";
import { ShiftsDashboard } from "./_components/shifts-dashboard";
import { ShiftsFiltersBar } from "./_components/shifts-filters-bar";
import { ShiftsViewSelector } from "./_components/shifts-view-selector";
import { TemplateApplyDialog } from "./_components/template-apply-dialog";
import { TemplatesTable } from "./_components/templates-table";
import { WeekNavigator } from "./_components/week-navigator";
import { ZoneDialog } from "./_components/zone-dialog";
import { ZonesTable } from "./_components/zones-table";
import { useShiftsStore } from "./_store/shifts-store";

export default function ShiftsPage() {
  const {
    shifts,
    isLoading,
    calendarView,
    calendarMode,
    openShiftDialog,
    fetchShifts,
    fetchEmployees,
    fetchCostCenters,
    fetchZones,
    fetchTemplates,
  } = useShiftsStore();

  // Cargar datos iniciales
  useEffect(() => {
    void fetchShifts();
    void fetchEmployees();
    void fetchCostCenters();
    void fetchZones();
    void fetchTemplates();
  }, []);

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Gestión de Turnos</h1>
        <p className="text-muted-foreground mt-1 text-sm">Organiza los turnos rotativos de tu equipo</p>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="calendar">Cuadrante</TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Tab: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <ShiftsDashboard />
        </TabsContent>

        {/* Tab: Cuadrante */}
        <TabsContent value="calendar" className="space-y-6">
          {/* Filtros y selector de vista */}
          <div className="grid gap-6 @4xl/main:grid-cols-[1fr,auto]">
            {/* Filtros */}
            <div className="bg-card rounded-lg border p-4">
              <ShiftsFiltersBar />
            </div>

            {/* Selector de vista */}
            <div className="flex items-center">
              <ShiftsViewSelector />
            </div>
          </div>

          {/* Navegación de semana - justo arriba del calendario */}
          <WeekNavigator />

          {/* Área de calendario */}
          <div className="rounded-lg border">
            {isLoading ? (
              <div className="p-6">
                <EmptyStateLoading />
              </div>
            ) : shifts.length === 0 ? (
              <div className="p-6">
                <EmptyState variant="shifts" onAction={() => openShiftDialog()} />
              </div>
            ) : (
              <div className="p-6">
                {/* Vistas de calendario */}
                {calendarView === "week" && calendarMode === "employee" && <CalendarWeekEmployee />}

                {calendarView === "month" && calendarMode === "employee" && <CalendarMonthEmployee />}

                {calendarView === "week" && calendarMode === "area" && <CalendarWeekArea />}

                {calendarView === "month" && calendarMode === "area" && <CalendarMonthArea />}
              </div>
            )}
          </div>

          {/* Barra de acciones masivas */}
          <PublishBar />
        </TabsContent>

        {/* Tab: Plantillas */}
        <TabsContent value="templates" className="space-y-6">
          <TemplatesTable />
        </TabsContent>

        {/* Tab: Configuración */}
        <TabsContent value="config" className="space-y-6">
          <ZonesTable />
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <ShiftDialog />
      <TemplateApplyDialog />
      <ZoneDialog />
    </div>
  );
}
