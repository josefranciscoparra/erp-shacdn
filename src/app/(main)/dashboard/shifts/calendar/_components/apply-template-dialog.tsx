"use client";

import { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Layers } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCostCentersStore } from "@/stores/cost-centers-store";
import { useShiftTemplatesStore } from "@/stores/shift-templates-store";
import { useShiftsStore } from "@/stores/shifts-store";

const applyTemplateSchema = z.object({
  templateId: z.string().min(1, "Selecciona una plantilla"),
  costCenterId: z.string().min(1, "Selecciona un centro de coste"),
  dateFrom: z.date({ required_error: "Selecciona fecha de inicio" }),
  dateTo: z.date({ required_error: "Selecciona fecha de fin" }),
});

type ApplyTemplateFormValues = z.infer<typeof applyTemplateSchema>;

interface ApplyTemplateDialogProps {
  trigger?: React.ReactNode;
}

export function ApplyTemplateDialog({ trigger }: ApplyTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const { templates, fetchTemplates } = useShiftTemplatesStore();
  const { costCenters, fetchCostCenters } = useCostCentersStore();
  const { createShiftsFromTemplate, isLoading } = useShiftsStore();

  const form = useForm<ApplyTemplateFormValues>({
    resolver: zodResolver(applyTemplateSchema),
  });

  // Cargar datos cuando se abre el dialog
  useEffect(() => {
    if (open) {
      if (templates.length === 0) fetchTemplates();
      if (costCenters.length === 0) fetchCostCenters();
    }
  }, [open, templates.length, costCenters.length, fetchTemplates, fetchCostCenters]);

  const onSubmit = async (values: ApplyTemplateFormValues) => {
    try {
      const result = await createShiftsFromTemplate(
        values.templateId,
        {
          start: values.dateFrom,
          end: values.dateTo,
        },
        values.costCenterId,
      );

      toast.success(`${result.length} turnos creados correctamente desde la plantilla`);
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear turnos desde plantilla");
    }
  };

  const selectedTemplate = templates.find((t) => t.id === form.watch("templateId"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Layers className="mr-2 h-4 w-4" />
            Aplicar Plantilla
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aplicar Plantilla a Rango de Fechas</DialogTitle>
          <DialogDescription>Crea múltiples turnos aplicando una plantilla a un rango de fechas</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Seleccionar plantilla */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plantilla*</FormLabel>
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
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: template.color }} />
                              <span>
                                {template.name} ({template.defaultStartTime} - {template.defaultEndTime})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>La plantilla se aplicará a todos los días del rango</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Centro de coste */}
            <FormField
              control={form.control}
              name="costCenterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centro de Coste*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un centro" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rango de fechas */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Desde*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Hasta*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < (form.watch("dateFrom") ?? new Date(new Date().setHours(0, 0, 0, 0)))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preview de turnos a crear */}
            {selectedTemplate && form.watch("dateFrom") && form.watch("dateTo") && (
              <div className="bg-muted/50 rounded-lg border p-4">
                <h4 className="mb-2 font-medium">Vista Previa</h4>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <p>
                    • Plantilla: <strong>{selectedTemplate.name}</strong>
                  </p>
                  <p>
                    • Horario: <strong>{selectedTemplate.defaultStartTime}</strong> a{" "}
                    <strong>{selectedTemplate.defaultEndTime}</strong>
                  </p>
                  <p>
                    • Cobertura requerida: <strong>{selectedTemplate.defaultRequiredHeadcount} persona(s)</strong>
                  </p>
                  <p>
                    • Se crearán{" "}
                    <strong>
                      {Math.ceil(
                        (form.watch("dateTo").getTime() - form.watch("dateFrom").getTime()) / (1000 * 60 * 60 * 24),
                      ) + 1}{" "}
                      turnos
                    </strong>
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creando..." : "Crear Turnos"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
