"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useShiftTemplatesStore } from "@/stores/shift-templates-store";
import { useShiftsStore } from "@/stores/shifts-store";

const createShiftSchema = z.object({
  date: z.date({
    required_error: "La fecha es obligatoria",
  }),
  startTime: z.string().min(1, "La hora de inicio es obligatoria"),
  endTime: z.string().min(1, "La hora de fin es obligatoria"),
  costCenterId: z.string().min(1, "El centro es obligatorio"),
  positionId: z.string().optional(),
  requiredHeadcount: z.number().min(1, "Debe ser al menos 1").default(1),
  templateId: z.string().optional(),
  notes: z.string().optional(),
});

type CreateShiftFormData = z.infer<typeof createShiftSchema>;

interface CreateShiftDialogProps {
  trigger: React.ReactNode;
  defaultDate?: Date;
}

export function CreateShiftDialog({ trigger, defaultDate }: CreateShiftDialogProps) {
  const [open, setOpen] = useState(false);
  const { createShift, isLoading } = useShiftsStore();
  const { templates } = useShiftTemplatesStore();

  const form = useForm<CreateShiftFormData>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      date: defaultDate ?? new Date(),
      startTime: "09:00",
      endTime: "17:00",
      requiredHeadcount: 1,
      notes: "",
    },
  });

  const onSubmit = async (data: CreateShiftFormData) => {
    try {
      await createShift({
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        costCenterId: data.costCenterId,
        positionId: data.positionId,
        requiredHeadcount: data.requiredHeadcount,
        templateId: data.templateId,
        notes: data.notes,
      });
      toast.success("Turno creado correctamente");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear turno");
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      form.setValue("startTime", template.defaultStartTime);
      form.setValue("endTime", template.defaultEndTime);
      form.setValue("requiredHeadcount", template.defaultRequiredHeadcount);
      if (template.positionId) {
        form.setValue("positionId", template.positionId);
      }
      if (template.costCenterId) {
        form.setValue("costCenterId", template.costCenterId);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Turno</DialogTitle>
          <DialogDescription>
            Define los detalles del turno. Puedes usar una plantilla o configurarlo manualmente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template selector */}
            {templates.length > 0 && (
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plantilla (opcional)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleTemplateChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Usar plantilla..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: template.color }} />
                              {template.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Selecciona una plantilla para autocompletar campos</FormDescription>
                  </FormItem>
                )}
              />
            )}

            {/* Date picker */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full pl-3 text-left font-normal">
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
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
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time range */}
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

            {/* Cost center - TODO: cargar desde API */}
            <FormField
              control={form.control}
              name="costCenterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centro de Trabajo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un centro" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mock-center-1">Centro Principal</SelectItem>
                      <SelectItem value="mock-center-2">Centro Norte</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Position - TODO: cargar desde API */}
            <FormField
              control={form.control}
              name="positionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posición/Rol (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una posición" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mock-pos-1">Cajero</SelectItem>
                      <SelectItem value="mock-pos-2">Reponedor</SelectItem>
                      <SelectItem value="mock-pos-3">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Required headcount */}
            <FormField
              control={form.control}
              name="requiredHeadcount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cobertura Requerida</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Número de empleados necesarios para este turno</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Información adicional sobre el turno..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Turno
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
