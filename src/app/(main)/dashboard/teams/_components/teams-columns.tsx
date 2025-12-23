"use client";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Building2, Users, UserCog, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

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
import type { TeamListItem } from "@/server/actions/teams";

export interface TeamsColumnsProps {
  onEdit?: (team: TeamListItem) => void;
  onToggleStatus?: (team: TeamListItem) => void;
  onDelete?: (team: TeamListItem) => void;
  canManage?: boolean;
}

export function createTeamsColumns({
  onEdit,
  onToggleStatus,
  onDelete,
  canManage = false,
}: TeamsColumnsProps = {}): ColumnDef<TeamListItem>[] {
  return [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => {
        const team = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{team.name}</span>
            {team.code && <span className="text-muted-foreground text-sm">Código: {team.code}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "costCenter",
      header: "Centro de Coste",
      cell: ({ row }) => {
        const costCenter = row.original.costCenter;
        if (!costCenter) {
          return <span className="text-muted-foreground">Sin centro asignado</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <Building2 className="text-muted-foreground h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-sm">{costCenter.name}</span>
              {costCenter.code && <span className="text-muted-foreground text-xs">Código: {costCenter.code}</span>}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "_count.employees",
      header: "Empleados",
      cell: ({ row }) => {
        const count = row.original._count.employees;
        return (
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">{count}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "_count.areaResponsibles",
      header: "Responsables",
      cell: ({ row }) => {
        const count = row.original._count.areaResponsibles;
        return (
          <div className="flex items-center gap-2">
            <UserCog className="text-muted-foreground h-4 w-4" />
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
        const team = row.original;

        return (
          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/teams/${team.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalle
                  </Link>
                </DropdownMenuItem>
                {canManage && (
                  <>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(team)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onToggleStatus && (
                      <DropdownMenuItem onClick={() => onToggleStatus(team)}>
                        {team.isActive ? (
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
                  </>
                )}
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(team.id)}>Copiar ID</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro de que deseas eliminar el equipo &quot;{team.name}&quot;?
                  {team._count.employees > 0 && (
                    <span className="text-destructive mt-2 block font-medium">
                      Este equipo tiene {team._count.employees} empleado(s) asignado(s). Debes desasignarlos primero.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete?.(team)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={team._count.employees > 0}
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

// Export por compatibilidad con código existente (sin acciones)
export const teamsColumns: ColumnDef<TeamListItem>[] = createTeamsColumns();
