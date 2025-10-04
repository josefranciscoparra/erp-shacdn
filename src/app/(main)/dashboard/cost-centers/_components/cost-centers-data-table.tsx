"use client";

import * as React from "react";

import { Plus, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { DataTable as DataTableNew } from "../../../../../components/data-table/data-table";
import { DataTablePagination } from "../../../../../components/data-table/data-table-pagination";
import { DataTableViewOptions } from "../../../../../components/data-table/data-table-view-options";

import { createCostCentersColumns } from "./cost-centers-columns";
import { CostCenterData } from "@/stores/cost-centers-store";

interface CostCentersDataTableProps {
  data: CostCenterData[];
  onNewCostCenter?: () => void;
  onEdit?: (costCenter: CostCenterData) => void;
  onDelete?: (costCenter: CostCenterData) => void;
}

export function CostCentersDataTable({ 
  data, 
  onNewCostCenter, 
  onEdit, 
  onDelete 
}: CostCentersDataTableProps) {
  const [activeTab, setActiveTab] = React.useState("active");

  const columns = React.useMemo(() => createCostCentersColumns({ onEdit, onDelete }), [onEdit, onDelete]);

  const filteredData = React.useMemo(() => {
    switch (activeTab) {
      case "active":
        return data.filter((center) => center.active);
      case "inactive":
        return data.filter((center) => !center.active);
      case "all":
        return data;
      case "with-address":
        return data.filter((center) => center.address && center.active);
      default:
        return data;
    }
  }, [data, activeTab]);

  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => row.id.toString(),
  });

  const counts = React.useMemo(
    () => ({
      active: data.filter((center) => center.active).length,
      inactive: data.filter((center) => !center.active).length,
      all: data.length,
      withAddress: data.filter((center) => center.address && center.active).length,
    }),
    [data],
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          Vista de centros de coste
        </Label>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos ({counts.active})</SelectItem>
            <SelectItem value="inactive">Inactivos ({counts.inactive})</SelectItem>
            <SelectItem value="all">Todos ({counts.all})</SelectItem>
            <SelectItem value="with-address">Con dirección ({counts.withAddress})</SelectItem>
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
          <TabsTrigger value="with-address">
            Con dirección <Badge variant="secondary">{counts.withAddress}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button size="sm" onClick={onNewCostCenter}>
            <Plus />
            <span className="hidden lg:inline">Nuevo centro</span>
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
              <Landmark className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay centros de coste activos</h3>
            <p className="text-xs">Los centros de coste activos aparecerán aquí</p>
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
              <Landmark className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay centros de coste inactivos</h3>
            <p className="text-xs">Los centros de coste dados de baja aparecerán aquí</p>
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
              <Landmark className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay centros de coste registrados</h3>
            <p className="text-xs">Comienza agregando tu primer centro de coste</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="with-address" className="relative flex flex-col gap-4 overflow-auto">
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
              <Landmark className="text-muted-foreground/30 mx-auto h-12 w-12" />
            </div>
            <h3 className="text-foreground mb-1 text-sm font-medium">No hay centros con dirección</h3>
            <p className="text-xs">Los centros de coste con dirección configurada aparecerán aquí</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}