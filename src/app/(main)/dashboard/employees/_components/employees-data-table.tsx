"use client";

import * as React from "react";

import { Plus, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { DataTable as DataTableNew } from "../../../../../components/data-table/data-table";
import { DataTablePagination } from "../../../../../components/data-table/data-table-pagination";
import { DataTableViewOptions } from "../../../../../components/data-table/data-table-view-options";

import { employeesColumns } from "./employees-columns";
import { Employee } from "../types";

export function EmployeesDataTable({ data }: { data: Employee[] }) {
  const [activeTab, setActiveTab] = React.useState("active");

  // Filtrar datos según la pestaña activa
  const filteredData = React.useMemo(() => {
    switch (activeTab) {
      case "active":
        return data.filter((emp) => emp.active);
      case "inactive":
        return data.filter((emp) => !emp.active);
      case "all":
        return data;
      case "recent":
        // Empleados contratados en los últimos 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return data.filter((emp) => {
          const currentContract = emp.employmentContracts.find((c) => c.active);
          if (!currentContract) return false;
          return new Date(currentContract.startDate) > thirtyDaysAgo;
        });
      default:
        return data;
    }
  }, [data, activeTab]);

  const table = useDataTableInstance({
    data: filteredData,
    columns: employeesColumns,
    getRowId: (row) => row.id.toString(),
  });

  // Contadores para badges
  const counts = React.useMemo(
    () => ({
      active: data.filter((emp) => emp.active).length,
      inactive: data.filter((emp) => !emp.active).length,
      all: data.length,
      recent: data.filter((emp) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const currentContract = emp.employmentContracts.find((c) => c.active);
        if (!currentContract) return false;
        return new Date(currentContract.startDate) > thirtyDaysAgo;
      }).length,
    }),
    [data],
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          Vista de empleados
        </Label>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos ({counts.active})</SelectItem>
            <SelectItem value="inactive">Inactivos ({counts.inactive})</SelectItem>
            <SelectItem value="all">Todos ({counts.all})</SelectItem>
            <SelectItem value="recent">Recientes ({counts.recent})</SelectItem>
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
          <TabsTrigger value="recent">
            Recientes <Badge variant="secondary">{counts.recent}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button size="sm" asChild>
            <Link href="/dashboard/employees/new">
              <Plus />
              <span className="hidden lg:inline">Nuevo empleado</span>
            </Link>
          </Button>
        </div>
      </div>

      <TabsContent value="active" className="relative flex flex-col gap-4 overflow-auto">
        {filteredData.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={employeesColumns} />
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Users className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay empleados activos</h3>
            <p className="text-xs">Los empleados activos aparecerán aquí</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="inactive" className="relative flex flex-col gap-4 overflow-auto">
        {filteredData.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={employeesColumns} />
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Users className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay empleados inactivos</h3>
            <p className="text-xs">Los empleados dados de baja aparecerán aquí</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="all" className="relative flex flex-col gap-4 overflow-auto">
        {filteredData.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={employeesColumns} />
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Users className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay empleados registrados</h3>
            <p className="text-xs">Comienza agregando tu primer empleado</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="recent" className="relative flex flex-col gap-4 overflow-auto">
        {filteredData.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border">
              <DataTableNew table={table} columns={employeesColumns} />
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Users className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay empleados recientes</h3>
            <p className="text-xs">Los empleados contratados en los últimos 30 días aparecerán aquí</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
