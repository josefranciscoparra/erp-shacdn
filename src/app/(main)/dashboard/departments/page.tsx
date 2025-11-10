"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Plus, Building2, Loader2, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { DepartmentData, useDepartmentsStore } from "@/stores/departments-store";

import { DepartmentDialog } from "./_components/department-dialog";
import { DepartmentsDataTable } from "./_components/departments-data-table";

export default function DepartmentsPage() {
  const departments = useDepartmentsStore((state) => state.departments);
  const isLoading = useDepartmentsStore((state) => state.isLoading);
  const error = useDepartmentsStore((state) => state.error);
  const fetchDepartments = useDepartmentsStore((state) => state.fetchDepartments);
  const deleteDepartment = useDepartmentsStore((state) => state.deleteDepartment);
  const resetStore = useDepartmentsStore((state) => state.reset);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentData | null>(null);
  const [costCenters, setCostCenters] = useState<Array<{ id: string; name: string; code: string | null }>>([]);
  const [employees, setEmployees] = useState<
    Array<{ id: string; firstName: string; lastName: string; secondLastName: string | null; email: string | null }>
  >([]);
  const [loadingData, setLoadingData] = useState(false);

  const hasLoadedRef = useRef(false);

  const loadSupportData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [costCentersResponse, employeesResponse] = await Promise.all([
        fetch("/api/cost-centers"),
        fetch("/api/employees"),
      ]);

      if (costCentersResponse.ok) {
        const costCentersData = await costCentersResponse.json();
        setCostCenters(costCentersData);
      }

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error("Error cargando datos de soporte:", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    void fetchDepartments();
    void loadSupportData();
  }, [fetchDepartments, loadSupportData]);

  useEffect(() => {
    return () => {
      resetStore();
      hasLoadedRef.current = false;
    };
  }, [resetStore]);

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setDialogOpen(true);
  };

  const handleDelete = async (department) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el departamento "${department.name}"?`)) {
      try {
        const response = await fetch(`/api/departments/${department.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error ?? "Error al eliminar departamento");
        }

        deleteDepartment(department.id);
        await fetchDepartments(); // Refrescar la lista
      } catch (error) {
        console.error("Error al eliminar departamento:", error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDepartment(null);
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Departamentos" subtitle="Gestiona los departamentos de tu organización" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando departamentos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Departamentos" subtitle="Gestiona los departamentos de tu organización" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar departamentos: {error}</span>
        </div>
      </div>
    );
  }

  const hasDepartments = departments.length > 0;

  return (
    <PermissionGuard
      permission="view_departments"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Departamentos" subtitle="Gestiona los departamentos de tu organización" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Departamentos</h1>
            <p className="text-muted-foreground text-sm">Gestiona los departamentos de tu organización</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo departamento</span>
            </Button>
          </div>
        </div>

        {hasDepartments ? (
          <DepartmentsDataTable data={departments} onEdit={handleEdit} onDelete={handleDelete} />
        ) : (
          <EmptyState
            icon={<Building2 className="mx-auto h-12 w-12" />}
            title="No hay departamentos registrados"
            description="Comienza agregando tu primer departamento al sistema"
            actionLabel="Agregar primer departamento"
            onAction={() => setDialogOpen(true)}
          />
        )}

        <DepartmentDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          department={editingDepartment}
          costCenters={costCenters}
          employees={employees}
        />
      </div>
    </PermissionGuard>
  );
}
