"use client";

import { useEffect, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationStore, type Position } from "@/stores/organization-store";

import { positionSchema, type PositionFormData } from "./position-schema";

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: Position | null;
}

export function PositionDialog({ open, onOpenChange, position }: PositionDialogProps) {
  const { createPosition, updatePositionById, fetchPositions, positionLevels, fetchPositionLevels } =
    useOrganizationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: "",
      description: undefined,
      levelId: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      fetchPositionLevels();
    }
  }, [open, fetchPositionLevels]);

  useEffect(() => {
    if (position) {
      form.reset({
        title: position.title,
        description: position.description ?? undefined,
        levelId: position.levelId ?? undefined,
      });
    } else {
      form.reset({
        title: "",
        description: undefined,
        levelId: undefined,
      });
    }
  }, [position, form]);

  const onSubmit = async (data: PositionFormData) => {
    setIsSubmitting(true);
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
      alert(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-100 sm:max-w-[425px] dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>{position ? "Editar puesto de trabajo" : "Nuevo puesto de trabajo"}</DialogTitle>
          <DialogDescription>
            {position
              ? "Modifica los datos del puesto seleccionado."
              : "Completa la información para crear un nuevo puesto de trabajo."}
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
                    <Input
                      placeholder="Ej: Desarrollador Full Stack"
                      className="placeholder:text-muted-foreground/50 bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="levelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccionar nivel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin nivel</SelectItem>
                      {positionLevels
                        .filter((level) => level.active)
                        .sort((a, b) => a.order - b.order)
                        .map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name} {level.code && `(${level.code})`}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del puesto de trabajo..."
                      className="placeholder:text-muted-foreground/50 min-h-[100px] bg-white"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : position ? "Actualizar puesto" : "Crear puesto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
