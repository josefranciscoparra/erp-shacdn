"use client";

import { useEffect, useState } from "react";

import { Plus, Building2, Loader2, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { useDepartmentsStore } from "@/stores/departments-store";

import { DepartmentDialog } from "./_components/department-dialog";
import { DepartmentsDataTable } from "./_components/departments-data-table";

export default function DepartmentsPage() {
  const { departments, isLoading, error, fetchDepartments, deleteDepartment } = useDepartmentsStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [costCenters, setCostCenters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetchDepartments();
    loadSupportData();
  }, [fetchDepartments]);

  const loadSupportData = async () => {
    setLoadingData(true);
    try {
      // Cargar centros de coste
      const costCentersResponse = await fetch("/api/cost-centers");
      if (costCentersResponse.ok) {
        const costCentersData = await costCentersResponse.json();
        setCostCenters(costCentersData);
      }

      // Cargar empleados para responsables
      const employeesResponse = await fetch("/api/employees");
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error("Error cargando datos de soporte:", error);
    } finally {
      setLoadingData(false);
    }
  };

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
        <SectionHeader title="Departamentos" subtitle="Gestiona los departamentos de tu organización" />

        {hasDepartments ? (
          <DepartmentsDataTable
            data={departments}
            onNewDepartment={() => setDialogOpen(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
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
