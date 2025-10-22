"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";

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
import { DepartmentData } from "@/stores/departments-store";

interface DepartmentsColumnsProps {
  onEdit?: (department: DepartmentData) => void;
  onDelete?: (department: DepartmentData) => void;
}

export const createDepartmentsColumns = ({
  onEdit,
  onDelete,
}: DepartmentsColumnsProps = {}): ColumnDef<DepartmentData>[] => [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => {
      const department = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{department.name}</span>
          {department.description && (
            <span className="text-muted-foreground max-w-[300px] truncate text-sm">{department.description}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "manager",
    header: "Responsable",
    cell: ({ row }) => {
      const manager = row.original.manager;
      if (!manager) {
        return <span className="text-muted-foreground">Sin asignar</span>;
      }

      const fullName = [manager.firstName, manager.lastName, manager.secondLastName].filter(Boolean).join(" ");

      return (
        <div className="flex flex-col">
          <span className="font-medium">{fullName}</span>
          {manager.email && <span className="text-muted-foreground text-sm">{manager.email}</span>}
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
        return <span className="text-muted-foreground">Sin asignar</span>;
      }

      return (
        <div className="flex flex-col">
          <span className="font-medium">{costCenter.name}</span>
          {costCenter.code && <span className="text-muted-foreground text-sm">{costCenter.code}</span>}
        </div>
      );
    },
    filterFn: (row, id, filterValue) => {
      const costCenter = row.original.costCenter;
      if (!costCenter) return false;
      return filterValue.includes(costCenter.id);
    },
  },
  {
    accessorKey: "_count.employmentContracts",
    header: "Empleados",
    cell: ({ row }) => {
      const count = row.original._count?.employmentContracts ?? 0;
      return (
        <div className="flex items-center gap-2">
          <Users className="text-muted-foreground h-4 w-4" />
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
      const department = row.original;

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(department.id)}>Copiar ID</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit?.(department)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar departamento
            </DropdownMenuItem>
            {department.active && (
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(department)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar departamento
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const departmentsColumns = createDepartmentsColumns();
