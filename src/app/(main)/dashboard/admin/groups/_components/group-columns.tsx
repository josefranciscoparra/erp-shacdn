"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, MoreHorizontal, RotateCcw, Trash2, XCircle } from "lucide-react";

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

import type { OrganizationGroupRow } from "./types";

interface GroupColumnsProps {
  onManageGroup: (group: OrganizationGroupRow) => void;
  onDeactivate: (group: OrganizationGroupRow) => void;
  onReactivate: (group: OrganizationGroupRow) => void;
  onDelete: (group: OrganizationGroupRow) => void;
}

export const createGroupColumns = ({
  onManageGroup,
  onDeactivate,
  onReactivate,
  onDelete,
}: GroupColumnsProps): ColumnDef<OrganizationGroupRow>[] => [
  {
    accessorKey: "name",
    header: "Grupo",
    cell: ({ row }) => {
      const group = row.original;
      return (
        <div className="space-y-1">
          <p className="font-medium">{group.name}</p>
          {group.description && <p className="text-muted-foreground text-xs">{group.description}</p>}
        </div>
      );
    },
  },
  {
    accessorKey: "organizationsCount",
    header: "Orgs",
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.organizationsCount}</span>,
  },
  {
    accessorKey: "membersCount",
    header: "Miembros",
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.membersCount}</span>,
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return isActive ? (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Activo
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300">
          <XCircle className="mr-1 h-3 w-3" />
          Inactivo
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onManageGroup(row.original)}>Gestionar grupo</DropdownMenuItem>
          <DropdownMenuSeparator />
          {row.original.isActive ? (
            <DropdownMenuItem onClick={() => onDeactivate(row.original)}>
              <Ban className="mr-2 h-3.5 w-3.5" />
              Dar de baja
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={() => onReactivate(row.original)}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Reactivar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(row.original)} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Limpiar (hard)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
