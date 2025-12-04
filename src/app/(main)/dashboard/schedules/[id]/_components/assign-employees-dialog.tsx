"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { Users, Search, X } from "lucide-react";
import { toast } from "sonner";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAvailableEmployeesForTemplate, assignScheduleToEmployee } from "@/server/actions/schedules-v2";

interface AssignEmployeesDialogProps {
  templateId: string;
  templateName: string;
}

type AvailableEmployee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
};

export function AssignEmployeesDialog({ templateId, templateName }: AssignEmployeesDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Cargar empleados disponibles cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      loadAvailableEmployees();
    }
  }, [open]);

  async function loadAvailableEmployees() {
    try {
      const employees = await getAvailableEmployeesForTemplate(templateId);
      setAvailableEmployees(employees);
    } catch (error) {
      console.error("Error loading available employees:", error);
      toast.error("Error al cargar empleados", {
        description: "No se pudieron cargar los empleados disponibles",
      });
    }
  }

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    );
  }

  function toggleAll() {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
    }
  }

  async function handleAssign() {
    if (selectedEmployeeIds.length === 0) {
      toast.error("Selecciona al menos un empleado", {
        description: "Debes seleccionar al menos un empleado para asignar",
      });
      return;
    }

    setIsLoading(true);

    try {
      let successCount = 0;
      let errorCount = 0;
      let closedAssignmentsCount = 0;

      // Asignar cada empleado seleccionado
      for (const employeeId of selectedEmployeeIds) {
        const result = await assignScheduleToEmployee({
          employeeId,
          scheduleTemplateId: templateId,
          validFrom: new Date(),
          validTo: undefined,
          isActive: true,
        });

        if (result.success) {
          successCount++;
          // Contar asignaciones previas cerradas
          if (result.data?.closedPreviousAssignments) {
            closedAssignmentsCount += result.data.closedPreviousAssignments;
          }
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        let description = `Se ha${successCount > 1 ? "n" : ""} asignado correctamente a "${templateName}"`;
        // Informar si se cerraron asignaciones previas
        if (closedAssignmentsCount > 0) {
          description += `. ${closedAssignmentsCount} asignación${closedAssignmentsCount > 1 ? "es" : ""} anterior${closedAssignmentsCount > 1 ? "es fueron cerradas" : " fue cerrada"}.`;
        }
        toast.success(`${successCount} empleado${successCount > 1 ? "s" : ""} asignado${successCount > 1 ? "s" : ""}`, {
          description,
        });
        setOpen(false);
        setSelectedEmployeeIds([]);
        router.refresh();
      }

      if (errorCount > 0) {
        toast.error(`Error al asignar ${errorCount} empleado${errorCount > 1 ? "s" : ""}`, {
          description: "Algunos empleados no pudieron ser asignados",
        });
      }
    } catch (error) {
      console.error("Error assigning employees:", error);
      toast.error("Error al asignar empleados", {
        description: "Ha ocurrido un error al asignar los empleados",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Filtrar empleados por búsqueda
  const filteredEmployees = availableEmployees.filter((employee) => {
    const query = searchQuery.toLowerCase();
    return (
      employee.fullName.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      employee.employeeNumber.toLowerCase().includes(query) ||
      employee.department.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="mr-2 h-4 w-4" />
          Asignar Empleados
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Asignar Empleados a {templateName}</DialogTitle>
          <DialogDescription>Selecciona los empleados que utilizarán esta plantilla de horario</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nombre, email, número..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-1 h-7 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Selección rápida */}
          {filteredEmployees.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {selectedEmployeeIds.length} de {filteredEmployees.length} seleccionado
                {selectedEmployeeIds.length !== 1 ? "s" : ""}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
                {selectedEmployeeIds.length === filteredEmployees.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </Button>
            </div>
          )}

          {/* Lista de empleados */}
          <ScrollArea className="h-[400px] rounded-lg border">
            {filteredEmployees.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center p-8 text-center">
                <Users className="mb-2 h-12 w-12 opacity-50" />
                <p className="font-medium">
                  {searchQuery ? "No se encontraron empleados" : "No hay empleados disponibles"}
                </p>
                <p className="text-sm">
                  {searchQuery
                    ? "Intenta con otro término de búsqueda"
                    : "Todos los empleados ya están asignados a esta plantilla"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-3">
                    <Checkbox
                      id={`employee-${employee.id}`}
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onCheckedChange={() => toggleEmployee(employee.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`employee-${employee.id}`}
                        className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                      >
                        {employee.fullName}
                        <Badge variant="outline" className="text-xs">
                          {employee.employeeNumber}
                        </Badge>
                      </label>
                      <p className="text-muted-foreground text-xs">{employee.email}</p>
                      <p className="text-muted-foreground text-xs">{employee.department}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={isLoading || selectedEmployeeIds.length === 0}>
            {isLoading
              ? "Asignando..."
              : `Asignar ${selectedEmployeeIds.length > 0 ? `(${selectedEmployeeIds.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
