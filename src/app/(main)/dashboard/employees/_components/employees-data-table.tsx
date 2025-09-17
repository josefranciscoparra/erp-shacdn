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
  const [tableData, setTableData] = React.useState(() => data);
  const table = useDataTableInstance({ 
    data: tableData, 
    columns: employeesColumns, 
    getRowId: (row) => row.id.toString() 
  });

  return (
    <Tabs defaultValue="active" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          Vista de empleados
        </Label>
        <Select defaultValue="active">
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="recent">Recientes</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="inactive">
            Inactivos <Badge variant="secondary">0</Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos <Badge variant="secondary">{data.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/employees/new">
              <Plus />
              <span className="hidden lg:inline">Nuevo empleado</span>
            </Link>
          </Button>
        </div>
      </div>
      
      <TabsContent value="active" className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <DataTableNew table={table} columns={employeesColumns} />
        </div>
        <DataTablePagination table={table} />
      </TabsContent>
      
      <TabsContent value="inactive" className="flex flex-col">
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <div className="mb-4">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-sm font-medium mb-1 text-foreground">No hay empleados inactivos</h3>
          <p className="text-xs">Los empleados dados de baja aparecerán aquí</p>
        </div>
      </TabsContent>
      
      <TabsContent value="all" className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <DataTableNew table={table} columns={employeesColumns} />
        </div>
        <DataTablePagination table={table} />
      </TabsContent>
      
      <TabsContent value="recent" className="flex flex-col">
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <div className="mb-4">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3 className="text-sm font-medium mb-1 text-foreground">Empleados recientes</h3>
          <p className="text-xs">Los últimos empleados registrados aparecerán aquí</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}