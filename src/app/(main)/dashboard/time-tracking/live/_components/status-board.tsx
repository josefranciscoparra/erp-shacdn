"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, Users } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { EmployeeTimeTracking } from "../../_components/employee-columns";

import { EmployeeStatusCard } from "./employee-status-card";

interface StatusBoardProps {
  employees: EmployeeTimeTracking[];
  isLoading?: boolean;
}

interface StatusColumn {
  id: string;
  title: string;
  description: string;
  filter: (emp: EmployeeTimeTracking) => boolean;
  emptyMessage: string;
  headerClass: string;
}

const ITEMS_PER_COLUMN = 20; // Límite por columna

const columns: StatusColumn[] = [
  {
    id: "working",
    title: "Trabajando",
    description: "Empleados que han fichado entrada y están activos",
    filter: (emp) => emp.status === "CLOCKED_IN",
    emptyMessage: "Nadie ha fichado entrada todavía",
    headerClass: "text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  {
    id: "break",
    title: "En pausa",
    description: "Empleados con una pausa en curso",
    filter: (emp) => emp.status === "ON_BREAK",
    emptyMessage: "No hay pausas activas en este momento",
    headerClass: "text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  },
  {
    id: "absent",
    title: "Ausentes",
    description: "Deberían estar trabajando y no han fichado",
    filter: (emp) => emp.isAbsent,
    emptyMessage: "No hay ausencias detectadas ahora",
    headerClass: "text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  {
    id: "non-working",
    title: "Sin jornada hoy",
    description: "No tienen jornada programada hoy",
    filter: (emp) => !emp.isWorkingDay,
    emptyMessage: "Todos los empleados tienen jornada hoy",
    headerClass: "text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
];

export function StatusBoard({ employees, isLoading }: StatusBoardProps) {
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

  const toggleColumn = (columnId: string) => {
    setExpandedColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <div key={column.id} className="rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{column.title}</h3>
            </div>
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">Cargando...</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => {
        const columnEmployees = employees.filter(column.filter);
        const total = columnEmployees.length;
        const isExpanded = expandedColumns[column.id] ?? false;
        const displayedEmployees = isExpanded ? columnEmployees : columnEmployees.slice(0, ITEMS_PER_COLUMN);
        const hasMore = total > ITEMS_PER_COLUMN;
        const remaining = total - ITEMS_PER_COLUMN;

        return (
          <div key={column.id} className="flex flex-col rounded-lg border">
            {/* Header de la columna */}
            <div className={`border-b px-4 py-3 ${column.headerClass}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{column.title}</h3>
                <span className="bg-background rounded-full px-2 py-0.5 text-xs font-medium">{total}</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">{column.description}</p>
            </div>

            {/* Contenido de la columna */}
            <ScrollArea className="flex-1" style={{ maxHeight: isExpanded ? "600px" : "400px" }}>
              <div className="p-2">
                {total === 0 ? (
                  <div className="flex min-h-[200px] items-center justify-center">
                    <EmptyState
                      icon={<Users className="text-muted-foreground size-8" />}
                      title={column.emptyMessage}
                      description=""
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-0.5">
                      {displayedEmployees.map((employee) => (
                        <EmployeeStatusCard key={employee.id} employee={employee} />
                      ))}
                    </div>

                    {/* Botón "Ver todos" / "Ver menos" */}
                    {hasMore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full justify-between"
                        onClick={() => toggleColumn(column.id)}
                      >
                        <span className="text-xs">{isExpanded ? "Ver menos" : `Ver todos (${remaining} más)`}</span>
                        {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
