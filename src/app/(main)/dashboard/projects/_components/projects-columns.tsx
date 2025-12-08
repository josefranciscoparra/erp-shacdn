"use client";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { Clock, Eye, Globe, Lock, MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2, Users } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectListItem } from "@/server/actions/projects";

export interface ProjectsColumnsProps {
  onEdit?: (project: ProjectListItem) => void;
  onToggleStatus?: (project: ProjectListItem) => void;
  onDelete?: (project: ProjectListItem) => void;
}

export function createProjectsColumns({
  onEdit,
  onToggleStatus,
  onDelete,
}: ProjectsColumnsProps = {}): ColumnDef<ProjectListItem>[] {
  return [
    {
      accessorKey: "name",
      header: "Proyecto",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex items-center gap-2">
            {project.color && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />}
            <div className="flex flex-col">
              <span className="font-medium">{project.name}</span>
              {project.code && <span className="text-muted-foreground text-sm">{project.code}</span>}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "accessType",
      header: "Tipo de Acceso",
      cell: ({ row }) => {
        const accessType = row.original.accessType;
        const isOpen = accessType === "OPEN";
        return (
          <Badge
            variant="outline"
            className={
              isOpen
                ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                : "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
            }
          >
            {isOpen ? (
              <>
                <Globe className="mr-1 h-3 w-3" />
                Abierto
              </>
            ) : (
              <>
                <Lock className="mr-1 h-3 w-3" />
                Asignado
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: "_count.assignments",
      header: "Asignados",
      cell: ({ row }) => {
        const count = row.original._count.assignments;
        const accessType = row.original.accessType;
        if (accessType === "OPEN") {
          return <span className="text-muted-foreground text-sm">Todos</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "_count.timeEntries",
      header: "Fichajes",
      cell: ({ row }) => {
        const count = row.original._count.timeEntries;
        return (
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Estado",
      cell: ({ row }) => {
        const active = row.getValue("isActive");
        return (
          <Badge
            variant={active ? "default" : "secondary"}
            className={active ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}
          >
            {active ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const project = row.original;

        return (
          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalle
                  </Link>
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onToggleStatus && (
                  <DropdownMenuItem onClick={() => onToggleStatus(project)}>
                    {project.isActive ? (
                      <>
                        <ToggleLeft className="mr-2 h-4 w-4" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <ToggleRight className="mr-2 h-4 w-4" />
                        Activar
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(project.id)}>Copiar ID</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estas seguro de que deseas eliminar el proyecto &quot;
                  {project.name}&quot;?
                  {project._count.timeEntries > 0 && (
                    <span className="text-destructive mt-2 block font-medium">
                      Este proyecto tiene {project._count.timeEntries} fichaje(s) asociado(s). No se puede eliminar.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete?.(project)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={project._count.timeEntries > 0}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      },
    },
  ];
}

export const projectsColumns: ColumnDef<ProjectListItem>[] = createProjectsColumns();
