"use client";

import { useEffect } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Plus, UserRound, Loader2, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { useEmployeesStore } from "@/stores/employees-store";

import { EmployeesDataTable } from "./_components/employees-data-table";

export default function EmployeesPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { employees, isLoading, error, fetchEmployees } = useEmployeesStore();

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Empleados"
          subtitle="Gestiona los empleados de tu organización"
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/employees/new" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Alta manual
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/employees/import" className="whitespace-nowrap">
                  Importar desde archivo
                </Link>
              </Button>
            </div>
          }
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando empleados...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Empleados" subtitle="Gestiona los empleados de tu organización" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar empleados: {error}</span>
        </div>
      </div>
    );
  }

  const hasEmployees = employees.length > 0;

  return (
    <PermissionGuard
      permission="view_employees"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Empleados" subtitle="Gestiona los empleados de tu organización" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Empleados" subtitle="Gestiona los empleados de tu organización" />

        {hasEmployees ? (
          <EmployeesDataTable data={employees} highlightId={highlightId} />
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
    </PermissionGuard>
  );
}
