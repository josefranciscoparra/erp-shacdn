"use client";

import Link from "next/link";

import { type ColumnDef } from "@tanstack/react-table";
import { Sun, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { type Contract } from "@/stores/contracts-store";

export function getSchedulesColumns(): ColumnDef<Contract>[] {
  return [
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
      header: "Empleado",
      cell: ({ row }) => {
        const employee = row.original.employee;
        if (!employee) {
          return <span className="text-muted-foreground">Sin empleado</span>;
        }

        const fullName = `${employee.firstName} ${employee.lastName}`;
        const photoUrl = employee.photoUrl ?? null;

        return (
          <Link
            href={`/dashboard/employees/${employee.id}/schedules`}
            className="flex items-center gap-3 hover:underline"
          >
            <Avatar className="h-8 w-8">
              {photoUrl ? <AvatarImage src={photoUrl} alt={fullName} /> : null}
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{fullName}</span>
              {employee.employeeNumber && (
                <span className="text-muted-foreground font-mono text-xs">{employee.employeeNumber}</span>
              )}
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: "position",
      header: "Puesto",
      cell: ({ row }) => {
        const position = row.original.position;
        if (!position) {
          return <span className="text-muted-foreground text-sm">Sin puesto</span>;
        }

        return (
          <div className="flex flex-col">
            <span className="text-sm">{position.title}</span>
            {position.level?.name && <span className="text-muted-foreground text-xs">{position.level.name}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "weeklyHours",
      header: "Horas Semanales",
      cell: ({ row }) => {
        const weeklyHours = row.original.weeklyHours;
        return <span className="font-semibold">{weeklyHours}h</span>;
      },
    },
    {
      accessorKey: "workingDaysPerWeek",
      header: "Días Laborables",
      cell: ({ row }) => {
        const days = row.original.workingDaysPerWeek ?? 5;
        const dailyHours = row.original.weeklyHours / days;

        return (
          <div className="flex flex-col">
            <span className="font-medium">{days} días</span>
            <span className="text-muted-foreground text-xs">{dailyHours.toFixed(2)}h/día</span>
          </div>
        );
      },
    },
    {
      accessorKey: "hasCustomWeeklyPattern",
      header: "Patrón",
      cell: ({ row }) => {
        const hasCustom = row.original.hasCustomWeeklyPattern;

        return hasCustom ? (
          <Badge variant="outline" className="text-xs">
            Personalizado
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">Estándar</span>
        );
      },
    },
    {
      accessorKey: "hasIntensiveSchedule",
      header: "Jornada Intensiva",
      cell: ({ row }) => {
        const hasIntensive = row.original.hasIntensiveSchedule;

        if (!hasIntensive) {
          return <span className="text-muted-foreground text-xs">No</span>;
        }

        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="w-fit border-orange-300 text-orange-700">
              <Sun className="mr-1 h-3 w-3" />
              Sí
            </Badge>
            {row.original.intensiveStartDate && row.original.intensiveEndDate && (
              <span className="text-muted-foreground text-xs">
                {row.original.intensiveStartDate} - {row.original.intensiveEndDate}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "department",
      header: "Departamento",
      cell: ({ row }) => {
        const department = row.original.department;
        if (!department) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }

        return <span className="text-sm">{department.name}</span>;
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const employeeId = row.original.employee?.id;

        if (!employeeId) return null;

        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/employees/${employeeId}/schedules`}>Ver Horarios</Link>
            </Button>
          </div>
        );
      },
    },
  ];
}
