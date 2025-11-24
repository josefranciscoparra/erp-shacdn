/**
 * Modal para Crear/Editar Turno
 *
 * Formulario completo con validaciones en tiempo real y warnings visuales.
 */

"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, ChevronsUpDown, Clock, Loader2, Briefcase, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { shiftService } from "../_lib/shift-service"; // Importar servicio real
import { formatDateISO, calculateDuration, formatDuration } from "../_lib/shift-utils";
import type { ShiftInput } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

// Schema de validación con Zod
const shiftFormSchema = z
  .object({
    employeeId: z.string().min(1, "Selecciona un empleado"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
    breakMinutes: z.coerce.number().min(0, "Los minutos de descanso no pueden ser negativos").optional(),
    costCenterId: z.string().min(1, "Selecciona un lugar"),
    zoneId: z.string().optional(), // Ahora opcional
    role: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validar que endTime sea posterior a startTime (excepto si cruza medianoche)
      const [startH, startM] = data.startTime.split(":").map(Number);
      const [endH, endM] = data.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      // Permitir turnos que cruzan medianoche (ej: 22:00-06:00)
      return endMinutes !== startMinutes;
    },
    {
      message: "La hora de fin debe ser diferente a la de inicio",
      path: ["endTime"],
    },
  );

type ShiftFormValues = z.infer<typeof shiftFormSchema>;

// Debounce simple
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function ShiftDialog() {
  const {
    isShiftDialogOpen,
    selectedShift,
    shiftDialogPrefill,
    employees: storeEmployees, // Mantenemos para fallback o edición
    costCenters,
    zones,
    closeShiftDialog,
    createShift,
    updateShift,
  } = useShiftsStore();

  const isEditing = !!selectedShift;

  // Estados para búsqueda asíncrona
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Efecto para buscar empleados
  useEffect(() => {
    const search = async () => {
      if (debouncedSearchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await shiftService.searchEmployees(debouncedSearchTerm);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching employees:", error);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedSearchTerm]);

  // Si estamos editando o hay un prefill, asegurarnos de que el empleado actual esté en la lista "seleccionada" visualmente
  const currentEmployeeId = isEditing ? selectedShift?.employeeId : shiftDialogPrefill?.employeeId;
  const currentEmployee = currentEmployeeId ? storeEmployees.find((e) => e.id === currentEmployeeId) : null;

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      employeeId: "",
      date: formatDateISO(new Date()),
      startTime: "08:00",
      endTime: "16:00",
      breakMinutes: undefined,
      costCenterId: "",
      zoneId: "",
      role: "",
      notes: "",
    },
  });

  // Actualizar formulario cuando cambie selectedShift o shiftDialogPrefill
  useEffect(() => {
    if (selectedShift) {
      // Modo edición: cargar datos del turno existente
      form.reset({
        employeeId: selectedShift.employeeId,
        date: selectedShift.date,
        startTime: selectedShift.startTime,
        endTime: selectedShift.endTime,
        breakMinutes: selectedShift.breakMinutes,
        costCenterId: selectedShift.costCenterId,
        zoneId: selectedShift.zoneId,
        role: selectedShift.role ?? "",
        notes: selectedShift.notes ?? "",
      });
    } else if (shiftDialogPrefill) {
      // Modo creación con datos pre-rellenados
      form.reset({
        employeeId: shiftDialogPrefill.employeeId ?? "",
        date: shiftDialogPrefill.date ?? formatDateISO(new Date()),
        startTime: shiftDialogPrefill.startTime ?? "08:00",
        endTime: shiftDialogPrefill.endTime ?? "16:00",
        breakMinutes: shiftDialogPrefill.breakMinutes,
        costCenterId: shiftDialogPrefill.costCenterId ?? "",
        zoneId: shiftDialogPrefill.zoneId ?? "",
        role: shiftDialogPrefill.role ?? "",
        notes: shiftDialogPrefill.notes ?? "",
      });
    } else {
      // Modo creación limpio
      form.reset({
        employeeId: "",
        date: formatDateISO(new Date()),
        startTime: "08:00",
        endTime: "16:00",
        breakMinutes: undefined,
        costCenterId: "",
        zoneId: "",
        role: "",
        notes: "",
      });
    }
  }, [selectedShift, shiftDialogPrefill, form]);

  // Estado para checkbox de búsqueda ampliada
  const [searchOutsideCenter, setSearchOutsideCenter] = useState(false);

  // Filtrar zonas por lugar seleccionado
  const selectedCostCenterId = form.watch("costCenterId");

  // Resetear checkbox cuando cambia el centro
  useEffect(() => {
    setSearchOutsideCenter(false);
  }, [selectedCostCenterId]);

  const filteredZones = selectedCostCenterId
    ? zones.filter((z) => z.costCenterId === selectedCostCenterId && z.active)
    : [];

  // Filtrar empleados por centro (si hay centro seleccionado y checkbox desactivado)
  const filteredEmployees =
    searchOutsideCenter || !selectedCostCenterId
      ? storeEmployees.filter((e) => e.usesShiftSystem)
      : storeEmployees.filter((e) => e.usesShiftSystem && e.costCenterId === selectedCostCenterId);

  // Calcular duración del turno en tiempo real
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");
  const duration = startTime && endTime ? calculateDuration(startTime, endTime) : 0;

  // Manejar cambio de lugar (resetear zona si no es válida)
  const handleCostCenterChange = (value: string) => {
    form.setValue("costCenterId", value);
    const currentZoneId = form.getValues("zoneId");
    const isZoneValid = filteredZones.some((z) => z.id === currentZoneId);
    if (!isZoneValid) {
      form.setValue("zoneId", "");
    }
  };

  // Submit del formulario
  const onSubmit = async (data: ShiftFormValues) => {
    const shiftInput: ShiftInput = {
      employeeId: data.employeeId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      breakMinutes: data.breakMinutes,
      costCenterId: data.costCenterId,
      zoneId: data.zoneId,
      role: data.role ?? undefined,
      notes: data.notes ?? undefined,
    };

    if (isEditing) {
      await updateShift(selectedShift.id, shiftInput);
    } else {
      await createShift(shiftInput);
    }

    // El store cierra el diálogo automáticamente después de crear/actualizar
  };

  // Obtener empleado seleccionado para mostrar info
  const selectedEmployeeId = form.watch("employeeId");
  const selectedEmployee = storeEmployees.find((e) => e.id === selectedEmployeeId);

  return (
    <Dialog open={isShiftDialogOpen} onOpenChange={closeShiftDialog}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Turno" : "Nuevo Turno"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del turno. Los cambios se guardarán al hacer clic en "Actualizar".'
              : "Completa los datos para crear un nuevo turno. Se guardará como borrador."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Empleado (Combobox Async) */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Empleado</FormLabel>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className={cn(
                            "h-auto w-full justify-between py-2 font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? (() => {
                                // Intentar encontrar en resultados de búsqueda o en store o usar el seleccionado actual
                                const emp =
                                  searchResults.find((e) => e.id === field.value) ??
                                  storeEmployees.find((e) => e.id === field.value) ??
                                  (currentEmployee?.id === field.value ? currentEmployee : null);

                                if (emp) {
                                  return (
                                    <div className="flex flex-col items-start text-left">
                                      <span className="font-medium">
                                        {emp.firstName ?? emp.fullName?.split(" ")[0] ?? "Desconocido"}{" "}
                                        {emp.lastName ?? emp.fullName?.split(" ").slice(1).join(" ") ?? ""}
                                      </span>
                                      <span className="text-muted-foreground text-xs">
                                        {/* Intentar mostrar email o puesto si está disponible */}
                                        {emp.email ?? emp.position ?? "Empleado seleccionado"}
                                      </span>
                                    </div>
                                  );
                                }
                                return "Empleado seleccionado";
                              })()
                            : "Buscar empleado (mín. 2 letras)..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        {" "}
                        {/* Desactivar filtrado local */}
                        <CommandInput
                          placeholder="Escribe nombre, apellido o email..."
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandList>
                          {isSearching && (
                            <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-center text-sm">
                              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                            </div>
                          )}

                          {!isSearching && searchTerm.length < 2 && (
                            <div className="text-muted-foreground py-6 text-center text-sm">
                              Escribe al menos 2 caracteres para buscar.
                            </div>
                          )}

                          {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
                            <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                          )}

                          <CommandGroup>
                            {searchResults.map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={employee.id}
                                onSelect={() => {
                                  form.setValue("employeeId", employee.id);
                                  setOpenCombobox(false);
                                }}
                                className="flex items-center justify-between py-2"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 shrink-0",
                                      employee.id === field.value ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col truncate">
                                    <span className="truncate font-medium">{employee.fullName}</span>
                                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                      {employee.position && (
                                        <span className="flex items-center gap-1 truncate">
                                          <Briefcase className="h-3 w-3" /> {employee.position}
                                        </span>
                                      )}
                                      {employee.email && (
                                        <span className="flex items-center gap-1 truncate">
                                          <Mail className="h-3 w-3" /> {employee.email}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {employee.weeklyHours && (
                                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                                    {employee.weeklyHours}h
                                  </Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />

                  {/* Checkbox para buscar fuera del centro (Legacy - mantenemos por si acaso) */}
                  {selectedCostCenterId && (
                    <div className="mt-2 flex items-center space-x-2">
                      <Checkbox
                        id="search-outside-center"
                        checked={searchOutsideCenter}
                        onCheckedChange={(checked) => setSearchOutsideCenter(checked === true)}
                      />
                      <label
                        htmlFor="search-outside-center"
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Mostrar lista completa (fallback)
                        <span className="text-muted-foreground ml-1">
                          (
                          {searchOutsideCenter
                            ? storeEmployees.filter((e) => e.usesShiftSystem).length
                            : filteredEmployees.length}{" "}
                          disponibles)
                        </span>
                      </label>
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* Fecha */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Horarios (Start Time + End Time) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duración calculada */}
            {duration > 0 && (
              <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <span className="text-sm font-medium">Duración: {formatDuration(duration)}</span>
              </div>
            )}

            {/* Descanso */}
            <FormField
              control={form.control}
              name="breakMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descanso (minutos)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="15"
                      placeholder="Ej: 30, 60..."
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Tiempo de descanso durante el turno (opcional)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lugar */}
            <FormField
              control={form.control}
              name="costCenterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lugar de trabajo</FormLabel>
                  <Select onValueChange={handleCostCenterChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un lugar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costCenters
                        .filter((cc) => cc.active)
                        .map((costCenter) => (
                          <SelectItem key={costCenter.id} value={costCenter.id}>
                            {costCenter.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Zona */}
            <FormField
              control={form.control}
              name="zoneId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zona (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "default"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin zona específica" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="default">Sin zona específica</SelectItem>
                      {filteredZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rol/Descripción */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol o descripción (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Supervisor, Turno mañana..." {...field} />
                  </FormControl>
                  <FormDescription>Descripción breve del tipo de turno o rol</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional sobre este turno..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warnings mock (simulación de conflictos) */}
            {selectedEmployee && (
              <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
                  ⚠️ <strong>Validación mock:</strong> En el sistema real, aquí se mostrarían conflictos como:
                  solapamientos con otros turnos, descansos insuficientes, exceso de horas semanales, etc.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeShiftDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar" : "Crear Turno"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
