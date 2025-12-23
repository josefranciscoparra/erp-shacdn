"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { FolderKanban, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { usePermissions } from "@/hooks/use-permissions";
import {
  deleteProject,
  getProjectById,
  getProjects,
  toggleProjectStatus,
  type ProjectDetail,
  type ProjectListItem,
} from "@/server/actions/projects";

import { CreateProjectDialog } from "./_components/create-project-dialog";
import { EditProjectDialog } from "./_components/edit-project-dialog";
import { createProjectsColumns } from "./_components/projects-columns";

export default function ProjectsPage() {
  const { hasPermission } = usePermissions();
  const canManageProjects = hasPermission("manage_projects");
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const { success, projects: data, error: err } = await getProjects();

      if (success && data) {
        setProjects(data);
      } else {
        setError(err ?? "Error al cargar proyectos");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleEdit = useCallback(async (project: ProjectListItem) => {
    // Cargar los detalles completos del proyecto para el dialog de edición
    const { success, project: projectDetail } = await getProjectById(project.id);
    if (success && projectDetail) {
      setEditingProject(projectDetail);
      setIsEditDialogOpen(true);
    } else {
      toast.error("Error al cargar los datos del proyecto");
    }
  }, []);

  const handleToggleStatus = useCallback(
    async (project: ProjectListItem) => {
      const { success, error: err } = await toggleProjectStatus(project.id);
      if (success) {
        toast.success(`Proyecto ${project.isActive ? "desactivado" : "activado"} correctamente`);
        loadProjects();
      } else {
        toast.error(err ?? "Error al cambiar el estado del proyecto");
      }
    },
    [loadProjects],
  );

  const handleDelete = useCallback(
    async (project: ProjectListItem) => {
      const { success, error: err } = await deleteProject(project.id);
      if (success) {
        toast.success("Proyecto eliminado correctamente");
        loadProjects();
      } else {
        toast.error(err ?? "Error al eliminar el proyecto");
      }
    },
    [loadProjects],
  );

  const handleProjectUpdated = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingProject(null);
    loadProjects();
    toast.success("Proyecto actualizado correctamente");
  }, [loadProjects]);

  const handleEditDialogClose = useCallback((open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingProject(null);
    }
  }, []);

  const columns = useMemo(
    () =>
      createProjectsColumns({
        onEdit: handleEdit,
        onToggleStatus: handleToggleStatus,
        onDelete: handleDelete,
        canManage: canManageProjects,
      }),
    [handleEdit, handleToggleStatus, handleDelete, canManageProjects],
  );

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Proyectos" subtitle="Gestiona los proyectos de tu organización" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando proyectos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Proyectos" subtitle="Gestiona los proyectos de tu organización" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar proyectos: {error}</span>
        </div>
      </div>
    );
  }

  const hasProjects = projects.length > 0;

  return (
    <PermissionGuard
      permissions={["view_projects", "manage_projects"]}
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Proyectos" subtitle="Gestiona los proyectos de tu organización" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Proyectos"
          subtitle="Gestiona los proyectos de tu organización"
          action={canManageProjects ? <CreateProjectDialog onProjectCreated={loadProjects} /> : null}
        />

        {hasProjects ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <DataTable table={table} columns={columns} />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<FolderKanban className="mx-auto h-12 w-12" />}
            title="No hay proyectos registrados"
            description='Crea tu primer proyecto usando el botón "Nuevo Proyecto"'
          />
        )}
      </div>

      {/* Dialog de edición con estado controlado */}
      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={isEditDialogOpen}
          onOpenChange={handleEditDialogClose}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
    </PermissionGuard>
  );
}
