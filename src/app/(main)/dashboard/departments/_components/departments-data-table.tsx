"use client";

import * as React from "react";

import { Plus, Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DepartmentData } from "@/stores/departments-store";

import { DataTable as DataTableNew } from "../../../../../components/data-table/data-table";
import { DataTablePagination } from "../../../../../components/data-table/data-table-pagination";
import { DataTableViewOptions } from "../../../../../components/data-table/data-table-view-options";

import { createDepartmentsColumns } from "./departments-columns";

interface DepartmentsDataTableProps {
  data: DepartmentData[];
  onNewDepartment?: () => void;
  onEdit?: (department: DepartmentData) => void;
  onDelete?: (department: DepartmentData) => void;
}

export function DepartmentsDataTable({ data, onNewDepartment, onEdit, onDelete }: DepartmentsDataTableProps) {
  const [activeTab, setActiveTab] = React.useState("active");

  // Crear columnas con callbacks
  const columns = React.useMemo(() => createDepartmentsColumns({ onEdit, onDelete }), [onEdit, onDelete]);

  // Filtrar datos según la pestaña activa
  const filteredData = React.useMemo(() => {
    switch (activeTab) {
      case "active":
        return data.filter((dept) => dept.active);
      case "inactive":
        return data.filter((dept) => !dept.active);
      case "all":
        return data;
      case "with-manager":
        return data.filter((dept) => dept.manager && dept.active);
      default:
        return data;
    }
  }, [data, activeTab]);

  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => row.id.toString(),
  });

  // Contadores para badges
  const counts = React.useMemo(
    () => ({
      active: data.filter((dept) => dept.active).length,
      inactive: data.filter((dept) => !dept.active).length,
      all: data.length,
      withManager: data.filter((dept) => dept.manager && dept.active).length,
    }),
    [data],
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          Vista de departamentos
        </Label>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos ({counts.active})</SelectItem>
            <SelectItem value="inactive">Inactivos ({counts.inactive})</SelectItem>
            <SelectItem value="all">Todos ({counts.all})</SelectItem>
            <SelectItem value="with-manager">Con responsable ({counts.withManager})</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="active">
            Activos <Badge variant="secondary">{counts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactivos <Badge variant="secondary">{counts.inactive}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos <Badge variant="secondary">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="with-manager">
            Con responsable <Badge variant="secondary">{counts.withManager}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button size="sm" onClick={onNewDepartment}>
            <Plus />
            <span className="hidden lg:inline">Nuevo departamento</span>
          </Button>
        </div>
      </div>

      <TabsContent value="active" className="relative flex flex-col gap-4 overflow-auto">
        {filteredData.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={columns} />
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Building2 className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay departamentos activos</h3>
            <p className="text-xs">Los departamentos activos aparecerán aquí</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="inactive" className="relative flex flex-col gap-4 overflow-auto">
        {filteredData.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={columns} />
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Building2 className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay departamentos inactivos</h3>
            <p className="text-xs">Los departamentos dados de baja aparecerán aquí</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="all" className="relative flex flex-col gap-4 overflow-auto">
        {filteredData.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={columns} />
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Building2 className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay departamentos registrados</h3>
            <p className="text-xs">Comienza agregando tu primer departamento</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="with-manager" className="relative flex flex-col gap-4 overflow-auto">
        {filteredData.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={columns} />
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Building2 className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay departamentos con responsable</h3>
            <p className="text-xs">Los departamentos con responsable asignado aparecerán aquí</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
