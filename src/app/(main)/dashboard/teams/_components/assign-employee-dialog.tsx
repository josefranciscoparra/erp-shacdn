"use client";

import { useEffect, useState } from "react";

import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addEmployeeToTeam, getAvailableEmployeesForTeam, type TeamEmployee } from "@/server/actions/teams";

interface AssignEmployeeDialogProps {
  teamId: string;
  teamName: string;
  onEmployeeAssigned?: () => void;
}

type AvailableEmployee = TeamEmployee & {
  currentTeam?: { id: string; name: string } | null;
};

export function AssignEmployeeDialog({ teamId, teamName, onEmployeeAssigned }: AssignEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<AvailableEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadAvailableEmployees();
    } else {
      setSelectedEmployeeId("");
    }
  }, [open]);

  async function loadAvailableEmployees() {
    setIsLoading(true);
    try {
      const { success, employees: data, error } = await getAvailableEmployeesForTeam(teamId);
      if (success && data) {
        setEmployees(data);
      } else {
        setEmployees([]);
        toast.error(error ?? "No se pudieron cargar los empleados disponibles");
      }
    } catch (error) {
      console.error("Error loading available employees for team", error);
      toast.error("No se pudieron cargar los empleados disponibles");
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedEmployeeId) {
      toast.error("Selecciona un empleado");
      return;
    }

    setIsSubmitting(true);
    try {
      const { success, error } = await addEmployeeToTeam(teamId, selectedEmployeeId);
      if (success) {
        const employee = employees.find((e) => e.id === selectedEmployeeId);
        toast.success(`${employee?.firstName} ${employee?.lastName} ha sido asignado al equipo`);
        setOpen(false);
        onEmployeeAssigned?.();
      } else {
        toast.error(error ?? "Error al asignar empleado");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Separar empleados sin equipo de los que tienen otro equipo
  const employeesWithoutTeam = employees.filter((e) => !e.currentTeam);
  const employeesWithOtherTeam = employees.filter((e) => e.currentTeam);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Asignar Empleado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Asignar Empleado al Equipo</DialogTitle>
          <DialogDescription>Selecciona un empleado para añadirlo al equipo &quot;{teamName}&quot;.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className={cn("w-full justify-between", !selectedEmployeeId && "text-muted-foreground")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando empleados...
                  </span>
                ) : selectedEmployee ? (
                  <span>
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                    {selectedEmployee.employeeNumber && (
                      <span className="text-muted-foreground ml-2">({selectedEmployee.employeeNumber})</span>
                    )}
                  </span>
                ) : (
                  "Seleccionar empleado"
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0">
              <Command>
                <CommandInput placeholder="Buscar por nombre o número..." />
                <CommandList>
                  <CommandEmpty>{isLoading ? "Cargando..." : "No se encontraron empleados disponibles"}</CommandEmpty>
                  {employeesWithoutTeam.length > 0 && (
                    <CommandGroup heading="Sin equipo asignado">
                      {employeesWithoutTeam.map((employee) => (
                        <CommandItem
                          key={employee.id}
                          value={`${employee.firstName} ${employee.lastName} ${employee.employeeNumber ?? ""}`}
                          onSelect={() => {
                            setSelectedEmployeeId(employee.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              employee.id === selectedEmployeeId ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-1 flex-col">
                            <span>
                              {employee.firstName} {employee.lastName}
                            </span>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              {employee.employeeNumber && <span>{employee.employeeNumber}</span>}
                              {employee.jobTitle && (
                                <>
                                  {employee.employeeNumber && <span>·</span>}
                                  <span>{employee.jobTitle}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {employeesWithOtherTeam.length > 0 && (
                    <CommandGroup heading="Ya asignados a otro equipo">
                      {employeesWithOtherTeam.map((employee) => (
                        <CommandItem
                          key={employee.id}
                          value={`${employee.firstName} ${employee.lastName} ${employee.employeeNumber ?? ""}`}
                          onSelect={() => {
                            setSelectedEmployeeId(employee.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              employee.id === selectedEmployeeId ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-1 flex-col">
                            <span>
                              {employee.firstName} {employee.lastName}
                            </span>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              {employee.employeeNumber && <span>{employee.employeeNumber}</span>}
                              {employee.currentTeam && (
                                <Badge variant="outline" className="text-xs">
                                  {employee.currentTeam.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Aviso si el empleado seleccionado ya tiene equipo */}
          {selectedEmployee?.currentTeam && (
            <div className="bg-warning/10 text-warning-foreground mt-4 rounded-lg border border-amber-500/20 p-3 text-sm">
              <p>
                <span className="font-medium">Atención:</span> Este empleado ya está asignado al equipo{" "}
                <span className="font-medium">&quot;{selectedEmployee.currentTeam.name}&quot;</span>. Si continúas, será
                movido a este equipo.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedEmployeeId || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Asignando...
              </>
            ) : (
              "Asignar al Equipo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
