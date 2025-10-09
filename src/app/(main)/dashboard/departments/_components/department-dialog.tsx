"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DepartmentData, useDepartmentsStore } from "@/stores/departments-store";

import { departmentFormSchema, DepartmentFormData } from "./department-schema";

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: DepartmentData | null;
  costCenters?: Array<{ id: string; name: string; code: string | null }>;
  employees?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    email: string | null;
  }>;
}

export function DepartmentDialog({
  open,
  onOpenChange,
  department = null,
  costCenters = [],
  employees = [],
}: DepartmentDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { addDepartment, updateDepartment, fetchDepartments } = useDepartmentsStore();

  const isEditing = Boolean(department);

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      costCenterId: "",
      managerId: "",
    },
  });

  // Actualizar valores del formulario cuando se cambia el departamento
  React.useEffect(() => {
    if (department) {
      form.reset({
        name: department.name,
        description: department.description ?? "",
        costCenterId: department.costCenter?.id ?? "none",
        managerId: department.manager?.id ?? "none",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        costCenterId: "none",
        managerId: "none",
      });
    }
  }, [department, form]);

  const onSubmit = async (data: DepartmentFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        name: data.name,
        description: data.description ?? undefined,
        costCenterId: data.costCenterId === "none" ? undefined : (data.costCenterId ?? undefined),
        managerId: data.managerId === "none" ? undefined : (data.managerId ?? undefined),
      };

      if (isEditing && department) {
        // Actualizar departamento existente
        const response = await fetch(`/api/departments/${department.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error ?? "Error al actualizar departamento");
        }

        const updatedDepartment = await response.json();
        updateDepartment(department.id, updatedDepartment);
      } else {
        // Crear nuevo departamento
        const response = await fetch("/api/departments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error ?? "Error al crear departamento");
        }

        const newDepartment = await response.json();
        addDepartment(newDepartment);
      }

      // Refrescar datos
      await fetchDepartments();

      // Limpiar formulario y cerrar modal
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      // Aquí podrías mostrar un toast de error
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar departamento" : "Nuevo departamento"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del departamento."
              : "Completa los datos para crear un nuevo departamento."}
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
                    <Input placeholder="Ej. Recursos Humanos" {...field} disabled={isLoading} />
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
                      placeholder="Descripción opcional del departamento"
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="costCenterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centro de Coste</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar centro de coste" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin centro de coste</SelectItem>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name} {center.code && `(${center.code})`}
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
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar responsable" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin responsable</SelectItem>
                      {employees.map((employee) => {
                        const fullName = [employee.firstName, employee.lastName, employee.secondLastName]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <SelectItem key={employee.id} value={employee.id}>
                            {fullName}
                            {employee.email && (
                              <span className="text-muted-foreground ml-2 text-sm">({employee.email})</span>
                            )}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
