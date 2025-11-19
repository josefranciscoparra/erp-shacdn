"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createExceptionDay,
  updateExceptionDay,
  type ExceptionTypeEnum,
  getDepartments,
  getCostCenters,
} from "@/server/actions/schedules-v2";

interface ExceptionData {
  id: string;
  date: Date;
  endDate?: Date | null;
  exceptionType: ExceptionTypeEnum;
  reason?: string | null;
  isRecurring: boolean;
  departmentId?: string | null;
  costCenterId?: string | null;
  isGlobal: boolean;
  overrideSlots: Array<{
    startTimeMinutes: number;
    endTimeMinutes: number;
    slotType: "WORK" | "BREAK";
    presenceType: "MANDATORY" | "FLEXIBLE";
  }>;
}

interface CreateGlobalExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  exceptionToEdit?: ExceptionData | null;
}

// Opciones de tipo de excepción
const exceptionTypes: { value: ExceptionTypeEnum; label: string; description: string }[] = [
  { value: "HOLIDAY", label: "Festivo", description: "Día completo sin trabajo" },
  { value: "REDUCED_HOURS", label: "Jornada Reducida", description: "Horario con horas reducidas" },
  { value: "SPECIAL_SCHEDULE", label: "Horario Especial", description: "Horario diferente al habitual" },
  { value: "TRAINING", label: "Formación", description: "Día de formación o evento" },
  { value: "EARLY_CLOSURE", label: "Cierre Anticipado", description: "Cierre antes de lo habitual" },
  { value: "CUSTOM", label: "Personalizado", description: "Otro tipo de excepción" },
];

// Opciones de alcance
const scopeTypes = [
  { value: "global", label: "Toda la Organización", description: "Afecta a todos los empleados" },
  { value: "department", label: "Por Departamento", description: "Solo un departamento específico" },
  { value: "costCenter", label: "Por Centro de Costes", description: "Solo un centro de costes" },
];

