"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Pencil, Trash2, Briefcase } from "lucide-react";

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
import { PositionLevel } from "@/stores/organization-store";

interface PositionLevelsColumnsProps {
  onEdit?: (level: PositionLevel) => void;
  onDelete?: (level: PositionLevel) => void;
}

export const createPositionLevelsColumns = ({
  onEdit,
  onDelete,
}: PositionLevelsColumnsProps = {}): ColumnDef<PositionLevel>[] => [
  {
    accessorKey: "order",
    header: "Orden",
    cell: ({ row }) => {
      return (
        <Badge variant="outline" className="font-mono">
          {row.getValue("order")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => {
      const level = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{level.name}</span>
          {level.code && <span className="text-muted-foreground font-mono text-sm">{level.code}</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => {
      const description = row.getValue("description");
      if (!description) {
        return <span className="text-muted-foreground">-</span>;
      }
      return <span className="block max-w-[300px] truncate text-sm">{description}</span>;
    },
  },
  {
    accessorKey: "minSalary",
    header: "Salario Mín.",
    cell: ({ row }) => {
      const minSalary = row.getValue("minSalary");
      if (!minSalary) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span className="text-sm font-medium">
          {new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
          }).format(minSalary)}
        </span>
      );
    },
  },
  {
    accessorKey: "maxSalary",
    header: "Salario Máx.",
    cell: ({ row }) => {
      const maxSalary = row.getValue("maxSalary");
      if (!maxSalary) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span className="text-sm font-medium">
          {new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
          }).format(maxSalary)}
        </span>
      );
    },
  },
  {
    accessorKey: "_count.positions",
    header: "Puestos",
    cell: ({ row }) => {
      const count = row.original._count?.positions ?? 0;
      return (
        <div className="flex items-center gap-2">
          <Briefcase className="text-muted-foreground h-4 w-4" />
          <span>{count}</span>
        </div>
      );
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
    header: "Creado",
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
      const level = row.original;

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(level.id)}>Copiar ID</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit?.(level)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar nivel
            </DropdownMenuItem>
            {level.active && (
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(level)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar nivel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const positionLevelsColumns = createPositionLevelsColumns();
