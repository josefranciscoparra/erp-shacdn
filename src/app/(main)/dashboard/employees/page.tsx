"use client";

import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { EmployeesDataTable } from "./_components/employees-data-table";
import { Plus, UserRound } from "lucide-react";
import { Employee } from "./types";

const sampleEmployees: Employee[] = [
  {
    id: "1",
    name: "Ana García",
    email: "ana.garcia@empresa.com",
    department: "Recursos Humanos",
    position: "Generalista RRHH",
    status: "Activo",
    startDate: "2023-01-10",
  },
  {
    id: "2",
    name: "Carlos López",
    email: "carlos.lopez@empresa.com",
    department: "Finanzas",
    position: "Contable Senior",
    status: "Activo",
    startDate: "2022-06-01",
  },
  {
    id: "3",
    name: "María Pérez",
    email: "maria.perez@empresa.com",
    department: "Operaciones",
    position: "Coordinadora",
    status: "Pendiente",
    startDate: "2024-03-15",
  },
];

export default function EmployeesPage() {
  const hasEmployees = sampleEmployees.length > 0;
  
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Empleados"
        subtitle="Gestiona los empleados de tu organización"
        actionHref="/dashboard/employees/new"
        actionLabel="Nuevo empleado"
        actionIcon={<Plus className="h-4 w-4" />}
      />

      {hasEmployees ? (
        <EmployeesDataTable data={sampleEmployees} />
      ) : (
        <EmptyState
          icon={<UserRound className="mx-auto h-12 w-12" />}
          title="No hay empleados registrados"
          description="Comienza agregando tu primer empleado al sistema"
          actionHref="/dashboard/employees/new"
          actionLabel="Agregar primer empleado"
        />
      )}
    </div>
  );
}
