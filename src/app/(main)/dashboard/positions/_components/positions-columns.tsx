"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
import { Position } from "@/stores/organization-store";

interface PositionsColumnsProps {
  onEdit?: (position: Position) => void;
  onDelete?: (position: Position) => void;
}

export const createPositionsColumns = ({ onEdit, onDelete }: PositionsColumnsProps = {}): ColumnDef<Position>[] => [
  {
    accessorKey: "title",
    header: "Título del Puesto",
    cell: ({ row }) => {
      const position = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{position.title}</span>
          {position.description && (
            <span className="text-muted-foreground max-w-[400px] truncate text-sm">{position.description}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "level",
    header: "Nivel",
    cell: ({ row }) => {
      const levelValue = row.getValue("level");
      if (!levelValue) {
        return <span className="text-muted-foreground">Sin especificar</span>;
      }
      const levelLabel = typeof levelValue === "string" ? levelValue : levelValue?.name;
      if (!levelLabel) {
        return <span className="text-muted-foreground">Sin especificar</span>;
      }
      return <Badge variant="outline">{levelLabel}</Badge>;
    },
    filterFn: (row, id, filterValue) => {
      const level = row.original.level;
      if (!level) return false;
      return filterValue.includes(level.id);
    },
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) => {
      const active = row.getValue("active");
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
    accessorKey: "createdAt",
    header: "Fecha de Creación",
    cell: ({ row }) => {
      const date = row.getValue("createdAt");
      return (
        <span className="text-muted-foreground text-sm">{format(new Date(date), "dd/MM/yyyy", { locale: es })}</span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const position = row.original;

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(position.id)}>Copiar ID</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit?.(position)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar puesto
            </DropdownMenuItem>
            {position.active && (
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(position)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar puesto
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const positionsColumns = createPositionsColumns();
