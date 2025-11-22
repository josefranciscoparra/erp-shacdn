"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { EmployeeCombobox } from "@/components/ui/employee-combobox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProcedure } from "@/server/actions/expense-procedures";

const formSchema = z.object({
  name: z.string().min(3, "El nombre es requerido"),
  description: z.string().optional(),
  startDate: z.string().optional(), // HTML date input returns string
  endDate: z.string().optional(),
  estimatedAmount: z.string().optional(), // Input type number returns string usually
  employeeId: z.string().optional(),
});

interface ProcedureFormProps {
  canAssignEmployee?: boolean;
}

export function ProcedureForm({ canAssignEmployee = false }: ProcedureFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      estimatedAmount: "",
      employeeId: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const payload = {
        ...values,
        estimatedAmount: values.estimatedAmount ? parseFloat(values.estimatedAmount) : undefined,
        startDate: values.startDate ? new Date(values.startDate) : undefined,
        endDate: values.endDate ? new Date(values.endDate) : undefined,
        employeeId: values.employeeId ?? undefined,
      };

      const result = await createProcedure(payload);

      if (result.success) {
        toast.success("Expediente creado", {
          description: "El expediente se ha creado correctamente en estado borrador.",
        });
        router.push("/dashboard/procedures");
        router.refresh();
      } else {
        toast.error("Error", {
          description: result.error ?? "Ha ocurrido un error al crear el expediente",
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {canAssignEmployee && (
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Beneficiario (Empleado)</FormLabel>
                <FormControl>
                  <EmployeeCombobox
                    value={field.value}
                    onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                    placeholder="Selecciona un empleado (Opcional)"
                    emptyText="Sin responsable (Borrador)"
                    minChars={2}
                  />
                </FormControl>
                <FormDescription>Si lo dejas vacío, se guardará como borrador sin asignar.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Expediente / Comisión</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Viaje a Congreso Madrid" {...field} />
              </FormControl>
              <FormDescription>Título descriptivo para identificar el expediente.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción / Motivo</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles sobre el motivo del gasto o viaje..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Inicio</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Fin</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="estimatedAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Presupuesto Estimado (€)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormDescription>Importe aproximado previsto para reservar crédito.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando..." : "Crear Expediente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
