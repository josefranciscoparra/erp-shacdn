"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProjectAssignments,
  removeEmployeeFromProject,
  type ProjectAssignmentDetail,
} from "@/server/actions/projects";

import { AssignEmployeesDialog } from "./assign-employees-dialog";

interface ProjectEmployeesTabProps {
  projectId: string;
  projectName: string;
  accessType: "OPEN" | "ASSIGNED";
}

export function ProjectEmployeesTab({ projectId, projectName, accessType }: ProjectEmployeesTabProps) {
  const [assignments, setAssignments] = useState<ProjectAssignmentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { success, assignments: data } = await getProjectAssignments(projectId);
      if (success && data) {
        setAssignments(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleRemove = async (employeeId: string, employeeName: string) => {
    setRemovingId(employeeId);
    try {
      const { success, error } = await removeEmployeeFromProject(projectId, employeeId);
      if (success) {
        toast.success(`${employeeName} desasignado del proyecto`);
        loadAssignments();
      } else {
        toast.error(error ?? "Error al desasignar empleado");
      }
    } finally {
      setRemovingId(null);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando empleados...</span>
        </CardContent>
      </Card>
    );
  }

  // Si el proyecto es OPEN, mostrar mensaje informativo
  if (accessType === "OPEN") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Empleados con Acceso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-blue-500/20 bg-blue-50 p-4 dark:bg-blue-500/10">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Este proyecto es de <strong>acceso abierto</strong>. Todos los empleados de la organización pueden fichar
              tiempo en este proyecto.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Empleados Asignados ({assignments.length})
        </CardTitle>
        <AssignEmployeesDialog projectId={projectId} projectName={projectName} onAssigned={loadAssignments} />
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="text-muted-foreground mb-2 h-10 w-10" />
            <p className="text-muted-foreground">No hay empleados asignados a este proyecto</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Usa el botón &quot;Asignar Empleados&quot; para añadir empleados
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(assignment.employee.firstName, assignment.employee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {assignment.employee.firstName} {assignment.employee.lastName}
                    </p>
                    {assignment.employee.employeeNumber && (
                      <p className="text-muted-foreground font-mono text-sm">
                        {assignment.employee.employeeNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assignment.role && <Badge variant="secondary">{assignment.role}</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      handleRemove(
                        assignment.employee.id,
                        `${assignment.employee.firstName} ${assignment.employee.lastName}`,
                      )
                    }
                    disabled={removingId === assignment.employee.id}
                  >
                    {removingId === assignment.employee.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
