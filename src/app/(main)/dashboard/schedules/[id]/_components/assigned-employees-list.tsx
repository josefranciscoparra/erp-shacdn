"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users, UserMinus, Calendar } from "lucide-react";
import { toast } from "sonner";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTemplateAssignedEmployees, endEmployeeAssignment } from "@/server/actions/schedules-v2";

interface AssignedEmployeesListProps {
  templateId: string;
}

type AssignedEmployee = {
  id: string;
  employeeId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
};

export function AssignedEmployeesList({ templateId }: AssignedEmployeesListProps) {
  const [assignedEmployees, setAssignedEmployees] = useState<AssignedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadAssignedEmployees();
  }, [templateId]);

  useEffect(() => {
    function handleAssignmentsUpdated(event: Event) {
      const detail = (event as CustomEvent<{ templateId: string }>).detail;
      if (!detail || detail.templateId !== templateId) return;
      loadAssignedEmployees();
    }

    window.addEventListener("schedule-template:assignments-updated", handleAssignmentsUpdated);
    return () => {
      window.removeEventListener("schedule-template:assignments-updated", handleAssignmentsUpdated);
    };
  }, [templateId]);

  async function loadAssignedEmployees() {
    try {
      const employees = await getTemplateAssignedEmployees(templateId);
      setAssignedEmployees(employees);
    } catch (error) {
      console.error("Error loading assigned employees:", error);
      toast.error("Error al cargar empleados asignados");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string, employeeName: string) {
    try {
      const result = await endEmployeeAssignment(assignmentId, new Date());

      if (result.success) {
        toast.success("Asignación eliminada", {
          description: `Se ha desasignado a ${employeeName} de esta plantilla`,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("schedule-template:assignments-updated", { detail: { templateId } }));
          window.dispatchEvent(new CustomEvent("schedule-templates:updated"));
        }
        router.refresh();
        loadAssignedEmployees();
      } else {
        toast.error("Error al desasignar empleado", {
          description: result.error ?? "Ha ocurrido un error desconocido",
        });
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast.error("Error al desasignar empleado");
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empleados Asignados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Empleados Asignados</CardTitle>
            <Badge variant="secondary">{assignedEmployees.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {assignedEmployees.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <Users className="mb-2 h-12 w-12 opacity-50" />
            <p className="font-medium">No hay empleados asignados</p>
            <p className="text-sm">
              Usa el botón &ldquo;Asignar Empleados&rdquo; para agregar empleados a esta plantilla
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedEmployees.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{assignment.fullName}</p>
                    <Badge variant="outline" className="text-xs">
                      {assignment.employeeNumber}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{assignment.email}</p>
                  <p className="text-muted-foreground text-xs">{assignment.department}</p>
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>Desde {format(new Date(assignment.validFrom), "dd/MM/yyyy", { locale: es })}</span>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <UserMinus className="h-4 w-4" />
                      <span className="sr-only">Desasignar empleado</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Desasignar empleado?</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro de que deseas desasignar a {assignment.fullName} de esta plantilla de horario?
                        Esta acción finalizará la asignación actual.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemoveAssignment(assignment.id, assignment.fullName)}>
                        Desasignar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
