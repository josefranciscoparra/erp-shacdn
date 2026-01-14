"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Ban, Building2, Folder, MoreHorizontal, RotateCcw, Trash2, Users } from "lucide-react";

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
        <div className="flex items-start gap-3 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-slate-50 text-indigo-500 shadow-sm dark:bg-slate-900">
            <Folder className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{group.name}</span>
            {group.description && (
              <span className="line-clamp-1 max-w-[200px] text-xs text-slate-500" title={group.description}>
                {group.description}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "organizationsCount",
    header: "Organizaciones",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
        <Building2 className="h-4 w-4 text-slate-400" />
        <span className="font-medium">{row.original.organizationsCount}</span>
      </div>
    ),
  },
  {
    accessorKey: "membersCount",
    header: "Miembros",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
        <Users className="h-4 w-4 text-slate-400" />
        <span className="font-medium">{row.original.membersCount}</span>
      </div>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <div className="flex items-center">
          {isActive ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
            >
              <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Activo
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            >
              <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
              Inactivo
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onManageGroup(row.original)}>
              <Folder className="mr-2 h-3.5 w-3.5 text-indigo-500" />
              Gestionar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.original.isActive ? (
              <DropdownMenuItem
                onClick={() => onDeactivate(row.original)}
                className="text-amber-600 focus:text-amber-700"
              >
                <Ban className="mr-2 h-3.5 w-3.5" />
                Dar de baja
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => onReactivate(row.original)}
                  className="text-emerald-600 focus:text-emerald-700"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reactivar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];
