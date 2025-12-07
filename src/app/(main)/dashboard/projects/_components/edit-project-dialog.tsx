"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectAccessType } from "@prisma/client";
import { Globe, Loader2, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateProject, type ProjectDetail } from "@/server/actions/projects";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  accessType: z.enum(["OPEN", "ASSIGNED"]),
});

type FormValues = z.infer<typeof formSchema>;

interface EditProjectDialogProps {
  project: ProjectDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated?: () => void;
}

const COLORS = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#eab308", label: "Amarillo" },
  { value: "#f97316", label: "Naranja" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#64748b", label: "Gris" },
];

export function EditProjectDialog({ project, open, onOpenChange, onProjectUpdated }: EditProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project.name,
      code: project.code ?? "",
      description: project.description ?? "",
      color: project.color ?? "#3b82f6",
      accessType: project.accessType,
    },
  });

  // Reset form when project changes
  useEffect(() => {
    form.reset({
      name: project.name,
      code: project.code ?? "",
      description: project.description ?? "",
      color: project.color ?? "#3b82f6",
      accessType: project.accessType,
    });
  }, [project, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const { success, error } = await updateProject(project.id, {
        name: values.name,
        code: values.code ?? null,
        description: values.description ?? null,
        color: values.color ?? null,
        accessType: values.accessType as ProjectAccessType,
      });

      if (success) {
        onProjectUpdated?.();
      } else {
        toast.error(error ?? "Error al actualizar el proyecto");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Proyecto</DialogTitle>
          <DialogDescription>Modifica los datos del proyecto &quot;{project.name}&quot;</DialogDescription>
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
                    <Input placeholder="Ej: Proyecto Web 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codigo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: PWEB-24" {...field} />
                    </FormControl>
                    <FormDescription>Codigo corto opcional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un color">
                            {field.value && (
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: field.value }} />
                                {COLORS.find((c) => c.value === field.value)?.label ?? "Color"}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color.value }} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Acceso</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de acceso" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="OPEN">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          <span>Abierto - Todos los empleados</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ASSIGNED">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-orange-500" />
                          <span>Asignado - Solo empleados asignados</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {field.value === "OPEN"
                      ? "Todos los empleados pueden fichar en este proyecto"
                      : "Solo los empleados asignados pueden fichar en este proyecto"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripcion opcional del proyecto..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
