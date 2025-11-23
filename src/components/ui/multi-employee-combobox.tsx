"use client";

import { useState, useEffect, useCallback } from "react";

import { Check, ChevronsUpDown, Search, Loader2, User, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

interface MultiEmployeeComboboxProps {
  value?: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  minChars?: number;
}

export function MultiEmployeeCombobox({
  value = [],
  onValueChange,
  placeholder = "Seleccionar empleados...",
  disabled = false,
  minChars = 2,
}: MultiEmployeeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

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

  // Cargar detalles de empleados seleccionados inicialmente (si vienen IDs pero no objetos)
  useEffect(() => {
    // Esta lógica es compleja si vienen muchos IDs, por ahora asumimos que el padre gestiona
    // o que si seleccionas se añade al estado local.
    // Para simplificar: si value cambia y no tenemos los objetos, habría que fetchearlos.
    // Por rendimiento, vamos a confiar en que la búsqueda y selección va rellenando esto.
    
    // Si queremos ser puristas, deberíamos hacer un fetchAllByIds(value) aquí.
    // De momento lo dejamos simple: solo carga si buscas y seleccionas.
  }, [value]);

  const handleSelect = (employee: Employee) => {
    const isSelected = value.includes(employee.id);
    let newValues: string[];
    let newSelectedObjects: Employee[];

    if (isSelected) {
      newValues = value.filter((id) => id !== employee.id);
      newSelectedObjects = selectedEmployees.filter((emp) => emp.id !== employee.id);
    } else {
      newValues = [...value, employee.id];
      newSelectedObjects = [...selectedEmployees, employee];
    }
    
    onValueChange(newValues);
    setSelectedEmployees(newSelectedObjects);
    // No cerramos el popover para permitir selección múltiple rápida
  };
  
  const removeSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newValues = value.filter((v) => v !== id);
    onValueChange(newValues);
    setSelectedEmployees(selectedEmployees.filter((emp) => emp.id !== id));
  };

  const normalizedSearch = searchQuery.trim();
  const hasQuery = normalizedSearch.length > 0;
  const meetsMinChars = normalizedSearch.length === 0 ? minChars === 0 : normalizedSearch.length >= minChars;
  const shouldShowHint = minChars > 0 && (!hasQuery || normalizedSearch.length < minChars);

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between"
            disabled={disabled}
          >
            <span className="text-muted-foreground truncate">
              {value.length === 0 
                ? placeholder 
                : `${value.length} empleado${value.length === 1 ? '' : 's'} seleccionado${value.length === 1 ? '' : 's'}`}
            </span>
            <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                    {employees.map((employee) => {
                       const isSelected = value.includes(employee.id);
                       return (
                        <CommandItem
                          key={employee.id}
                          value={employee.id}
                          onSelect={() => handleSelect(employee)}
                          className="cursor-pointer py-3"
                        >
                          <div className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                          )}>
                            <Check className={cn("h-4 w-4")} />
                          </div>
                          
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
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected tags */}
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEmployees.map((emp) => (
            <Badge key={emp.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
              <span className="truncate max-w-[200px]">{emp.fullName}</span>
              <button 
                onClick={(e) => removeSelection(e, emp.id)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Eliminar</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
