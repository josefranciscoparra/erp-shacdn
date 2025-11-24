/**
 * Modal para Aplicar Plantilla de Turnos
 *
 * Permite seleccionar una plantilla, empleados, rango de fechas y generar turnos automáticamente.
 */

"use client";

import { useEffect, useState, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInDays, parseISO, addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Users, AlertTriangle, CheckCircle2, Loader2, Play } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { formatDateISO } from "../_lib/shift-utils";
import type { ApplyTemplateInput, ShiftTemplate, EmployeeShift } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

// Schema de validación
const applyTemplateSchema = z
  .object({
    templateId: z.string().min(1, "Selecciona una plantilla"),
    employeeIds: z.array(z.string()).min(1, "Selecciona al menos un empleado"),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
    costCenterId: z.string().min(1, "Selecciona un lugar"),
    zoneId: z.string().min(1, "Selecciona una zona"),
    initialGroup: z.number().min(0, "Grupo inicial debe ser mayor o igual a 0"),
  })
  .refine(
    (data) => {
      const from = parseISO(data.dateFrom);
      const to = parseISO(data.dateTo);
      return to >= from;
    },
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio",
      path: ["dateTo"],
    },
  );

type ApplyTemplateFormValues = z.infer<typeof applyTemplateSchema>;

export function TemplateApplyDialog() {
  const {
    isTemplateApplyDialogOpen,
    selectedTemplate,
    templates,
    employees,
    costCenters,
    zones,
    closeTemplateApplyDialog,
    applyTemplate,
  } = useShiftsStore();

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [previewShiftsCount, setPreviewShiftsCount] = useState(0);

  const form = useForm<ApplyTemplateFormValues>({
    resolver: zodResolver(applyTemplateSchema),
    defaultValues: {
      templateId: "",
      employeeIds: [],
      dateFrom: formatDateISO(new Date()),
      dateTo: formatDateISO(addDays(new Date(), 30)),
      costCenterId: "",
      zoneId: "",
      initialGroup: 0,
    },
  });

  // Resetear formulario cuando se abre el dialog
  useEffect(() => {
    if (isTemplateApplyDialogOpen) {
      form.reset({
        templateId: selectedTemplate?.id ?? "",
        employeeIds: [],
        dateFrom: formatDateISO(new Date()),
        dateTo: formatDateISO(addDays(new Date(), 30)),
        costCenterId: "",
        zoneId: "",
        initialGroup: 0,
      });
      setSelectedEmployees([]);
    }
  }, [isTemplateApplyDialogOpen, selectedTemplate, form]);

  // Plantilla seleccionada
  const watchedTemplateId = form.watch("templateId");
  const currentTemplate = templates.find((t) => t.id === watchedTemplateId);

  // Filtrar empleados que usan sistema de turnos
  const availableEmployees = useMemo(() => {
    return employees.filter((e) => e.usesShiftSystem);
  }, [employees]);

  // Filtrar zonas por lugar seleccionado
  const selectedCostCenterId = form.watch("costCenterId");
  const filteredZones = selectedCostCenterId
    ? zones.filter((z) => z.costCenterId === selectedCostCenterId && z.active)
    : [];

  // Calcular preview de turnos a crear
  const dateFrom = form.watch("dateFrom");
  const dateTo = form.watch("dateTo");
  const employeeIdsCount = form.watch("employeeIds").length;

  useEffect(() => {
    if (dateFrom && dateTo && employeeIdsCount > 0 && currentTemplate) {
      const from = parseISO(dateFrom);
      const to = parseISO(dateTo);
      const days = differenceInDays(to, from) + 1;

      // Calcular turnos aproximados (días × empleados / días del patrón)
      const patternLength = currentTemplate.pattern.length;
      const shiftsPerEmployee = days;
      const totalShifts = shiftsPerEmployee * employeeIdsCount;

      setPreviewShiftsCount(totalShifts);
    } else {
      setPreviewShiftsCount(0);
    }
  }, [dateFrom, dateTo, employeeIdsCount, currentTemplate]);

  // Handler para cambiar selección de empleados
  const handleToggleEmployee = (employeeId: string) => {
    const current = form.getValues("employeeIds");
    const updated = current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId];

    form.setValue("employeeIds", updated);
    setSelectedEmployees(updated);
  };

  const handleSelectAllEmployees = () => {
    const allIds = availableEmployees.map((e) => e.id);
    form.setValue("employeeIds", allIds);
    setSelectedEmployees(allIds);
  };

  const handleDeselectAllEmployees = () => {
    form.setValue("employeeIds", []);
    setSelectedEmployees([]);
  };

  // Handler para cambio de lugar (resetear zona si no es válida)
  const handleCostCenterChange = (value: string) => {
    form.setValue("costCenterId", value);
    const currentZoneId = form.getValues("zoneId");
    const isZoneValid = filteredZones.some((z) => z.id === currentZoneId);
    if (!isZoneValid) {
      form.setValue("zoneId", "");
    }
  };

  // Submit del formulario
  const onSubmit = async (data: ApplyTemplateFormValues) => {
    const input: ApplyTemplateInput = {
      templateId: data.templateId,
      employeeIds: data.employeeIds,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      costCenterId: data.costCenterId,
      zoneId: data.zoneId,
      initialGroup: data.initialGroup,
    };

    await applyTemplate(input);
    // El store cierra el diálogo automáticamente después de aplicar
  };

  return (
    <Dialog open={isTemplateApplyDialogOpen} onOpenChange={closeTemplateApplyDialog}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Aplicar Plantilla de Turnos</DialogTitle>
          <DialogDescription>
            Selecciona una plantilla, los empleados y el rango de fechas para generar turnos automáticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Selección de plantilla */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plantilla</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plantilla" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates
                        .filter((t) => t.active)
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.pattern.length} días, {template.shiftDuration}h)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {currentTemplate && <FormDescription>Patrón: {currentTemplate.pattern.join(" → ")}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Selección de empleados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel>Empleados</FormLabel>
                  <p className="text-muted-foreground text-xs">
                    Selecciona los empleados a los que aplicar la plantilla
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAllEmployees}>
                    Todos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleDeselectAllEmployees}>
                    Ninguno
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[200px] rounded-lg border p-3">
                <div className="space-y-2">
                  {availableEmployees.map((employee) => (
                    <div key={employee.id} className="hover:bg-muted/50 flex items-center space-x-3 rounded-lg p-2">
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => handleToggleEmployee(employee.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs">{employee.contractHours}h/semana</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {selectedEmployees.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">
                    {selectedEmployees.length}{" "}
                    {selectedEmployees.length === 1 ? "empleado seleccionado" : "empleados seleccionados"}
                  </span>
                </div>
              )}

              {form.formState.errors.employeeIds && (
                <p className="text-destructive text-sm">{form.formState.errors.employeeIds.message}</p>
              )}
            </div>

            <Separator />

            {/* Rango de fechas */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desde</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasta</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Lugar y Zona */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lugar</FormLabel>
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

              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={filteredZones.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una zona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredZones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filteredZones.length === 0 && <FormDescription>Selecciona primero un lugar</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Grupo inicial de rotación */}
            <FormField
              control={form.control}
              name="initialGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo inicial de rotación</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Define desde qué posición del patrón empezará cada empleado (0 = primer turno del patrón)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Preview de turnos a crear */}
            {previewShiftsCount > 0 && (
              <Alert variant="default" className="border-primary/50 bg-primary/5">
                <CheckCircle2 className="text-primary h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Preview:</strong> Se crearán aproximadamente <strong>{previewShiftsCount}</strong> turnos para{" "}
                  {selectedEmployees.length} {selectedEmployees.length === 1 ? "empleado" : "empleados"} durante el
                  período seleccionado.
                </AlertDescription>
              </Alert>
            )}

            <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
                ⚠️ Antes de generar los turnos se validarán conflictos, ausencias y descansos mínimos para cada
                empleado.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeTemplateApplyDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || previewShiftsCount === 0}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Play className="mr-2 h-4 w-4" />
                Aplicar Plantilla
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
