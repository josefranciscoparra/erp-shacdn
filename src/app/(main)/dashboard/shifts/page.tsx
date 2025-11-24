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

import { useEffect, useState } from "react";

import { FileText, Settings, LayoutDashboard } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CalendarMonthArea } from "./_components/calendar-month-area";
import { CalendarMonthEmployee } from "./_components/calendar-month-employee";
import { CalendarWeekArea } from "./_components/calendar-week-area";
import { CalendarWeekEmployee } from "./_components/calendar-week-employee";
import { EmptyState, EmptyFiltersState, EmptyStateLoading } from "./_components/empty-states";
import { MobileViewWarning } from "./_components/mobile-view-warning";
import { PublishBar } from "./_components/publish-bar";
import { ShiftDialog } from "./_components/shift-dialog";
import { ShiftsDashboard } from "./_components/shifts-dashboard";
import { ShiftsFiltersBar } from "./_components/shifts-filters-bar";
import { TemplateApplyDialog } from "./_components/template-apply-dialog";
import { TemplateDialog } from "./_components/template-dialog";
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

  // Estado local para tab activo
  const [activeTab, setActiveTab] = useState("calendar");

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
      <SectionHeader
        title="Gestión de Turnos"
        description="Organiza los turnos rotativos de tu equipo de forma eficiente."
      />

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Select para móvil */}
        <div className="block md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calendar">Cuadrante</SelectItem>
              <SelectItem value="templates">Plantillas</SelectItem>
              <SelectItem value="config">Configuración</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* TabsList para desktop */}
        <TabsList className="hidden md:inline-flex">
          <TabsTrigger value="calendar">Cuadrante</TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Tab: Cuadrante */}
        <TabsContent value="calendar" className="space-y-6">
          {/* Vista móvil: Aviso */}
          <div className="block md:hidden">
            <MobileViewWarning
              title="Cuadrante disponible solo en PC"
              description="El cuadrante de turnos requiere una pantalla más grande para poder visualizar y editar los turnos correctamente. Por favor, accede desde un ordenador o tablet."
            />
          </div>

          {/* Vista desktop: Contenido completo */}
          <div className="hidden space-y-6 md:block">
            {/* Filtros con selector de vista integrado */}
            <ShiftsFiltersBar />

            {/* Área de calendario */}
            <div className="overflow-hidden rounded-lg border">
              {/* Navegación de semana - sticky arriba del calendario */}
              <WeekNavigator />

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
          </div>
        </TabsContent>

        {/* Tab: Plantillas */}
        <TabsContent value="templates" className="space-y-6">
          {/* Vista móvil: Aviso */}
          <div className="block md:hidden">
            <MobileViewWarning
              title="Plantillas disponibles solo en PC"
              description="La gestión de plantillas requiere una pantalla más grande para poder ver y editar los detalles correctamente. Por favor, accede desde un ordenador o tablet."
            />
          </div>

          {/* Vista desktop: Contenido completo */}
          <div className="hidden md:block">
            <TemplatesTable />
          </div>
        </TabsContent>

        {/* Tab: Configuración */}
        <TabsContent value="config" className="space-y-6">
          {/* Vista móvil: Aviso */}
          <div className="block md:hidden">
            <MobileViewWarning
              title="Configuración disponible solo en PC"
              description="La configuración de zonas y áreas requiere una pantalla más grande para poder gestionar los ajustes correctamente. Por favor, accede desde un ordenador o tablet."
            />
          </div>

          {/* Vista desktop: Contenido completo */}
          <div className="hidden md:block">
            <ZonesTable />
          </div>
        </TabsContent>

        {/* Tab: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <ShiftsDashboard />
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <ShiftDialog />
      <TemplateDialog />
      <TemplateApplyDialog />
      <ZoneDialog />
    </div>
  );
}
