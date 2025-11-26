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

import { FileText, Settings, LayoutDashboard, ShieldOff } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

import { CalendarMonthArea } from "./_components/calendar-month-area";
import { CalendarMonthEmployee } from "./_components/calendar-month-employee";
import { CalendarWeekArea } from "./_components/calendar-week-area";
import { CalendarWeekEmployee } from "./_components/calendar-week-employee";
import { ConflictsPanel } from "./_components/conflicts-panel";
import { EmptyStateLoading } from "./_components/empty-states";
import { MobileViewWarning } from "./_components/mobile-view-warning";
import { ShiftDialog } from "./_components/shift-dialog";
import { ShiftsDashboard } from "./_components/shifts-dashboard";
import { ShiftsHeader } from "./_components/shifts-header";
import { TemplateApplyDialog } from "./_components/template-apply-dialog";
import { TemplateDialog } from "./_components/template-dialog";
import { TemplatesTable } from "./_components/templates-table";
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
  const shiftsEnabled = useOrganizationFeaturesStore((state) => state.features.shiftsEnabled);

  // Cargar datos iniciales
  useEffect(() => {
    if (!shiftsEnabled) return;
    void fetchShifts();
    void fetchEmployees();
    void fetchCostCenters();
    void fetchZones();
    void fetchTemplates();
  }, [fetchShifts, fetchEmployees, fetchCostCenters, fetchZones, fetchTemplates, shiftsEnabled]);

  if (!shiftsEnabled) {
    return (
      <div className="@container/main flex flex-col gap-6">
        <SectionHeader
          title="Gestión de Turnos"
          description="Este módulo está desactivado para tu organización. Actívalo en Configuración → Turnos."
        />

        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldOff className="text-muted-foreground h-4 w-4" />
              Módulo deshabilitado
            </CardTitle>
            <CardDescription>
              Solo los administradores con permisos pueden habilitar el módulo y definir las reglas de descanso desde la
              sección de Configuración.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              No verás cuadrantes ni podrás planificar turnos hasta que el módulo esté activo. Si eres administrador, ve
              a Configuración → Turnos para activarlo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6">
      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Turnos</h1>

            {/* TabsList para desktop */}
            <TabsList className="hidden h-9 md:inline-flex">
              <TabsTrigger value="calendar" className="text-xs">
                Cuadrante
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">
                <FileText className="mr-2 h-3.5 w-3.5" />
                Plantillas
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs">
                <Settings className="mr-2 h-3.5 w-3.5" />
                Configuración
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="text-xs">
                <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
                Dashboard
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Select para móvil */}
          <div className="block w-[150px] md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="h-8 w-full text-xs">
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
        </div>

        {/* Tab: Cuadrante */}
        <TabsContent value="calendar" className="flex min-h-0 flex-1 flex-col space-y-0 pb-4">
          {/* Vista móvil: Aviso */}
          <div className="mb-4 block md:hidden">
            <MobileViewWarning
              title="Cuadrante disponible solo en PC"
              description="El cuadrante de turnos requiere una pantalla más grande para poder visualizar y editar los turnos correctamente."
            />
          </div>

          {/* Vista desktop: Contenido completo */}
          <div className="bg-background hidden min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-lg border shadow-sm md:flex">
            {/* Nuevo Header Unificado */}
            <ShiftsHeader />

            {/* Área de calendario */}
            <div className="bg-muted/5 relative flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center p-6">
                  <EmptyStateLoading />
                </div>
              ) : shifts.length === 0 && !isLoading ? (
                // Si no hay turnos, mostramos el EmptyState, pero el Header ya está visible para crear/filtrar
                // Quizás queramos mostrar el grid vacío en lugar del EmptyState completo, para que puedan añadir.
                // Vamos a mostrar el Grid directamente, el usuario puede añadir con el botón +
                // Solo si no hay empleados mostramos empty state de empleados (manejado dentro del componente)
                <div className="h-full w-full overflow-hidden p-4">
                  {calendarView === "week" && calendarMode === "employee" && <CalendarWeekEmployee />}
                  {calendarView === "month" && calendarMode === "employee" && <CalendarMonthEmployee />}
                  {calendarView === "week" && calendarMode === "area" && <CalendarWeekArea />}
                  {calendarView === "month" && calendarMode === "area" && <CalendarMonthArea />}
                </div>
              ) : (
                <div className="h-full w-full overflow-hidden p-4">
                  {/* Vistas de calendario */}
                  {calendarView === "week" && calendarMode === "employee" && <CalendarWeekEmployee />}

                  {calendarView === "month" && calendarMode === "employee" && <CalendarMonthEmployee />}

                  {calendarView === "week" && calendarMode === "area" && <CalendarWeekArea />}

                  {calendarView === "month" && calendarMode === "area" && <CalendarMonthArea />}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Plantillas */}
        <TabsContent value="templates" className="space-y-6">
          <div className="hidden md:block">
            <TemplatesTable />
          </div>
        </TabsContent>

        {/* Tab: Configuración */}
        <TabsContent value="config" className="space-y-6">
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

      {/* Panel de conflictos */}
      <ConflictsPanel />
    </div>
  );
}
