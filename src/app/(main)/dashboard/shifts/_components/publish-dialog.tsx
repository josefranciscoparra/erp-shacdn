"use client";

import { useState, useMemo, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { getWeekStart, getWeekEnd } from "../_lib/shift-utils";
import { useShiftsStore } from "../_store/shifts-store";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishDialog({ open, onOpenChange }: PublishDialogProps) {
  const { shifts, currentWeekStart, publishShifts, isLoading } = useShiftsStore();

  // Rango de fechas (por defecto, la semana actual)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: getWeekStart(currentWeekStart),
    to: getWeekEnd(currentWeekStart),
  });

  // IDs de empleados seleccionados
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Calcular empleados con borradores en el rango (usando datos cargados por ahora)
  // NOTA: Si cambiamos el rango a futuro fuera de lo cargado, esto necesitaría un fetch al server.
  // Para este MVP, asumimos que publicamos lo que vemos o subconjunto.
  const draftEmployees = useMemo(() => {
    const employeesMap = new Map<string, { id: string; name: string; count: number; hasConflicts: boolean }>();

    shifts.forEach((shift) => {
      if (shift.status === "draft" || shift.status === "conflict") {
        const existing = employeesMap.get(shift.employeeId) ?? {
          id: shift.employeeId,
          name: "Cargando...", // Idealmente obtener nombre del store de empleados o del propio shift si lo tuviera denormalizado
          count: 0,
          hasConflicts: false,
        };

        // Intentar buscar nombre real en el store de empleados (si está cargado)
        // Esto es una limitación actual, el shift solo tiene ID.
        // En una app real, el shift debería traer nombre o cruzamos datos.
        // Usamos un placeholder o buscamos en la lista de empleados cargados.

        existing.count++;
        if (shift.status === "conflict") existing.hasConflicts = true;
        employeesMap.set(shift.employeeId, existing);
      }
    });

    return Array.from(employeesMap.values());
  }, [shifts]);

  // Al abrir, seleccionar todos por defecto y actualizar fechas
  useEffect(() => {
    if (open) {
      // Sincronizar fechas con la vista actual al abrir
      setDateRange({
        from: getWeekStart(currentWeekStart),
        to: getWeekEnd(currentWeekStart),
      });

      setSelectedEmployeeIds(draftEmployees.map((e) => e.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Obtener nombres de empleados (cruce con store)
  const { employees } = useShiftsStore();
  const enrichedDraftEmployees = useMemo(() => {
    return draftEmployees.map((draft) => {
      const emp = employees.find((e) => e.id === draft.id);
      return {
        ...draft,
        name: emp ? `${emp.firstName} ${emp.lastName}` : "Empleado sin nombre",
      };
    });
  }, [draftEmployees, employees]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds(enrichedDraftEmployees.map((e) => e.id));
    } else {
      setSelectedEmployeeIds([]);
    }
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds((prev) => [...prev, employeeId]);
    } else {
      setSelectedEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
    }
  };

  const handlePublish = async () => {
    await publishShifts(selectedEmployeeIds, {
      start: format(dateRange.from, "yyyy-MM-dd"),
      end: format(dateRange.to, "yyyy-MM-dd"),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publicar Turnos</DialogTitle>
          <DialogDescription>
            Selecciona los empleados y el rango de fechas para notificar los nuevos horarios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Selector de Fechas */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Rango de publicación</label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                          {format(dateRange.to, "LLL dd, y", { locale: es })}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y", { locale: es })
                      )
                    ) : (
                      <span>Seleccionar fechas</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange as any}
                    onSelect={(range: any) => range && setDateRange(range)}
                    numberOfMonths={1}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Lista de Empleados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Empleados ({selectedEmployeeIds.length}/{enrichedDraftEmployees.length})
              </label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={
                    enrichedDraftEmployees.length > 0 && selectedEmployeeIds.length === enrichedDraftEmployees.length
                  }
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Todos
                </label>
              </div>
            </div>

            <ScrollArea className="h-[200px] rounded-md border p-2">
              {enrichedDraftEmployees.length === 0 ? (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-sm">
                  <CheckCircle2 className="mb-2 h-8 w-8 opacity-20" />
                  <p>No hay borradores pendientes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {enrichedDraftEmployees.map((emp) => (
                    <div key={emp.id} className="hover:bg-accent flex items-center space-x-3 rounded-lg border p-2">
                      <Checkbox
                        id={`emp-${emp.id}`}
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onCheckedChange={(checked) => handleSelectEmployee(emp.id, checked as boolean)}
                      />
                      <div className="flex flex-1 flex-col">
                        <label htmlFor={`emp-${emp.id}`} className="cursor-pointer text-sm leading-none font-medium">
                          {emp.name}
                        </label>
                        <span className="text-muted-foreground text-xs">{emp.count} turnos pendientes</span>
                      </div>
                      {emp.hasConflicts && (
                        <Badge variant="destructive" className="h-5 px-1 text-[10px]">
                          Conflictos
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePublish} disabled={selectedEmployeeIds.length === 0 || isLoading}>
            {isLoading ? "Publicando..." : `Publicar ${selectedEmployeeIds.length} Empleados`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
