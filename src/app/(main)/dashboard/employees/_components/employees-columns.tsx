"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Employee } from "../types";

export const employeesColumns: ColumnDef<Employee>[] = [
  {
    accessorKey: "name",
    header: "Empleado",
    cell: ({ row }) => {
      const employee = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              <UserRound className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{employee.name}</span>
              <Badge variant={employee.status === "Activo" ? "default" : employee.status === "Baja" ? "destructive" : "secondary"}>
                {employee.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{employee.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "department",
    header: "Departamento",
    cell: ({ row }) => row.getValue("department"),
    meta: {
      className: "hidden md:table-cell",
    },
  },
  {
    accessorKey: "position",
    header: "Puesto",
    cell: ({ row }) => row.getValue("position"),
    meta: {
      className: "hidden sm:table-cell",
    },
  },
  {
    accessorKey: "startDate",
    header: "Fecha alta",
    cell: ({ row }) => {
      const date = new Date(row.getValue("startDate"));
      return date.toLocaleDateString();
    },
    meta: {
      className: "hidden lg:table-cell",
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const employee = row.original;

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem>Ver perfil</DropdownMenuItem>
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem>Ver contratos</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Dar de baja
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    meta: {
      className: "w-0",
    },
  },
];