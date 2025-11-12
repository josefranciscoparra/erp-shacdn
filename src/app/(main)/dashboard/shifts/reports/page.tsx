/**
 * Página de Informes de Turnos
 * Sprint 6
 */

import { SectionHeader } from "@/components/hr/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ComplianceChartTab } from "./_components/compliance-chart-tab";
import { CostCenterReportsTab } from "./_components/cost-center-reports-tab";
import { EmployeeReportsTab } from "./_components/employee-reports-tab";
import { OrganizationStatsTab } from "./_components/organization-stats-tab";

export default function ShiftReportsPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Informes de Turnos"
        description="Analiza el cumplimiento, rendimiento y estadísticas de los turnos"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="employees">Por Empleado</TabsTrigger>
          <TabsTrigger value="cost-centers">Por Centro</TabsTrigger>
          <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OrganizationStatsTab />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeReportsTab />
        </TabsContent>

        <TabsContent value="cost-centers">
          <CostCenterReportsTab />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceChartTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
