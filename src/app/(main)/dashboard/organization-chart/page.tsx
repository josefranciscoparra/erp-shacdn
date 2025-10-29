"use client";

import { useEffect, useState } from "react";

import { HierarchyType } from "@prisma/client";
import { Download, Loader2, Network, Search } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { OrgChartDepartmental } from "./_components/org-chart-departmental";
import { OrgChartFlat } from "./_components/org-chart-flat";
import { OrgChartHierarchical } from "./_components/org-chart-hierarchical";
import type { EmployeeNodeData } from "./_components/org-chart-node";
import { OrgChartUnified } from "./_components/org-chart-unified";

interface DepartmentNode {
  id: string;
  name: string;
  manager: EmployeeNodeData | null;
  employees: EmployeeNodeData[];
}

interface HierarchicalEmployeeNode extends EmployeeNodeData {
  subordinates: HierarchicalEmployeeNode[];
}

interface OrganizationChartData {
  hierarchyType: HierarchyType;
  ceo?: EmployeeNodeData | null;
  hierarchicalTree?: HierarchicalEmployeeNode | null;
  departments: DepartmentNode[];
  employees: EmployeeNodeData[];
}

export default function OrganizationChartPage() {
  const [data, setData] = useState<OrganizationChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchOrganizationChart();
  }, []);

  const fetchOrganizationChart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/organization-chart");

      if (!response.ok) {
        throw new Error("Error al cargar el organigrama");
      }

      const chartData = await response.json();
      setData(chartData);
    } catch (err) {
      console.error("Error fetching organization chart:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("No se pudo cargar el organigrama");
    } finally {
      setIsLoading(false);
    }
  };

  const getHierarchyLabel = (type: HierarchyType) => {
    switch (type) {
      case HierarchyType.FLAT:
        return "Estructura Plana";
      case HierarchyType.DEPARTMENTAL:
        return "Por Departamentos";
      case HierarchyType.HIERARCHICAL:
        return "Jerárquica Completa";
      default:
        return "Organigrama";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={<Network className="mx-auto h-12 w-12" />}
        title="Error al cargar el organigrama"
        description={error ?? "No se pudo obtener la estructura organizacional"}
        action={{
          label: "Reintentar",
          onClick: fetchOrganizationChart,
        }}
      />
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Organigrama"
        subtitle={`${getHierarchyLabel(data.hierarchyType)} • ${data.employees.length} empleado${data.employees.length !== 1 ? "s" : ""}`}
      />

      {/* Barra de búsqueda */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nombre, puesto, departamento o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Organigrama según tipo de jerarquía */}
      <div className="bg-card rounded-lg border p-6 shadow-xs">
        {data.hierarchyType === HierarchyType.FLAT && (
          <OrgChartFlat employees={data.employees} searchQuery={searchQuery} />
        )}

        {data.hierarchyType === HierarchyType.DEPARTMENTAL && (
          <OrgChartDepartmental departments={data.departments} searchQuery={searchQuery} />
        )}

        {data.hierarchyType === HierarchyType.HIERARCHICAL && (
          <OrgChartUnified rootNode={data.hierarchicalTree ?? null} searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}
