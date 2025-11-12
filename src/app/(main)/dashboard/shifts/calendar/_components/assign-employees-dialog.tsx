"use client";

import { useEffect, useState } from "react";

import type { Shift } from "@prisma/client";
import { Search, X, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useShiftAssignmentsStore } from "@/stores/shift-assignments-store";

type ShiftWithRelations = Shift & {
  position: { id: string; title: string } | null;
  costCenter: { id: string; name: string };
  template: { id: string; name: string; color: string } | null;
  assignments: Array<{
    id: string;
    employeeId: string;
    status: string;
  }>;
};

interface AssignEmployeesDialogProps {
  shift: ShiftWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentChange?: () => void;
}

export function AssignEmployeesDialog({ shift, open, onOpenChange, onAssignmentChange }: AssignEmployeesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  const {
    availableEmployees,
    assignments,
    isLoading,
    fetchAvailableEmployees,
    fetchShiftAssignments,
    assignEmployee,
    unassignEmployee,
    reset,
  } = useShiftAssignmentsStore();

  // Cargar datos al abrir el dialog
  useEffect(() => {
    if (open) {
      fetchAvailableEmployees(shift.costCenterId);
      fetchShiftAssignments(shift.id);
    } else {
      reset();
      setSelectedEmployeeIds([]);
      setSearchQuery("");
    }
  }, [open, shift.id, shift.costCenterId, fetchAvailableEmployees, fetchShiftAssignments, reset]);

  const currentAssignedIds = assignments.map((a) => a.employeeId);
  const availableCount = shift.requiredHeadcount - currentAssignedIds.length;
  const isFullyCovered = currentAssignedIds.length >= shift.requiredHeadcount;

  // Filtrar empleados por búsqueda
  const filteredEmployees = availableEmployees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName} ${emp.secondLastName ?? ""}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || emp.employeeNumber.includes(query);
  });

  // Empleados disponibles (no asignados)
  const unassignedEmployees = filteredEmployees.filter((emp) => !currentAssignedIds.includes(emp.id));

  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    );
  };

  const handleAssignSelected = async () => {
    if (selectedEmployeeIds.length === 0) {
      toast.error("Selecciona al menos un empleado");
      return;
    }

    // Validar que no exceda la cobertura requerida
    if (currentAssignedIds.length + selectedEmployeeIds.length > shift.requiredHeadcount) {
      toast.error(`Solo puedes asignar ${availableCount} empleado(s) más`);
      return;
    }

    try {
      // Asignar empleados uno por uno
      for (const employeeId of selectedEmployeeIds) {
        await assignEmployee(shift.id, employeeId);
      }

      toast.success(`${selectedEmployeeIds.length} empleado(s) asignado(s) correctamente`);
      setSelectedEmployeeIds([]);

      // Notificar cambio para refrescar el turno
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al asignar empleados");
    }
  };

  const handleUnassign = async (assignmentId: string, employeeName: string) => {
    try {
      await unassignEmployee(assignmentId);
      toast.success(`${employeeName} desasignado correctamente`);

      // Notificar cambio
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al desasignar empleado");
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asignar Empleados al Turno</DialogTitle>
          <DialogDescription>
            {shift.startTime} - {shift.endTime} • {shift.costCenter.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cobertura actual */}
          <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-5 w-5" />
              <span className="font-medium">Cobertura:</span>
            </div>
            <Badge variant={isFullyCovered ? "default" : "destructive"} className="text-sm">
              {currentAssignedIds.length} / {shift.requiredHeadcount}
            </Badge>
          </div>

          {/* Empleados actualmente asignados */}
          {assignments.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Empleados Asignados</h4>
              <ScrollArea className="max-h-32 rounded-lg border">
                <div className="space-y-2 p-2">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="bg-muted/50 flex items-center justify-between rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(assignment.employee.firstName, assignment.employee.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {assignment.employee.firstName} {assignment.employee.lastName}
                          </p>
                          <p className="text-muted-foreground text-xs">{assignment.employee.employeeNumber}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          handleUnassign(
                            assignment.id,
                            `${assignment.employee.firstName} ${assignment.employee.lastName}`,
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Alerta si está completamente cubierto */}
          {isFullyCovered && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El turno ya está completamente cubierto. Desasigna empleados para asignar otros.
              </AlertDescription>
            </Alert>
          )}

          {/* Búsqueda de empleados */}
          {!isFullyCovered && (
            <>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nombre o número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Lista de empleados disponibles */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Empleados Disponibles ({unassignedEmployees.length})</h4>
                <ScrollArea className="h-64 rounded-lg border">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center p-4">
                      <p className="text-muted-foreground text-sm">Cargando empleados...</p>
                    </div>
                  ) : unassignedEmployees.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4">
                      <p className="text-muted-foreground text-sm">
                        {searchQuery ? "No se encontraron empleados" : "No hay empleados disponibles"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {unassignedEmployees.map((employee) => {
                        const isSelected = selectedEmployeeIds.includes(employee.id);
                        return (
                          <div
                            key={employee.id}
                            className={`hover:bg-muted/50 flex items-center gap-3 rounded-md p-2 transition-colors ${
                              isSelected ? "bg-muted" : ""
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleEmployee(employee.id)}
                              disabled={
                                !isSelected &&
                                currentAssignedIds.length + selectedEmployeeIds.length >= shift.requiredHeadcount
                              }
                            />
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={employee.photoUrl ?? undefined} />
                              <AvatarFallback>{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {employee.firstName} {employee.lastName} {employee.secondLastName}
                              </p>
                              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                <span>{employee.employeeNumber}</span>
                                {employee.position && (
                                  <>
                                    <span>•</span>
                                    <span>{employee.position.title}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!isFullyCovered && selectedEmployeeIds.length > 0 && (
            <Button onClick={handleAssignSelected} disabled={isLoading}>
              Asignar {selectedEmployeeIds.length} empleado(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
