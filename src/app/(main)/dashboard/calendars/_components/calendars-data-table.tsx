"use client";

import * as React from "react";
import { Plus, Calendar } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { calendarsColumns } from "./calendars-columns";
import { CalendarData } from "@/stores/calendars-store";
import { ImportHolidaysDialog } from "./import-holidays-dialog";

export function CalendarsDataTable({ data }: { data: CalendarData[] }) {
  const [activeTab, setActiveTab] = React.useState("all");

  // Filtrar datos según la pestaña activa
  const filteredData = React.useMemo(() => {
    switch (activeTab) {
      case "national":
        return data.filter((cal) => cal.calendarType === "NATIONAL_HOLIDAY");
      case "local":
        return data.filter((cal) => cal.calendarType === "LOCAL_HOLIDAY");
      case "corporate":
        return data.filter((cal) => cal.calendarType === "CORPORATE_EVENT");
      case "active":
        return data.filter((cal) => cal.active);
      case "all":
        return data;
      default:
        return data;
    }
  }, [data, activeTab]);

  const table = useDataTableInstance({
    data: filteredData,
    columns: calendarsColumns,
    getRowId: (row) => row.id.toString(),
  });

  // Contadores para badges
  const counts = React.useMemo(
    () => ({
      all: data.length,
      national: data.filter((cal) => cal.calendarType === "NATIONAL_HOLIDAY").length,
      local: data.filter((cal) => cal.calendarType === "LOCAL_HOLIDAY").length,
      corporate: data.filter((cal) => cal.calendarType === "CORPORATE_EVENT").length,
      active: data.filter((cal) => cal.active).length,
    }),
    [data]
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          Vista de calendarios
        </Label>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Seleccionar vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({counts.all})</SelectItem>
            <SelectItem value="active">Activos ({counts.active})</SelectItem>
            <SelectItem value="national">Nacional ({counts.national})</SelectItem>
            <SelectItem value="local">Local ({counts.local})</SelectItem>
            <SelectItem value="corporate">Corporativo ({counts.corporate})</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="all">
            Todos <Badge variant="secondary">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Activos <Badge variant="secondary">{counts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="national">
            Nacional <Badge variant="secondary">{counts.national}</Badge>
          </TabsTrigger>
          <TabsTrigger value="local">
            Local <Badge variant="secondary">{counts.local}</Badge>
          </TabsTrigger>
          <TabsTrigger value="corporate">
            Corporativo <Badge variant="secondary">{counts.corporate}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <ImportHolidaysDialog />
          <Button size="sm" asChild>
            <Link href="/dashboard/calendars/new">
              <Plus />
              <span className="hidden lg:inline">Nuevo calendario</span>
            </Link>
          </Button>
        </div>
      </div>

      {["all", "active", "national", "local", "corporate"].map((tab) => (
        <TabsContent key={tab} value={tab} className="relative flex flex-col gap-4 overflow-auto">
          {filteredData.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-lg border">
                <DataTableNew table={table} columns={calendarsColumns} />
              </div>
              <DataTablePagination table={table} />
            </>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4">
                <Calendar className="text-muted-foreground/30 mx-auto h-12 w-12" />
              </div>
              <h3 className="text-foreground mb-1 text-sm font-medium">
                {tab === "all" && "No hay calendarios registrados"}
                {tab === "active" && "No hay calendarios activos"}
                {tab === "national" && "No hay calendarios nacionales"}
                {tab === "local" && "No hay calendarios locales"}
                {tab === "corporate" && "No hay calendarios corporativos"}
              </h3>
              <p className="text-xs">
                {tab === "all" && "Comienza creando tu primer calendario"}
                {tab !== "all" && "Los calendarios de este tipo aparecerán aquí"}
              </p>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
