"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTeamEmployees, removeEmployeeFromTeam, type TeamEmployee } from "@/server/actions/teams";

import { AssignEmployeeDialog } from "./assign-employee-dialog";

interface TeamEmployeesTabProps {
  teamId: string;
  teamName: string;
}

export function TeamEmployeesTab({ teamId, teamName }: TeamEmployeesTabProps) {
  const [employees, setEmployees] = useState<TeamEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingEmployeeId, setRemovingEmployeeId] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const { success, employees: data, error } = await getTeamEmployees(teamId);
      if (success && data) {
        setEmployees(data);
      } else {
        setEmployees([]);
        toast.error(error ?? "No se pudieron cargar los empleados del equipo");
      }
    } catch (error) {
      console.error("Error loading team employees", error);
      toast.error("No se pudieron cargar los empleados del equipo");
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleRemoveEmployee = async (employee: TeamEmployee) => {
    setRemovingEmployeeId(employee.id);
    try {
      const { success, error } = await removeEmployeeFromTeam(employee.id);
      if (success) {
        toast.success(`${employee.firstName} ${employee.lastName} ha sido quitado del equipo`);
        loadEmployees();
      } else {
        toast.error(error ?? "Error al quitar empleado del equipo");
      }
    } finally {
      setRemovingEmployeeId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empleados del Equipo</CardTitle>
          <CardDescription>Empleados asignados a {teamName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <span className="text-muted-foreground ml-2">Cargando empleados...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Empleados del Equipo</CardTitle>
          <CardDescription>
            {employees.length} empleado{employees.length !== 1 ? "s" : ""} asignado{employees.length !== 1 ? "s" : ""} a{" "}
            {teamName}
          </CardDescription>
        </div>
        <AssignEmployeeDialog teamId={teamId} teamName={teamName} onEmployeeAssigned={loadEmployees} />
      </CardHeader>
      <CardContent>
        {employees.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </span>
                        {employee.employeeNumber && (
                          <span className="text-muted-foreground text-xs">{employee.employeeNumber}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.email ? (
                        <span className="text-sm">{employee.email}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.jobTitle ? (
                        <span className="text-sm">{employee.jobTitle}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin puesto</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={employee.isActive ? "default" : "secondary"}
                        className={employee.isActive ? "bg-green-500/10 text-green-700 dark:text-green-400" : ""}
                      >
                        {employee.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={removingEmployeeId === employee.id}
                          >
                            {removingEmployeeId === employee.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Quitar del equipo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas quitar a{" "}
                              <span className="font-medium">
                                {employee.firstName} {employee.lastName}
                              </span>{" "}
                              del equipo &quot;{teamName}&quot;?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveEmployee(employee)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Quitar del equipo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="mx-auto h-12 w-12" />}
            title="Sin empleados asignados"
            description="Este equipo aún no tiene empleados. Usa el botón para asignar empleados al equipo."
            action={<AssignEmployeeDialog teamId={teamId} teamName={teamName} onEmployeeAssigned={loadEmployees} />}
          />
        )}
      </CardContent>
    </Card>
  );
}
