"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { positionLevelSchema, type PositionLevelFormData } from "./position-level-schema";
import { useOrganizationStore, type PositionLevel } from "@/stores/organization-store";

interface PositionLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level?: PositionLevel | null;
}

export function PositionLevelDialog({ open, onOpenChange, level }: PositionLevelDialogProps) {
  const { createPositionLevel, updatePositionLevelById, fetchPositionLevels } = useOrganizationStore();

  const form = useForm<PositionLevelFormData>({
    resolver: zodResolver(positionLevelSchema),
    defaultValues: {
      name: "",
      code: undefined,
      order: 0,
      description: undefined,
      minSalary: undefined,
      maxSalary: undefined,
      active: true,
    },
  });

  useEffect(() => {
    if (level) {
      form.reset({
        name: level.name,
        code: level.code || undefined,
        order: level.order,
        description: level.description || undefined,
        minSalary: level.minSalary ? Number(level.minSalary) : undefined,
        maxSalary: level.maxSalary ? Number(level.maxSalary) : undefined,
        active: level.active,
      });
    } else {
      form.reset({
        name: "",
        code: undefined,
        order: 0,
        description: undefined,
        minSalary: undefined,
        maxSalary: undefined,
        active: true,
      });
    }
  }, [level, form]);

  const onSubmit = async (data: PositionLevelFormData) => {
    try {
      if (level) {
        await updatePositionLevelById(level.id, data);
      } else {
        await createPositionLevel(data);
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error al guardar nivel de puesto:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {level ? "Editar nivel de puesto" : "Nuevo nivel de puesto"}
          </DialogTitle>
          <DialogDescription>
            {level
              ? "Modifica los datos del nivel de puesto seleccionado."
              : "Completa la información para crear un nuevo nivel de puesto."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Senior" {...field} />
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
                      <Input
                        placeholder="Ej: SR"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
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
                    <Textarea
                      placeholder="Descripción del nivel de puesto..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Mínimo (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Máximo (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Nivel activo</FormLabel>
                    <div className="text-[0.8rem] text-muted-foreground">
                      Los niveles inactivos no aparecerán en las listas de selección
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
              <Button type="submit">
                {level ? "Actualizar" : "Crear"} nivel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
