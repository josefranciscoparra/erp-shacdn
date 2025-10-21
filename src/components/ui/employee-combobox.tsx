"use client";

import { useState, useEffect, useCallback } from "react";

import { Check, ChevronsUpDown, Search, Loader2, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  fullName: string;
  employeeNumber: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
}

interface EmployeeComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  minChars?: number;
}

export function EmployeeCombobox({
  value,
  onValueChange,
  placeholder = "Selecciona responsable",
  emptyText = "Sin responsable asignado",
  disabled = false,
  minChars = 0,
}: EmployeeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Buscar empleados con debounce
  const searchEmployees = useCallback(async (query: string) => {
    const normalizedQuery = query.trim();
    const canSearch = normalizedQuery.length === 0 ? minChars === 0 : normalizedQuery.length >= minChars;

    if (!canSearch) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) {
        params.set("q", query);
      }
      params.set("limit", "50");

      const response = await fetch(`/api/employees/search?${params.toString()}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[EmployeeCombobox] Query: "${query}" | Recibidos: ${data.length} empleados`);
        if (query.toLowerCase().includes("maría") || query.toLowerCase().includes("maria")) {
          const marias = data.filter(
            (e: Employee) =>
              e.fullName.toLowerCase().includes("maría") || e.fullName.toLowerCase().includes("maria"),
          );
          console.log(`[EmployeeCombobox] Marías en la lista:`, marias);
        }
        setEmployees(data);
      }
    } catch (error) {
      console.error("Error al buscar empleados:", error);
    } finally {
      setIsLoading(false);
    }
  }, [minChars]);

  // Cargar empleados iniciales cuando se abre el popover
  useEffect(() => {
    if (open && employees.length === 0 && minChars === 0) {
      searchEmployees("");
    }
  }, [open, searchEmployees, employees.length, minChars]);

  // Buscar con debounce cuando cambia el query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        searchEmployees(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, open, searchEmployees]);

  // Cargar empleado seleccionado si existe
  useEffect(() => {
    if (value && value !== "__none__" && !selectedEmployee) {
      // Buscar empleado en la lista actual
      const found = employees.find((emp) => emp.id === value);
      if (found) {
        setSelectedEmployee(found);
      } else {
        // Si no está en la lista, hacer una búsqueda específica
        fetch(`/api/employees/search?limit=1`, { credentials: "include" })
          .then((res) => res.json())
          .then((data) => {
            const emp = data.find((e: Employee) => e.id === value);
            if (emp) {
              setSelectedEmployee(emp);
            }
          })
          .catch(console.error);
      }
    } else if (!value || value === "__none__") {
      setSelectedEmployee(null);
    }
  }, [value, employees, selectedEmployee]);

  const handleSelect = (employeeId: string) => {
    if (employeeId === "__none__") {
      setSelectedEmployee(null);
      onValueChange("__none__");
    } else {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (employee) {
        setSelectedEmployee(employee);
        onValueChange(employeeId);
      }
    }
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEmployee(null);
    onValueChange("__none__");
  };

  const normalizedSearch = searchQuery.trim();
  const hasQuery = normalizedSearch.length > 0;
  const meetsMinChars = normalizedSearch.length === 0 ? minChars === 0 : normalizedSearch.length >= minChars;
  const shouldShowHint = minChars > 0 && (!hasQuery || normalizedSearch.length < minChars);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedEmployee ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <User className="text-muted-foreground h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col items-start overflow-hidden">
                <span className="truncate font-medium">{selectedEmployee.fullName}</span>
                {selectedEmployee.position && (
                  <span className="text-muted-foreground truncate text-xs">{selectedEmployee.position}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {selectedEmployee && !disabled && (
              <X className="text-muted-foreground h-4 w-4 opacity-50 hover:opacity-100" onClick={handleClear} />
            )}
            <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
            <CommandInput
              placeholder="Buscar empleado..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                <span className="text-muted-foreground ml-2 text-sm">Buscando...</span>
              </div>
            ) : shouldShowHint ? (
              <div className="text-muted-foreground flex items-center justify-center py-6 text-sm">
                Escribe al menos {minChars} caracteres para buscar
              </div>
            ) : (
              <>
                <CommandEmpty>No se encontraron empleados</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__none__"
                    onSelect={() => handleSelect("__none__")}
                    className="cursor-pointer py-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        !value || value === "__none__" ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="text-muted-foreground italic">{emptyText}</span>
                  </CommandItem>
                  {employees.map((employee, index) => (
                    <CommandItem
                      key={`${employee.id}-${index}`}
                      value={`${employee.id}-${index}`}
                      onSelect={() => handleSelect(employee.id)}
                      className="cursor-pointer py-3"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0",
                          value === employee.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{employee.fullName}</span>
                          {employee.employeeNumber && (
                            <span className="text-muted-foreground text-xs">#{employee.employeeNumber}</span>
                          )}
                        </div>
                        {(employee.position ?? employee.department ?? employee.email) && (
                          <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                            {employee.position && <span>{employee.position}</span>}
                            {employee.position && employee.department && <span>•</span>}
                            {employee.department && <span>{employee.department}</span>}
                            {employee.email && (
                              <>
                                {(employee.position ?? employee.department) && <span>•</span>}
                                <span className="truncate">{employee.email}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
