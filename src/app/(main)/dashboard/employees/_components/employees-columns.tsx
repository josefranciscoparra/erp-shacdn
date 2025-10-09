"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { Employee } from "../types";

import { EmployeeActions } from "./employee-actions";

export const employeesColumns: ColumnDef<Employee>[] = [
  {
    accessorKey: "employeeNumber",
    header: "Nº Empleado",
    cell: ({ row }) => {
      const employee = row.original;
      return <span className="font-mono text-xs">{employee.employeeNumber ?? "Sin asignar"}</span>;
    },
    meta: {
      className: "hidden lg:table-cell w-20",
    },
  },
  {
    id: "employee",
    header: "Empleado",
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
              <span className="text-foreground font-medium">{fullName}</span>
              <Badge variant={employee.active ? "default" : "destructive"}>
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
    id: "department",
    header: "Departamento",
    cell: ({ row }) => {
      const employee = row.original;
      return employee.department?.name ?? "Sin asignar";
    },
    meta: {
      className: "hidden md:table-cell",
    },
  },
  {
    id: "position",
    header: "Puesto",
    cell: ({ row }) => {
      const employee = row.original;
      return employee.position?.title ?? "Sin asignar";
    },
    meta: {
      className: "hidden sm:table-cell",
    },
  },
  {
    id: "startDate",
    header: "Fecha alta",
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
    id: "contractType",
    header: "Tipo contrato",
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