export function CreateGlobalExceptionDialog({
  open,
  onOpenChange,
  onSuccess,
  exceptionToEdit,
}: CreateGlobalExceptionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!exceptionToEdit;

  // Información básica
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [exceptionType, setExceptionType] = useState<ExceptionTypeEnum>("HOLIDAY");
  const [reason, setReason] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [scopeType, setScopeType] = useState("global");

  // Scope específico
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>();
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string | undefined>();

  // Datos para los selectores
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [costCenters, setCostCenters] = useState<Array<{ id: string; name: string }>>([]);

  // Time slots (opcional)
  const [hasCustomSchedule, setHasCustomSchedule] = useState(false);
  const [timeSlots, setTimeSlots] = useState<
    Array<{
      startTime: string;
      endTime: string;
      slotType: "WORK" | "BREAK";
      presenceType: "MANDATORY" | "FLEXIBLE";
    }>
  >([]);

  // Cargar departamentos y centros de costes al abrir
  useEffect(() => {
    if (open) {
      getDepartments().then((data) => {
        setDepartments(data);
      });

      getCostCenters().then((data) => {
        setCostCenters(data);
      });
    }
  }, [open]);

  // Pre-llenar campos en modo edición
  useEffect(() => {
    if (open && exceptionToEdit) {
      setDate(new Date(exceptionToEdit.date));
      setEndDate(exceptionToEdit.endDate ? new Date(exceptionToEdit.endDate) : undefined);
      setExceptionType(exceptionToEdit.exceptionType);
      setReason(exceptionToEdit.reason ?? "");
      setIsRecurring(exceptionToEdit.isRecurring);

      // Determinar scope
      if (exceptionToEdit.departmentId) {
        setScopeType("department");
        setSelectedDepartmentId(exceptionToEdit.departmentId);
      } else if (exceptionToEdit.costCenterId) {
        setScopeType("costCenter");
        setSelectedCostCenterId(exceptionToEdit.costCenterId);
      } else {
        setScopeType("global");
      }

      // Convertir time slots de minutos a HH:mm
      if (exceptionToEdit.overrideSlots.length > 0) {
        setHasCustomSchedule(true);
        const convertedSlots = exceptionToEdit.overrideSlots.map((slot) => {
          const startHours = Math.floor(slot.startTimeMinutes / 60);
          const startMinutes = slot.startTimeMinutes % 60;
          const endHours = Math.floor(slot.endTimeMinutes / 60);
          const endMinutes = slot.endTimeMinutes % 60;

          return {
            startTime: `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}`,
            endTime: `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`,
            slotType: slot.slotType,
            presenceType: slot.presenceType,
          };
        });
        setTimeSlots(convertedSlots);
      }
    }
  }, [open, exceptionToEdit]);

  function resetForm() {
    setDate(new Date());
    setEndDate(undefined);
    setExceptionType("HOLIDAY");
    setReason("");
    setIsRecurring(false);
    setScopeType("global");
    setSelectedDepartmentId(undefined);
    setSelectedCostCenterId(undefined);
    setHasCustomSchedule(false);
    setTimeSlots([]);
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  function addTimeSlot() {
    setTimeSlots([
      ...timeSlots,
      {
        startTime: "09:00",
        endTime: "14:00",
        slotType: "WORK",
        presenceType: "MANDATORY",
      },
    ]);
  }

  function removeTimeSlot(index: number) {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  }

  function updateTimeSlot(index: number, field: keyof (typeof timeSlots)[0], value: string) {
    const updated = [...timeSlots];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setTimeSlots(updated);
    }
  }

  async function handleSubmit() {
    if (!date) {
      toast.error("Debes seleccionar una fecha");
      return;
    }

    if (scopeType === "department" && !selectedDepartmentId) {
      toast.error("Debes seleccionar un departamento");
      return;
    }

    if (scopeType === "costCenter" && !selectedCostCenterId) {
      toast.error("Debes seleccionar un centro de costes");
      return;
    }

    setIsLoading(true);

    try {
      // Convertir time slots de HH:mm a minutos
      const timeSlotsInMinutes = hasCustomSchedule
        ? timeSlots.map((slot) => {
            const [startHours, startMinutes] = slot.startTime.split(":").map(Number);
            const [endHours, endMinutes] = slot.endTime.split(":").map(Number);

            return {
              startTimeMinutes: (startHours ?? 0) * 60 + (startMinutes ?? 0),
              endTimeMinutes: (endHours ?? 0) * 60 + (endMinutes ?? 0),
              slotType: slot.slotType,
              presenceType: slot.presenceType,
            };
          })
        : [];

      const result =
        isEditMode && exceptionToEdit
          ? await updateExceptionDay({
              id: exceptionToEdit.id,
              date,
              endDate,
              exceptionType,
              reason: reason.trim() || undefined,
              isRecurring,
              isGlobal: scopeType === "global" ? true : undefined,
              departmentId: scopeType === "department" ? selectedDepartmentId : undefined,
              costCenterId: scopeType === "costCenter" ? selectedCostCenterId : undefined,
              timeSlots: timeSlotsInMinutes.length > 0 ? timeSlotsInMinutes : undefined,
            })
          : await createExceptionDay({
              date,
              endDate,
              exceptionType,
              reason: reason.trim() || undefined,
              isRecurring,
              isGlobal: scopeType === "global" ? true : undefined,
              departmentId: scopeType === "department" ? selectedDepartmentId : undefined,
              costCenterId: scopeType === "costCenter" ? selectedCostCenterId : undefined,
              timeSlots: timeSlotsInMinutes.length > 0 ? timeSlotsInMinutes : undefined,
            });

      if (result.success) {
        toast.success(isEditMode ? "Excepción actualizada correctamente" : "Excepción creada correctamente");
        handleClose();
        onSuccess();
      } else {
        toast.error(result.error ?? (isEditMode ? "Error al actualizar la excepción" : "Error al crear la excepción"));
      }
    } catch (error) {
      console.error("Error creating exception:", error);
      toast.error("Error al crear la excepción");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Excepción" : "Nueva Excepción Global"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifica los detalles de la excepción de horario"
              : "Configura una excepción de horario para la organización, departamento o centro de costes"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sección: Información básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Información Básica</h3>

            {/* Alcance */}
            <div className="space-y-2">
              <Label>Alcance</Label>
              <Select value={scopeType} onValueChange={setScopeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-muted-foreground text-xs">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de Departamento (si aplica) */}
            {scopeType === "department" && (
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selector de Centro de Costes (si aplica) */}
            {scopeType === "costCenter" && (
              <div className="space-y-2">
                <Label>Centro de Costes</Label>
                <Select value={selectedCostCenterId} onValueChange={setSelectedCostCenterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un centro de costes" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tipo de excepción */}
            <div className="space-y-2">
              <Label>Tipo de Excepción</Label>
              <Select value={exceptionType} onValueChange={(value) => setExceptionType(value as ExceptionTypeEnum)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exceptionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-muted-foreground text-xs">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Fecha de inicio */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: es }) : "Selecciona una fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={es} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Fecha de fin (opcional) */}
              <div className="space-y-2">
                <Label>Fecha de Fin (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: es }) : "Sin fecha de fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={es}
                      disabled={(date) => date && date < (date ?? new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                placeholder="Ej: Viernes Santo, Cierre de verano, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>

            {/* Recurrencia anual */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
              />
              <label
                htmlFor="recurring"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Repetir anualmente
              </label>
            </div>
            {isRecurring && (
              <p className="text-muted-foreground text-xs">
                Esta excepción se aplicará automáticamente cada año en la misma fecha
              </p>
            )}
          </div>

          {/* Sección: Configuración de horario */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Configuración de Horario</h3>

            {/* Toggle de horario personalizado */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customSchedule"
                checked={hasCustomSchedule}
                onCheckedChange={(checked) => {
                  setHasCustomSchedule(checked === true);
                  if (!checked) {
                    setTimeSlots([]);
                  }
                }}
              />
              <label
                htmlFor="customSchedule"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Configurar horario específico
              </label>
            </div>

            {hasCustomSchedule ? (
              <>
                <p className="text-muted-foreground text-sm">Define las franjas horarias para este día excepcional</p>

                {/* Lista de time slots */}
                <div className="space-y-2">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateTimeSlot(index, "startTime", e.target.value)}
                        className="w-28"
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateTimeSlot(index, "endTime", e.target.value)}
                        className="w-28"
                      />
                      <Select value={slot.slotType} onValueChange={(value) => updateTimeSlot(index, "slotType", value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WORK">Trabajo</SelectItem>
                          <SelectItem value="BREAK">Pausa</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTimeSlot(index)}>
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>

                <Button type="button" variant="outline" size="sm" onClick={addTimeSlot} className="w-full">
                  <Clock className="mr-2 h-4 w-4" />
                  Añadir Franja Horaria
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Este día no tendrá horario (día completo sin trabajo)</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? isEditMode
                ? "Guardando..."
                : "Creando..."
              : isEditMode
                ? "Guardar Cambios"
                : "Crear Excepción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
