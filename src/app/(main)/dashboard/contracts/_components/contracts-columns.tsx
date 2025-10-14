"use client";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Edit, Trash2, Eye, FileText, UserRound } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "employee",
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      const employee = row.getValue("employee");
      if (!employee) {
        return <span className="text-muted-foreground text-sm">Sin empleado</span>;
      }

      const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

      return (
        <div className="space-y-1">
          <Link
            href={`/dashboard/employees/${employee.id}/contracts`}
            className="text-foreground hover:text-primary font-medium hover:underline"
          >
            {fullName}
          </Link>
          {employee.employeeNumber && (
            <div className="text-muted-foreground font-mono text-xs">#{employee.employeeNumber}</div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "contractType",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Contrato" />,
    cell: ({ row }) => {
      const type = row.getValue("contractType");
      const typeLabel = CONTRACT_TYPES[type] ?? type;

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
        return <span className="text-muted-foreground text-sm">Sin fecha</span>;
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
      if (!salary) {
        return <span className="text-muted-foreground text-sm">No especificado</span>;
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
    accessorKey: "active",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const active = row.getValue("active");
      return (
        <Badge
          variant={active ? "default" : "secondary"}
          className={active ? "bg-green-500/10 font-medium text-green-700 dark:text-green-400" : "font-medium"}
        >
          {active ? "Activo" : "Finalizado"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      const active = row.getValue(id);
      if (value === "active") return active;
      if (value === "inactive") return !active;
      return true;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const contract = row.original;
      const employee = contract.employee;

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
            {employee && (
              <>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/employees/${employee.id}`}>
                    <UserRound className="mr-2 h-4 w-4" />
                    Ver empleado
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/employees/${employee.id}/contracts`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Ver contratos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contract.id)}>
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
