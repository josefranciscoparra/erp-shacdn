/**
 * Modal para crear o editar plantillas de turnos rotativos
 */

"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { ShiftType } from "../_lib/types";
import { useShiftsStore } from "../_store/shifts-store";

const shiftTypes: { value: ShiftType; label: string; description: string }[] = [
  { value: "morning", label: "Mañana", description: "Inicio habitual 08:00" },
  { value: "afternoon", label: "Tarde", description: "Inicio habitual 16:00" },
  { value: "night", label: "Noche", description: "Inicio habitual 00:00" },
  { value: "saturday", label: "Sábado", description: "Refuerzo fin de semana" },
  { value: "sunday", label: "Domingo", description: "Refuerzo fin de semana" },
  { value: "custom", label: "Personalizado", description: "Para turnos especiales" },
  { value: "off", label: "Descanso", description: "Día libre" },
];

const templateFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  pattern: z
    .array(z.enum(["morning", "afternoon", "night", "off", "saturday", "sunday", "custom"]))
    .min(1, "Define al menos un día en el patrón"),
  shiftDuration: z.coerce.number().min(1, "Mínimo 1h").max(24, "Máximo 24h"),
  active: z.boolean().default(true),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export function TemplateDialog() {
  const { isTemplateDialogOpen, selectedTemplate, closeTemplateDialog, createTemplate, updateTemplate, isLoading } =
    useShiftsStore();

  const isEditing = !!selectedTemplate;
  const [typeToAdd, setTypeToAdd] = useState<ShiftType>("morning");

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      pattern: ["morning"],
      shiftDuration: 8,
      active: true,
    },
  });

  useEffect(() => {
    if (isEditing && selectedTemplate) {
      form.reset({
        name: selectedTemplate.name,
        description: selectedTemplate.description ?? "",
        pattern: selectedTemplate.pattern,
        shiftDuration: selectedTemplate.shiftDuration,
        active: selectedTemplate.active,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        pattern: ["morning"],
        shiftDuration: 8,
        active: true,
      });
    }
  }, [isEditing, selectedTemplate, form]);

  const onSubmit = async (values: TemplateFormValues) => {
    if (isEditing && selectedTemplate) {
      await updateTemplate(selectedTemplate.id, values);
    } else {
      await createTemplate(values);
    }
  };

  const handleAddShiftType = () => {
    const current = form.getValues("pattern");
    form.setValue("pattern", [...current, typeToAdd], { shouldDirty: true, shouldValidate: true });
  };

  const handleRemoveShiftType = (index: number) => {
    const current = form.getValues("pattern");
    current.splice(index, 1);
    form.setValue("pattern", [...current], { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Dialog open={isTemplateDialogOpen} onOpenChange={closeTemplateDialog}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Plantilla" : "Nueva Plantilla de Turnos"}</DialogTitle>
          <DialogDescription>
            Define patrones de turnos (M→T→N→Descanso) para aplicarlos rápidamente a los empleados.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Rotación M-T-N-L" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Notas internas sobre esta plantilla" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patrón (orden secuencial)</FormLabel>
                  <div className="flex items-center gap-2">
                    <Select value={typeToAdd} onValueChange={(value) => setTypeToAdd(value as ShiftType)}>
                      <FormControl>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {shiftTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <p className="font-medium">{type.label}</p>
                              <p className="text-muted-foreground text-xs">{type.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="secondary" size="sm" onClick={handleAddShiftType}>
                      <Plus className="mr-1 h-4 w-4" />
                      Añadir
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {field.value.map((type, index) => (
                      <Badge key={`${type}-${index}`} variant="secondary" className="flex items-center gap-1 text-xs">
                        {getShiftTypeLabel(type)}
                        <button
                          type="button"
                          onClick={() => handleRemoveShiftType(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shiftDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración de cada turno (horas)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" min="1" max="24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Plantilla activa</FormLabel>
                    <p className="text-muted-foreground text-xs">Solo las plantillas activas aparecerán al aplicar.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeTemplateDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isEditing ? "Guardar cambios" : "Crear plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function getShiftTypeLabel(type: ShiftType): string {
  const match = shiftTypes.find((t) => t.value === type);
  return match ? match.label : type;
}
