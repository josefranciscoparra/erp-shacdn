"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
import { useCostCentersStore, type CostCenterData } from "@/stores/cost-centers-store";

import { costCenterSchema, type CostCenterFormData } from "./cost-center-schema";

interface CostCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter?: CostCenterData | null;
}

const timezones = [
  "Europe/Madrid",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export function CostCenterDialog({ open, onOpenChange, costCenter }: CostCenterDialogProps) {
  const { addCostCenter, updateCostCenter, fetchCostCenters } = useCostCentersStore();

  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      name: "",
      code: undefined,
      address: undefined,
      timezone: undefined,
      active: true,
    },
  });

  useEffect(() => {
    if (costCenter) {
      form.reset({
        name: costCenter.name,
        code: costCenter.code ?? undefined,
        address: costCenter.address ?? undefined,
        timezone: costCenter.timezone ?? undefined,
        active: costCenter.active,
      });
    } else {
      form.reset({
        name: "",
        code: undefined,
        address: undefined,
        timezone: undefined,
        active: true,
      });
    }
  }, [costCenter, form]);

  const onSubmit = async (data: CostCenterFormData) => {
    try {
      if (costCenter) {
        await updateCostCenter(costCenter.id, data);
      } else {
        await addCostCenter(data);
      }
      await fetchCostCenters();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error al guardar centro de coste:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{costCenter ? "Editar centro de coste" : "Nuevo centro de coste"}</DialogTitle>
          <DialogDescription>
            {costCenter
              ? "Modifica los datos del centro de coste seleccionado."
              : "Completa la información para crear un nuevo centro de coste."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Oficina Central" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: OFF-001" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dirección completa del centro de coste..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zona Horaria</FormLabel>
                  <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar zona horaria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin zona horaria</SelectItem>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
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
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Centro activo</FormLabel>
                    <div className="text-muted-foreground text-[0.8rem]">
                      Los centros inactivos no aparecerán en las listas de selección
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">{costCenter ? "Actualizar" : "Crear"} centro</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
