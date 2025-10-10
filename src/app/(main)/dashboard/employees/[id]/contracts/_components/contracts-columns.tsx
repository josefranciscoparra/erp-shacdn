"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Edit, Trash2, Eye, FileText } from "lucide-react";

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
import type { Contract } from "@/stores/contracts-store";

const CONTRACT_TYPES = {
  INDEFINIDO: "Indefinido",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas",
  FORMACION: "Formación",
  OBRA_SERVICIO: "Obra o Servicio",
  EVENTUAL: "Eventual",
  INTERINIDAD: "Interinidad",
} as const;

interface ContractsColumnActions {
  onView?: (contract: Contract) => void;
  onEdit?: (contract: Contract) => void;
  onFinalize?: (contract: Contract) => void;
}

export const getContractsColumns = (actions: ContractsColumnActions = {}): ColumnDef<Contract>[] => [
  {
    accessorKey: "contractType",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Contrato" />,
    cell: ({ row }) => {
      const type = row.getValue("contractType");
      const typeLabel = CONTRACT_TYPES[type] ?? type;

      const variant = (() => {
        switch (type) {
          case "INDEFINIDO":
            return "default" as const;
          case "TEMPORAL":
            return "secondary" as const;
          case "PRACTICAS":
            return "outline" as const;
          default:
            return "secondary" as const;
        }
      })();

      return (
        <Badge variant={variant} className="font-medium">
          {typeLabel}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "position",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Puesto" />,
    cell: ({ row }) => {
      const position = row.getValue("position");
      return (
        <div className="space-y-1">
          <div className="font-medium">
            {position?.title ?? <span className="text-muted-foreground">Sin puesto asignado</span>}
          </div>
          {position?.level?.name && <div className="text-muted-foreground text-xs">Nivel: {position.level.name}</div>}
        </div>
      );
    },
  },
  {
    accessorKey: "department",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Departamento" />,
    cell: ({ row }) => {
      const department = row.getValue("department");
      return (
        <div className="font-medium">
          {department?.name ?? <span className="text-muted-foreground">Sin departamento</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "costCenter",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Centro de Coste" />,
    cell: ({ row }) => {
      const costCenter = row.getValue("costCenter");
      return (
        <div className="space-y-1">
          <div className="font-medium">
            {costCenter?.name ?? <span className="text-muted-foreground">Sin centro</span>}
          </div>
          {costCenter?.code && <div className="text-muted-foreground font-mono text-xs">{costCenter.code}</div>}
        </div>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Inicio" />,
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Fin" />,
    cell: ({ row }) => {
      const endDate = row.getValue("endDate");
      if (!endDate) {
        return <span className="text-muted-foreground">Sin fecha</span>;
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    cell: ({ row }) => {
      const hours = row.getValue("weeklyHours");
      return <div className="font-medium">{hours}h/semana</div>;
    },
  },
  {
    accessorKey: "grossSalary",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Salario Bruto" />,
    cell: ({ row }) => {
      const salary = row.getValue("grossSalary");
      return <div className="font-medium">{salary ? `${salary.toLocaleString("es-ES")} €` : "No especificado"}</div>;
    },
  },
  {
    accessorKey: "manager",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Responsable" />,
    cell: ({ row }) => {
      const manager = row.getValue("manager");
      if (!manager) {
        return <span className="text-muted-foreground">Sin responsable</span>;
      }

      const fullName = `${manager.firstName} ${manager.lastName}`;
      return <div className="font-medium">{fullName}</div>;
    },
  },
  {
    accessorKey: "active",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const active = row.getValue("active");
      return (
        <Badge
          variant={active ? "default" : "secondary"}
          className={active ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}
        >
          {active ? "Activo" : "Finalizado"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const contract = row.original;

      const handle =
        <T extends (...args: any[]) => void | Promise<void>>(fn: T | undefined) =>
        () => {
          if (fn) {
            fn(contract);
          }
        };

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contract.id)}>
              <FileText className="mr-2 h-4 w-4" />
              Copiar ID
            </DropdownMenuItem>
            {actions.onView && (
              <DropdownMenuItem onClick={handle(actions.onView)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handle(actions.onEdit)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar contrato
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              disabled={!contract.active}
              onClick={handle(actions.onFinalize)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Finalizar contrato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
