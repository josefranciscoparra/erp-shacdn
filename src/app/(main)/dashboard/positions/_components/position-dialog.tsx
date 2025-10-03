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
import { positionSchema, type PositionFormData } from "./position-schema";
import { useOrganizationStore, type Position } from "@/stores/organization-store";

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: Position | null;
}

export function PositionDialog({ open, onOpenChange, position }: PositionDialogProps) {
  const { createPosition, updatePositionById, fetchPositions } = useOrganizationStore();

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: "",
      description: undefined,
      level: undefined,
    },
  });

  useEffect(() => {
    if (position) {
      form.reset({
        title: position.title,
        description: position.description || undefined,
        level: position.level || undefined,
      });
    } else {
      form.reset({
        title: "",
        description: undefined,
        level: undefined,
      });
    }
  }, [position, form]);

  const onSubmit = async (data: PositionFormData) => {
    try {
      if (position) {
        await updatePositionById(position.id, data);
      } else {
        await createPosition(data);
      }
      await fetchPositions();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error al guardar puesto:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {position ? "Editar puesto de trabajo" : "Nuevo puesto de trabajo"}
          </DialogTitle>
          <DialogDescription>
            {position
              ? "Modifica los datos del puesto seleccionado."
              : "Completa la información para crear un nuevo puesto de trabajo."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Puesto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Desarrollador Full Stack" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Senior, Junior, Manager"
                      {...field}
                      value={field.value || ""}
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
                      placeholder="Descripción del puesto de trabajo..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {position ? "Actualizar" : "Crear"} puesto
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
