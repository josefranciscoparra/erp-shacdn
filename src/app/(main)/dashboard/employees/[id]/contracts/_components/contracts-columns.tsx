"use client";

import { ColumnDef } from "@tanstack/react-table";
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
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { MoreHorizontal, Edit, Trash2, Eye, FileText } from "lucide-react";
import { Contract } from "@/stores/contracts-store";

const CONTRACT_TYPES = {
  INDEFINIDO: "Indefinido",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas",
  FORMACION: "Formación",
  OBRA_SERVICIO: "Obra o Servicio",
  EVENTUAL: "Eventual",
  INTERINIDAD: "Interinidad",
} as const;

export const contractsColumns: ColumnDef<Contract>[] = [
  {
    accessorKey: "contractType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo de Contrato" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("contractType") as keyof typeof CONTRACT_TYPES;
      const typeLabel = CONTRACT_TYPES[type] || type;
      
      const getTypeVariant = (type: string) => {
        switch (type) {
          case "INDEFINIDO":
            return "default";
          case "TEMPORAL":
            return "secondary";
          case "PRACTICAS":
            return "outline";
          default:
            return "secondary";
        }
      };

      return (
        <Badge variant={getTypeVariant(type)} className="font-medium">
          {typeLabel}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "position",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Puesto" />
    ),
    cell: ({ row }) => {
      const position = row.getValue("position") as Contract["position"];
      return (
        <div className="space-y-1">
          <div className="font-medium">
            {position?.title || (
              <span className="text-muted-foreground">Sin puesto asignado</span>
            )}
          </div>
          {position?.level && (
            <div className="text-muted-foreground text-xs">
              Nivel: {position.level}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Departamento" />
    ),
    cell: ({ row }) => {
      const department = row.getValue("department") as Contract["department"];
      return (
        <div className="font-medium">
          {department?.name || (
            <span className="text-muted-foreground">Sin departamento</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "costCenter",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Centro de Coste" />
    ),
    cell: ({ row }) => {
      const costCenter = row.getValue("costCenter") as Contract["costCenter"];
      return (
        <div className="space-y-1">
          <div className="font-medium">
            {costCenter?.name || (
              <span className="text-muted-foreground">Sin centro</span>
            )}
          </div>
          {costCenter?.code && (
            <div className="text-muted-foreground font-mono text-xs">
              {costCenter.code}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha Inicio" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("startDate"));
      return (
        <div className="font-medium">
          {date.toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "endDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha Fin" />
    ),
    cell: ({ row }) => {
      const endDate = row.getValue("endDate") as string | null;
      if (!endDate) {
        return (
          <span className="text-muted-foreground text-sm">Sin fecha</span>
        );
      }
      const date = new Date(endDate);
      return (
        <div className="font-medium">
          {date.toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "weeklyHours",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Jornada" />
    ),
    cell: ({ row }) => {
      const hours = row.getValue("weeklyHours") as number;
      return (
        <div className="font-medium">
          {hours}h/semana
        </div>
      );
    },
  },
  {
    accessorKey: "grossSalary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Salario Bruto" />
    ),
    cell: ({ row }) => {
      const salary = row.getValue("grossSalary") as number | null;
      if (!salary) {
        return (
          <span className="text-muted-foreground text-sm">No especificado</span>
        );
      }
      return (
        <div className="font-medium text-green-600">
          {new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(salary)}
        </div>
      );
    },
  },
  {
    accessorKey: "manager",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Responsable" />
    ),
    cell: ({ row }) => {
      const manager = row.getValue("manager") as Contract["manager"];
      if (!manager) {
        return (
          <span className="text-muted-foreground text-sm">Sin responsable</span>
        );
      }
      return (
        <div className="font-medium">
          {manager.firstName} {manager.lastName}
          {manager.secondLastName && ` ${manager.secondLastName}`}
        </div>
      );
    },
  },
  {
    accessorKey: "active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const active = row.getValue("active") as boolean;
      return (
        <Badge variant={active ? "default" : "secondary"} className="font-medium">
          {active ? "Activo" : "Finalizado"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      const active = row.getValue(id) as boolean;
      if (value === "active") return active;
      if (value === "inactive") return !active;
      return true;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const contract = row.original;

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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(contract.id)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Editar contrato
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Finalizar contrato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];