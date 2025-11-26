"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useManualTimeEntryStore } from "@/stores/manual-time-entry-store";

const requestSchema = z.object({
  date: z.string().nonempty("Selecciona una fecha"),
  clockInTime: z.string().nonempty("Introduce la hora de entrada"),
  clockOutTime: z.string().nonempty("Introduce la hora de salida"),
  reason: z.string().min(10, "El motivo debe tener al menos 10 caracteres").max(500, "Maximo 500 caracteres"),
});

export type ManualRequestFormValues = z.infer<typeof requestSchema>;

interface ManualRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualRequestDialog({ open, onOpenChange }: ManualRequestDialogProps) {
  const { createRequest, isLoading } = useManualTimeEntryStore();

  const form = useForm<ManualRequestFormValues>({
    resolver: zodResolver(requestSchema),
    mode: "onChange",
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      clockInTime: "09:00",
      clockOutTime: "18:00",
      reason: "",
    },
  });

  const handleSubmit = async (values: ManualRequestFormValues) => {
    try {
      const date = new Date(values.date);
      const [inHours, inMinutes] = values.clockInTime.split(":").map(Number);
      const [outHours, outMinutes] = values.clockOutTime.split(":").map(Number);

      const clockInTime = new Date(date);
      clockInTime.setHours(inHours, inMinutes, 0, 0);

      const clockOutTime = new Date(date);
      clockOutTime.setHours(outHours, outMinutes, 0, 0);

      await createRequest({
        date,
        clockInTime,
        clockOutTime,
        reason: values.reason,
      });

      toast.success("Solicitud enviada correctamente");
      onOpenChange(false);
      form.reset({
        date: format(new Date(), "yyyy-MM-dd"),
        clockInTime: "09:00",
        clockOutTime: "18:00",
        reason: "",
      });
    } catch {
      toast.error("Error al enviar la solicitud");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Fichaje</DialogTitle>
          <DialogDescription>Solicita la correccion de un fichaje olvidado o erroneo.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="date" {...field} />
                      <CalendarIcon className="text-muted-foreground absolute top-3 right-3 h-4 w-4" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="clockInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de entrada</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="time" {...field} />
                        <Clock className="text-muted-foreground absolute top-3 right-3 h-4 w-4" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clockOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de salida</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="time" {...field} />
                        <Clock className="text-muted-foreground absolute top-3 right-3 h-4 w-4" />
                      </div>
                    </FormControl>
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
                  <FormLabel>Motivo de la solicitud</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explica por que necesitas esta correccion de fichaje..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando
                  </>
                ) : (
                  "Enviar solicitud"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
