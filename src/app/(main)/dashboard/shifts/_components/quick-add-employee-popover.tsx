/**
 * Popover para añadir rápidamente un empleado a un turno
 *
 * Componente ligero para asignar empleados desde el calendario semanal por áreas.
 * Permite seleccionar empleado y horario predefinido sin abrir el diálogo completo.
 */

"use client";

import { useState } from "react";

import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useShiftsStore } from "../_store/shifts-store";

interface QuickAddEmployeePopoverProps {
  /** Fecha del turno (YYYY-MM-DD) */
  date: string;
  /** ID del centro de coste */
  costCenterId: string;
  /** ID de la zona */
  zoneId: string;
  /** Componente trigger (por defecto botón +) */
  children?: React.ReactNode;
}

/** Horarios predefinidos comunes */
const PRESET_SCHEDULES = [
  { value: "10:00-14:00", label: "Mañana (10:00 - 14:00)" },
  { value: "14:00-20:00", label: "Tarde (14:00 - 20:00)" },
  { value: "10:00-20:00", label: "Jornada completa (10:00 - 20:00)" },
  { value: "11:00-16:00", label: "Mañana (11:00 - 16:00)" },
  { value: "16:00-23:00", label: "Tarde (16:00 - 23:00)" },
] as const;

export function QuickAddEmployeePopover({ date, costCenterId, zoneId, children }: QuickAddEmployeePopoverProps) {
  const { employees, createShift, isLoading } = useShiftsStore();

  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [schedule, setSchedule] = useState<string>("");

  // Filtrar empleados del mismo centro
  const filteredEmployees = employees.filter((e) => e.usesShiftSystem && e.costCenterId === costCenterId);

  const handleSubmit = async () => {
    if (!employeeId || !schedule) return;

    const [startTime, endTime] = schedule.split("-");

    await createShift({
      employeeId,
      date,
      startTime,
      endTime,
      costCenterId,
      zoneId,
    });

    // Resetear y cerrar
    setEmployeeId("");
    setSchedule("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="icon-sm" className="h-6 w-6">
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-4" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="mb-3 text-sm font-semibold">Añadir empleado</h4>

            {/* Selector de empleado (Combobox) */}
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs">Empleado</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn("w-full justify-between", !employeeId && "text-muted-foreground")}
                  >
                    {employeeId
                      ? `${filteredEmployees.find((e) => e.id === employeeId)?.firstName ?? ""} ${filteredEmployees.find((e) => e.id === employeeId)?.lastName ?? ""}`
                      : "Seleccionar empleado"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar empleado..." />
                    <CommandList>
                      <CommandEmpty>No se encontró empleado.</CommandEmpty>
                      <CommandGroup>
                        {filteredEmployees.map((employee) => (
                          <CommandItem
                            key={employee.id}
                            value={`${employee.firstName} ${employee.lastName}`}
                            onSelect={() => {
                              setEmployeeId(employee.id);
                            }}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", employeeId === employee.id ? "opacity-100" : "opacity-0")}
                            />
                            {employee.firstName} {employee.lastName}
                            {employee.contractHours && (
                              <span className="text-muted-foreground ml-auto text-xs">
                                {employee.contractHours}h/sem
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selector de horario */}
            <div className="mt-3 space-y-2">
              <label className="text-muted-foreground text-xs">Horario</label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar horario" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_SCHEDULES.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!employeeId || !schedule || isLoading}>
              Añadir
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
