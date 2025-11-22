"use client";

import { useState, useTransition, useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmployeeCombobox } from "@/components/ui/employee-combobox"; // Assuming this exists from previous file context
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateProcedure } from "@/server/actions/expense-procedures";

const formSchema = z.object({
  name: z.string().min(3, "El nombre es requerido"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  estimatedAmount: z.string().optional(),
  status: z
    .enum(["DRAFT", "PENDING_AUTHORIZATION", "AUTHORIZED", "JUSTIFICATION_PENDING", "JUSTIFIED", "CLOSED", "REJECTED"])
    .optional(),
  employeeId: z.string().optional(),
});

interface EditProcedureDialogProps {
  procedure: {
    id: string;
    name: string;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    estimatedAmount: number | null;
    status: string;
    employeeId: string | null;
  };
  canManage: boolean; // Manager/Admin who can assign employees
}

export function EditProcedureDialog({ procedure, canManage }: EditProcedureDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: procedure.name,
      description: procedure.description ?? "",
      startDate: procedure.startDate ? format(new Date(procedure.startDate), "yyyy-MM-dd") : "",
      endDate: procedure.endDate ? format(new Date(procedure.endDate), "yyyy-MM-dd") : "",
      estimatedAmount: procedure.estimatedAmount?.toString() ?? "",
      status: procedure.status as any,
      employeeId: procedure.employeeId ?? "",
    },
  });

  // Reset form when opening dialog to ensure fresh data if props change
  useEffect(() => {
    if (open) {
      form.reset({
        name: procedure.name,
        description: procedure.description ?? "",
        startDate: procedure.startDate ? format(new Date(procedure.startDate), "yyyy-MM-dd") : "",
        endDate: procedure.endDate ? format(new Date(procedure.endDate), "yyyy-MM-dd") : "",
        estimatedAmount: procedure.estimatedAmount?.toString() ?? "",
        status: procedure.status as any,
        employeeId: procedure.employeeId ?? "",
      });
    }
  }, [open, procedure, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const payload = {
        ...values,
        estimatedAmount: values.estimatedAmount ? parseFloat(values.estimatedAmount) : undefined,
        startDate: values.startDate ? new Date(values.startDate) : undefined,
        endDate: values.endDate ? new Date(values.endDate) : undefined,
        // Only include employeeId if the user has permission to manage it
        ...(canManage ? { employeeId: values.employeeId ?? null } : {}),
      };

      // We need to cast employeeId to allow null because the schema is slightly different in the action
      // The action expects employeeId?: string | null | undefined
      const result = await updateProcedure(procedure.id, payload as any);

      if (result.success) {
        toast.success("Expediente actualizado", {
          description: "Los cambios se han guardado correctamente.",
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Error", {
          description: result.error ?? "Ha ocurrido un error al actualizar el expediente",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Expediente</DialogTitle>
          <DialogDescription>Modifica los detalles del expediente o provisión de fondos.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {canManage && (
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem className="rounded-md border bg-slate-50 p-4">
                    <FormLabel className="text-blue-700">Asignar Beneficiario</FormLabel>
                    <FormControl>
                      <EmployeeCombobox
                        value={field.value}
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                        placeholder="Selecciona un empleado"
                        emptyText="Sin asignar (Borrador)"
                        minChars={2}
                      />
                    </FormControl>
                    <FormDescription>
                      Cambiar el beneficiario transferirá el expediente a otro empleado.
                    </FormDescription>
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
                  <FormLabel>Nombre / Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Viaje a Congreso" {...field} />
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
                    <Textarea placeholder="Detalles..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presupuesto (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Solo mostrar cambio de estado si es necesario, generalmente se hace por acciones separadas */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canManage}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                        <SelectItem value="PENDING_AUTHORIZATION">Pendiente Autorización</SelectItem>
                        <SelectItem value="AUTHORIZED">Autorizado</SelectItem>
                        <SelectItem value="JUSTIFICATION_PENDING">Pendiente Justificación</SelectItem>
                        <SelectItem value="JUSTIFIED">Justificado</SelectItem>
                        <SelectItem value="CLOSED">Cerrado</SelectItem>
                        <SelectItem value="REJECTED">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
