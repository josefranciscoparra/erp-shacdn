"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AreaResponsibilityData } from "@/server/actions/area-responsibilities";

// Labels de permisos en español
const permissionLabels: Record<string, string> = {
  VIEW_EMPLOYEES: "Ver Empleados",
  MANAGE_EMPLOYEES: "Gestionar Empleados",
  VIEW_TIME_ENTRIES: "Ver Fichajes",
  MANAGE_TIME_ENTRIES: "Gestionar Fichajes",
  VIEW_ALERTS: "Ver Alertas",
  RESOLVE_ALERTS: "Resolver Alertas",
  VIEW_SCHEDULES: "Ver Horarios",
  MANAGE_SCHEDULES: "Gestionar Horarios",
  VIEW_PTO_REQUESTS: "Ver Ausencias",
  APPROVE_PTO_REQUESTS: "Aprobar Ausencias",
};

export const responsiblesColumns: ColumnDef<AreaResponsibilityData>[] = [
  {
    accessorKey: "user",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Usuario" />,
    cell: ({ row }) => {
      const user = row.original.user;

      return (
        <div className="flex min-w-[200px] flex-col">
          <span className="truncate font-medium">{user.name}</span>
          <span className="text-muted-foreground truncate text-xs">{user.email}</span>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "permissions",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Permisos" />,
    cell: ({ row }) => {
      const permissions = row.original.permissions;

      if (permissions.length === 0) {
        return <span className="text-muted-foreground text-xs">Sin permisos asignados</span>;
      }

      const visiblePermissions = permissions.slice(0, 3);
      const hiddenCount = permissions.length - 3;

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex max-w-[300px] cursor-help flex-wrap gap-1">
                {visiblePermissions.map((perm) => (
                  <Badge key={perm} variant="secondary" className="text-xs">
                    {permissionLabels[perm] ?? perm}
                  </Badge>
                ))}
                {hiddenCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    +{hiddenCount} más
                  </Badge>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold">Todos los permisos:</p>
                <div className="flex flex-wrap gap-1">
                  {permissions.map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-xs">
                      {permissionLabels[perm] ?? perm}
                    </Badge>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Asignación" />,
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);

      return <span className="text-sm whitespace-nowrap">{format(date, "d MMM yyyy", { locale: es })}</span>;
    },
    enableSorting: true,
    enableHiding: true,
    size: 150,
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const responsibility = row.original;
      const { onEdit, onDelete } = (table.options.meta as any) ?? {};

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit?.(responsibility)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Permisos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(responsibility)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar Responsable
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 50,
  },
];
