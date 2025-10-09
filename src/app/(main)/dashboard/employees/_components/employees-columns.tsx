"use client";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { Employee } from "../types";

import { EmployeeActions } from "./employee-actions";

export const employeesColumns: ColumnDef<Employee>[] = [
  {
    accessorKey: "employeeNumber",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nº Empleado" />,
    cell: ({ row }) => {
      const employee = row.original;
      return <span className="font-mono text-xs">{employee.employeeNumber ?? "Sin asignar"}</span>;
    },
    meta: {
      className: "hidden lg:table-cell w-20",
    },
  },
  {
    accessorKey: "firstName",
    id: "employee",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
    cell: ({ row }) => {
      const employee = row.original;
      const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;
      const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();

      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/employees/${employee.id}`}
                className="text-foreground hover:text-primary font-medium hover:underline"
              >
                {fullName}
              </Link>
              <Badge
                variant={employee.active ? "default" : "secondary"}
                className={
                  employee.active ? "bg-green-500/10 font-medium text-green-700 dark:text-green-400" : "font-medium"
                }
              >
                {employee.active ? "Activo" : "Inactivo"}
              </Badge>
              {employee.user && (
                <Badge variant="secondary" className="text-xs">
                  {employee.user.role}
                </Badge>
              )}
            </div>
            <span className="text-muted-foreground text-xs">{employee.email ?? "Sin email"}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "department.name",
    id: "department",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Departamento" />,
    cell: ({ row }) => {
      const employee = row.original;
      return employee.department?.name ?? "Sin asignar";
    },
    meta: {
      className: "hidden md:table-cell",
    },
    filterFn: (row, id, value) => {
      const departmentName = row.original.department?.name;
      return value.includes(departmentName);
    },
  },
  {
    accessorKey: "position.title",
    id: "position",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Puesto" />,
    cell: ({ row }) => {
      const employee = row.original;
      return employee.position?.title ?? "Sin asignar";
    },
    meta: {
      className: "hidden sm:table-cell",
    },
    filterFn: (row, id, value) => {
      const positionTitle = row.original.position?.title;
      return value.includes(positionTitle);
    },
  },
  {
    accessorKey: "startDate",
    id: "startDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha alta" />,
    cell: ({ row }) => {
      const employee = row.original;
      const currentContract = employee.employmentContracts.find((c) => c.active);
      if (!currentContract) return "Sin contrato";

      const date = new Date(currentContract.startDate);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
    meta: {
      className: "hidden lg:table-cell",
    },
  },
  {
    accessorKey: "contractType",
    id: "contractType",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo contrato" />,
    cell: ({ row }) => {
      const employee = row.original;
      const currentContract = employee.employmentContracts.find((c) => c.active);
      if (!currentContract) return "Sin contrato";

      return (
        <Badge variant="outline" className="text-xs">
          {currentContract.contractType}
        </Badge>
      );
    },
    meta: {
      className: "hidden xl:table-cell",
    },
    filterFn: (row, id, value) => {
      const currentContract = row.original.employmentContracts.find((c) => c.active);
      return value.includes(currentContract?.contractType);
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const employee = row.original;
      return <EmployeeActions employee={employee} />;
    },
    meta: {
      className: "w-0",
    },
  },
];
