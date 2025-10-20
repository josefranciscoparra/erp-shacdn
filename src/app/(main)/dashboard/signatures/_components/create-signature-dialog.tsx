"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { signableDocumentCategoryLabels } from "@/lib/validations/signature";

// Schema simplificado para el formulario
const createSignatureSchema = z.object({
  title: z.string().min(1, "Título requerido"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoría requerida"),
  file: z.instanceof(File).refine((file) => file.size <= 20 * 1024 * 1024, "Max 20MB"),
  expiresAt: z.date().min(new Date(), "Debe ser fecha futura"),
  employeeIds: z.array(z.string()).min(1, "Selecciona al menos un firmante"),
});

type CreateSignatureFormValues = z.infer<typeof createSignatureSchema>;

interface CreateSignatureDialogProps {
  onSuccess?: () => void;
}

export function CreateSignatureDialog({ onSuccess }: CreateSignatureDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const form = useForm<CreateSignatureFormValues>({
    resolver: zodResolver(createSignatureSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      employeeIds: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Solo se permiten archivos PDF");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("El archivo no puede superar 20MB");
        return;
      }
      setSelectedFile(file);
      form.setValue("file", file);
    }
  };

  const handleAddEmployee = (employeeId: string) => {
    if (!selectedEmployees.includes(employeeId)) {
      const newEmployees = [...selectedEmployees, employeeId];
      setSelectedEmployees(newEmployees);
      form.setValue("employeeIds", newEmployees);
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    const newEmployees = selectedEmployees.filter((id) => id !== employeeId);
    setSelectedEmployees(newEmployees);
    form.setValue("employeeIds", newEmployees);
  };

  const onSubmit = async (values: CreateSignatureFormValues) => {
    setIsSubmitting(true);

    try {
      // Nota: Esta es una implementación simplificada
      // En producción, primero necesitas:
      // 1. Subir el PDF y crear SignableDocument
      // 2. Crear la SignatureRequest con los firmantes

      toast.info("Funcionalidad en desarrollo");
      console.log("Form values:", values);

      // TODO: Implementar lógica real
      // const formData = new FormData();
      // formData.append("file", values.file);
      // formData.append("title", values.title);
      // ... etc

      setOpen(false);
      form.reset();
      setSelectedFile(null);
      setSelectedEmployees([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating signature request:", error);
      toast.error("Error al crear solicitud de firma");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Firma</DialogTitle>
          <DialogDescription>Sube un documento PDF y selecciona los empleados que deben firmarlo</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del documento *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Contrato de trabajo 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalles adicionales sobre el documento..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoría */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(signableDocumentCategoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Archivo PDF */}
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Documento PDF *</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                      />
                      {selectedFile && (
                        <div className="text-muted-foreground text-sm">
                          Archivo: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Máximo 20MB, solo PDF</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha de vencimiento */}
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha límite *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? (
                            field.value.toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                          ) : (
                            <span>Selecciona fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Fecha máxima para completar todas las firmas</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Firmantes */}
            <FormField
              control={form.control}
              name="employeeIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firmantes *</FormLabel>
                  <FormDescription>
                    Nota: Búsqueda de empleados no implementada. Usa IDs de empleado directamente.
                  </FormDescription>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="ID del empleado (ej: clxxx...)"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (employeeSearch) {
                            handleAddEmployee(employeeSearch);
                            setEmployeeSearch("");
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {selectedEmployees.length > 0 && (
                      <div className="space-y-1">
                        {selectedEmployees.map((empId, index) => (
                          <div key={empId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                            <div>
                              <span className="font-medium">Orden {index + 1}:</span> {empId}
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveEmployee(empId)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear Solicitud"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
