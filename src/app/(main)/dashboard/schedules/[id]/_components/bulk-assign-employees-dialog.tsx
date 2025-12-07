"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { Users, Search, X, Filter, Calendar } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  getEmployeesForBulkAssignment,
  bulkAssignScheduleToEmployees,
  getDepartmentsForFilters,
  getCostCentersForFilters,
  type BulkAssignmentFilters,
} from "@/server/actions/schedules-v2";

interface BulkAssignEmployeesDialogProps {
  templateId: string;
  templateName: string;
}

type AvailableEmployee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
  departmentId: string | null;
  contractType: string | null;
  currentSchedule: string | null;
  hasOtherSchedule: boolean;
};

type Department = {
  id: string;
  name: string;
  employeeCount: number;
};

type CostCenter = {
  id: string;
  name: string;
  code?: string;
  employeeCount: number;
};

export function BulkAssignEmployeesDialog({ templateId, templateName }: BulkAssignEmployeesDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  // Filtros
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedCostCenterIds, setSelectedCostCenterIds] = useState<string[]>([]);
  const [selectedContractType, setSelectedContractType] = useState<string>("");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [validTo, setValidTo] = useState("");
  const [rotationBlockedCount, setRotationBlockedCount] = useState(0);

  // Cargar departamentos, centros de coste y empleados disponibles cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      loadDepartments();
      loadCostCenters();
      loadAvailableEmployees();
    }
  }, [open]);

  // Recargar empleados cuando cambian los filtros
  useEffect(() => {
    if (open) {
      loadAvailableEmployees();
    }
  }, [selectedDepartmentIds, selectedCostCenterIds, selectedContractType]);

  async function loadDepartments() {
    try {
      const depts = await getDepartmentsForFilters();
      setDepartments(depts);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  }

  async function loadCostCenters() {
    try {
      const centers = await getCostCentersForFilters();
      setCostCenters(centers);
    } catch (error) {
      console.error("Error loading cost centers:", error);
    }
  }

  async function loadAvailableEmployees() {
    try {
      const filters: BulkAssignmentFilters = {
        ...(selectedDepartmentIds.length > 0 && { departmentIds: selectedDepartmentIds }),
        ...(selectedCostCenterIds.length > 0 && { costCenterIds: selectedCostCenterIds }),
        ...(selectedContractType && { contractType: selectedContractType }),
      };

      const { employees, rotationBlockedCount } = await getEmployeesForBulkAssignment(templateId, filters);
      setAvailableEmployees(employees);
      setRotationBlockedCount(rotationBlockedCount);
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
      const result = await bulkAssignScheduleToEmployees(
        selectedEmployeeIds,
        templateId,
        new Date(validFrom),
        validTo ? new Date(validTo) : null,
      );

      if (result.success && result.data) {
        const { successCount, errorCount, errors } = result.data;

        if (successCount > 0) {
          toast.success(
            `${successCount} empleado${successCount > 1 ? "s" : ""} asignado${successCount > 1 ? "s" : ""}`,
            {
              description: `Se ha${successCount > 1 ? "n" : ""} asignado correctamente a "${templateName}"`,
            },
          );
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("schedule-template:assignments-updated", { detail: { templateId } }));
          }
          setOpen(false);
          setSelectedEmployeeIds([]);
          router.refresh();
        }

        if (errorCount > 0) {
          toast.error(`Error al asignar ${errorCount} empleado${errorCount > 1 ? "s" : ""}`, {
            description: errors.length > 0 ? errors[0] : "Algunos empleados no pudieron ser asignados",
          });
        }
      } else {
        toast.error("Error al asignar empleados", {
          description: result.error ?? "Ha ocurrido un error al asignar los empleados",
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
          Asignación Masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Asignación Masiva a {templateName}</DialogTitle>
          <DialogDescription>
            Asigna esta plantilla a múltiples empleados de una vez. Usa filtros para facilitar la selección.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda y toggle de filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
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
            <Button
              type="button"
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>

          {rotationBlockedCount > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <AlertDescription className="text-sm">
                {rotationBlockedCount === 1
                  ? "Hay 1 empleado con una rotación activa. Las rotaciones se gestionan desde la sección de turnos y no aparecen en esta lista."
                  : `Hay ${rotationBlockedCount} empleados con una rotación activa. Las rotaciones se gestionan desde la sección de turnos y no aparecen en esta lista.`}
              </AlertDescription>
            </Alert>
          )}

          {/* Panel de filtros */}
          {showFilters && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Filtro por departamento */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Departamento</Label>
                  <Select
                    value={selectedDepartmentIds[0] ?? "all"}
                    onValueChange={(value) => setSelectedDepartmentIds(value === "all" ? [] : [value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los departamentos</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name} ({dept.employeeCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por centro de coste */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Centro de Coste</Label>
                  <Select
                    value={selectedCostCenterIds[0] ?? "all"}
                    onValueChange={(value) => setSelectedCostCenterIds(value === "all" ? [] : [value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los centros</SelectItem>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.code ? `${center.code} - ` : ""}
                          {center.name} ({center.employeeCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por tipo de contrato */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tipo de Contrato</Label>
                  <Select
                    value={selectedContractType || "all"}
                    onValueChange={(value) => setSelectedContractType(value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="PERMANENT">Indefinido</SelectItem>
                      <SelectItem value="TEMPORARY">Temporal</SelectItem>
                      <SelectItem value="INTERNSHIP">Becario</SelectItem>
                      <SelectItem value="FREELANCE">Autónomo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Fechas de vigencia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    <Calendar className="mr-1 inline-block h-3 w-3" />
                    Desde
                  </Label>
                  <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    <Calendar className="mr-1 inline-block h-3 w-3" />
                    Hasta (opcional)
                  </Label>
                  <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                </div>
              </div>
            </div>
          )}

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
          <ScrollArea className="h-[320px] rounded-lg border">
            {filteredEmployees.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center p-8 text-center">
                <Users className="mb-2 h-12 w-12 opacity-50" />
                <p className="font-medium">
                  {searchQuery ||
                  selectedDepartmentIds.length > 0 ||
                  selectedCostCenterIds.length > 0 ||
                  selectedContractType
                    ? "No se encontraron empleados"
                    : "No hay empleados disponibles"}
                </p>
                <p className="text-sm">
                  {searchQuery ||
                  selectedDepartmentIds.length > 0 ||
                  selectedCostCenterIds.length > 0 ||
                  selectedContractType
                    ? "Intenta ajustar los filtros o búsqueda"
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
                        className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-medium"
                      >
                        {employee.fullName}
                        <Badge variant="outline" className="text-xs">
                          {employee.employeeNumber}
                        </Badge>
                        {employee.contractType && (
                          <Badge variant="secondary" className="text-xs">
                            {employee.contractType}
                          </Badge>
                        )}
                        {employee.hasOtherSchedule && (
                          <Badge
                            variant="secondary"
                            className="border-amber-200 bg-amber-50 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          >
                            Actual: {employee.currentSchedule}
                          </Badge>
                        )}
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
