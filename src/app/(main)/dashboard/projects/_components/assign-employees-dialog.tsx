"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { assignEmployeesToProject, getAvailableEmployeesForProject } from "@/server/actions/projects";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
}

interface AssignEmployeesDialogProps {
  projectId: string;
  projectName: string;
  onAssigned?: () => void;
}

export function AssignEmployeesDialog({ projectId, projectName, onAssigned }: AssignEmployeesDialogProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const { success, employees: data } = await getAvailableEmployeesForProject(projectId);
      if (success && data) {
        setEmployees(data);
        setFilteredEmployees(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadEmployees();
      setSelectedIds(new Set());
      setSearchTerm("");
    }
  }, [open, loadEmployees]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    if (!term) {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(
        employees.filter(
          (emp) =>
            emp.firstName.toLowerCase().includes(term) ||
            emp.lastName.toLowerCase().includes(term) ||
            (emp.employeeNumber?.toLowerCase().includes(term) ?? false),
        ),
      );
    }
  }, [searchTerm, employees]);

  const toggleEmployee = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    try {
      const { success, error, assignedCount } = await assignEmployeesToProject(projectId, Array.from(selectedIds));
      if (success) {
        toast.success(`${assignedCount} empleado(s) asignado(s) correctamente`);
        setOpen(false);
        onAssigned?.();
      } else {
        toast.error(error ?? "Error al asignar empleados");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Asignar Empleados
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Asignar Empleados</DialogTitle>
          <DialogDescription>
            Selecciona los empleados a asignar al proyecto &quot;{projectName}
            &quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar empleados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de empleados */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              <span className="text-muted-foreground ml-2">Cargando empleados...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              {searchTerm
                ? "No se encontraron empleados con ese criterio"
                : "Todos los empleados ya están asignados a este proyecto"}
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-1 pr-4">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors"
                    onClick={() => toggleEmployee(employee.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(employee.id)}
                      onCheckedChange={() => toggleEmployee(employee.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(employee.firstName, employee.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {employee.firstName} {employee.lastName}
                      </p>
                    </div>
                    {employee.employeeNumber && (
                      <span className="text-muted-foreground font-mono text-xs">{employee.employeeNumber}</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <span className="text-muted-foreground text-sm">{selectedIds.size} seleccionado(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={selectedIds.size === 0 || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Check className="mr-2 h-4 w-4" />
                Asignar
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
