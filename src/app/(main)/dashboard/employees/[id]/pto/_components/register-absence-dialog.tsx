"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getActiveAbsenceTypes } from "@/server/actions/absence-types";
import { registerManualAbsence } from "@/server/actions/admin-pto";

const formSchema = z
  .object({
    absenceTypeId: z.string().min(1, "Selecciona un tipo de ausencia"),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    reason: z.string().trim().min(1, "Indica el motivo"),
    internalNotes: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.startDate) && Boolean(data.endDate), {
    message: "Selecciona las fechas de la ausencia",
    path: ["startDate"],
  })
  .refine((data) => (!data.startDate || !data.endDate ? true : data.startDate <= data.endDate), {
    message: "La fecha de inicio no puede ser posterior a la fecha de fin",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof formSchema>;

type AbsenceTypeOption = {
  id: string;
  name: string;
  color: string;
};

interface RegisterAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  onSuccess: () => void;
}

export function RegisterAbsenceDialog({ open, onOpenChange, employeeId, onSuccess }: RegisterAbsenceDialogProps) {
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceTypeOption[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      absenceTypeId: "",
      startDate: undefined,
      endDate: undefined,
      reason: "",
      internalNotes: "",
    },
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  useEffect(() => {
    if (!open) {
      form.reset();
      return;
    }

    const loadAbsenceTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const types = await getActiveAbsenceTypes();
        setAbsenceTypes(types.map((type) => ({ id: type.id, name: type.name, color: type.color })));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar los tipos de ausencia");
      } finally {
        setIsLoadingTypes(false);
      }
    };

    loadAbsenceTypes();
  }, [open, form]);

  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      form.setValue("endDate", startDate);
    }
  }, [startDate, endDate, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      if (!data.startDate || !data.endDate) {
        form.setError("root", { message: "Selecciona las fechas de la ausencia" });
        return;
      }

      const trimmedInternalNotes = data.internalNotes ? data.internalNotes.trim() : "";
      const internalNotes = trimmedInternalNotes ? trimmedInternalNotes : undefined;

      await registerManualAbsence(
        employeeId,
        data.absenceTypeId,
        data.startDate.getTime(),
        data.endDate.getTime(),
        data.reason,
        internalNotes,
      );

      toast.success("Ausencia registrada correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar la ausencia");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar ausencia</DialogTitle>
          <DialogDescription>Registra una ausencia en nombre del empleado.</DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
          <AlertTitle>Se registrará como aprobada</AlertTitle>
          <AlertDescription>La ausencia se creará aprobada y se notificará al empleado.</AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="absenceTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de ausencia *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingTypes ? "Cargando tipos..." : "Seleccionar tipo"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingTypes && (
                        <SelectItem value="loading" disabled>
                          Cargando tipos...
                        </SelectItem>
                      )}
                      {!isLoadingTypes && absenceTypes.length === 0 && (
                        <SelectItem value="empty" disabled>
                          No hay tipos disponibles
                        </SelectItem>
                      )}
                      {absenceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "9999px",
                                backgroundColor: type.color,
                              }}
                            />
                            <span>{type.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha inicio *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: es }) : "Selecciona una fecha"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha fin *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: es }) : "Selecciona una fecha"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => (startDate ? date < startOfDay(startDate) : false)}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Baja médica" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas internas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Solo visible para RRHH" rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Estas notas no son visibles para el empleado.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Registrar ausencia"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
