"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { Plus, Search, Filter, MoreHorizontal, UserRound } from "lucide-react";
import Link from "next/link";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: "Activo" | "Baja" | "Pendiente";
  startDate: string;
};

const sampleEmployees: Employee[] = [
  {
    id: "1",
    name: "Ana García",
    email: "ana.garcia@empresa.com",
    department: "Recursos Humanos",
    position: "Generalista RRHH",
    status: "Activo",
    startDate: "2023-01-10",
  },
  {
    id: "2",
    name: "Carlos López",
    email: "carlos.lopez@empresa.com",
    department: "Finanzas",
    position: "Contable Senior",
    status: "Activo",
    startDate: "2022-06-01",
  },
  {
    id: "3",
    name: "María Pérez",
    email: "maria.perez@empresa.com",
    department: "Operaciones",
    position: "Coordinadora",
    status: "Pendiente",
    startDate: "2024-03-15",
  },
];

export default function EmployeesPage() {
  const hasEmployees = sampleEmployees.length > 0;
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Empleados"
        subtitle="Gestiona los empleados de tu organización"
        actionHref="/dashboard/employees/new"
        actionLabel="Nuevo empleado"
        actionIcon={<Plus className="h-4 w-4" />}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Búsqueda y filtros</CardTitle>
          <CardDescription>Refina la lista por nombre, estado o área</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o NIF..."
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Estado</DropdownMenuLabel>
                <DropdownMenuItem>Todos</DropdownMenuItem>
                <DropdownMenuItem>Activo</DropdownMenuItem>
                <DropdownMenuItem>Baja</DropdownMenuItem>
                <DropdownMenuItem>Pendiente</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Departamento</DropdownMenuLabel>
                <DropdownMenuItem>Todos</DropdownMenuItem>
                <DropdownMenuItem>Recursos Humanos</DropdownMenuItem>
                <DropdownMenuItem>Finanzas</DropdownMenuItem>
                <DropdownMenuItem>Operaciones</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de empleados</CardTitle>
          <CardDescription>
            Todos los empleados registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasEmployees ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="hidden md:table-cell">Departamento</TableHead>
                    <TableHead className="hidden sm:table-cell">Puesto</TableHead>
                    <TableHead className="hidden lg:table-cell">Alta</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleEmployees.map((e) => (
                    <TableRow key={e.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              <UserRound className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{e.name}</span>
                              <Badge variant={e.status === "Activo" ? "default" : e.status === "Baja" ? "destructive" : "secondary"}>
                                {e.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{e.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{e.department}</TableCell>
                      <TableCell className="hidden sm:table-cell">{e.position}</TableCell>
                      <TableCell className="hidden lg:table-cell">{new Date(e.startDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Dar de baja</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<UserRound className="mx-auto h-12 w-12" />}
              title="No hay empleados registrados"
              description="Comienza agregando tu primer empleado al sistema"
              actionHref="/dashboard/employees/new"
              actionLabel="Agregar primer empleado"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
