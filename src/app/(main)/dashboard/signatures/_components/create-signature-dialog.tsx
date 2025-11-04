"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CalendarIcon, Plus, Users, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { signableDocumentCategoryLabels } from "@/lib/validations/signature";

// Schema para el formulario con opciones de destinatarios
const createSignatureSchema = z
  .object({
    title: z.string().min(1, "Título requerido"),
    description: z.string().optional(),
    category: z.string().min(1, "Categoría requerida"),
    file: z.instanceof(File).refine((file) => file.size <= 20 * 1024 * 1024, "Max 20MB"),
    expiresAt: z.date().min(new Date(), "Debe ser fecha futura"),
    recipientType: z.enum(["ALL", "DEPARTMENTS", "SPECIFIC"]),
    departmentIds: z.array(z.string()).optional(),
    employeeIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.recipientType === "DEPARTMENTS") {
        return data.departmentIds && data.departmentIds.length > 0;
      }
      if (data.recipientType === "SPECIFIC") {
        return data.employeeIds && data.employeeIds.length > 0;
      }
      return true;
    },
    {
      message: "Debes seleccionar al menos un destinatario",
      path: ["employeeIds"],
    },
  );

type CreateSignatureFormValues = z.infer<typeof createSignatureSchema>;

interface CreateSignatureDialogProps {
  onSuccess?: () => void;
}

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  fullName: string;
  employeeNumber: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
}

export function CreateSignatureDialog({ onSuccess }: CreateSignatureDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [recipientType, setRecipientType] = useState<"ALL" | "DEPARTMENTS" | "SPECIFIC">("SPECIFIC");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [openComboboxAdvanced, setOpenComboboxAdvanced] = useState(false);

  const form = useForm<CreateSignatureFormValues>({
    resolver: zodResolver(createSignatureSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      recipientType: "SPECIFIC",
      departmentIds: [],
      employeeIds: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
    },
  });

  // Cargar departamentos al abrir el diálogo
  useEffect(() => {
    if (open) {
      fetch("/api/departments")
        .then((res) => res.json())
        .then((data) => {
          // El API devuelve el array directamente, no { departments: [...] }
          setDepartments(Array.isArray(data) ? data : []);
        })
        .catch((error) => {
          console.error("Error loading departments:", error);
          setDepartments([]);
        });
    }
  }, [open]);

  // Buscar empleados cuando cambia el input
  useEffect(() => {
    const searchEmployees = async () => {
      if (employeeSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/employees/search?q=${encodeURIComponent(employeeSearch)}&limit=10`);
        const data = await response.json();
        setSearchResults(data ?? []);
      } catch (error) {
        console.error("Error searching employees:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchEmployees, 300);
    return () => clearTimeout(debounceTimer);
  }, [employeeSearch]);

  // Cerrar popovers cuando cambia el tipo de destinatario
  useEffect(() => {
    setOpenCombobox(false);
    setOpenComboboxAdvanced(false);
  }, [recipientType]);

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

  const handleAddEmployee = (employee: Employee) => {
    if (!selectedEmployees.find((e) => e.id === employee.id)) {
      const newEmployees = [...selectedEmployees, employee];
      setSelectedEmployees(newEmployees);
      form.setValue(
        "employeeIds",
        newEmployees.map((e) => e.id),
      );
      setEmployeeSearch("");
      setOpenCombobox(false);
      setOpenComboboxAdvanced(false);
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    const newEmployees = selectedEmployees.filter((e) => e.id !== employeeId);
    setSelectedEmployees(newEmployees);
    form.setValue(
      "employeeIds",
      newEmployees.map((e) => e.id),
    );
  };

  const handleToggleDepartment = (deptId: string) => {
    const newDepartments = selectedDepartments.includes(deptId)
      ? selectedDepartments.filter((id) => id !== deptId)
      : [...selectedDepartments, deptId];
    setSelectedDepartments(newDepartments);
    form.setValue("departmentIds", newDepartments);
  };

  const handleRecipientTypeChange = (value: "ALL" | "DEPARTMENTS" | "SPECIFIC") => {
    setRecipientType(value);
    form.setValue("recipientType", value);

    // Limpiar estado de búsqueda al cambiar de tipo
    setEmployeeSearch("");
    setSearchResults([]);
    setOpenCombobox(false);
    setOpenComboboxAdvanced(false);

    // Si selecciona opciones masivas, mostrar el panel avanzado
    if (value === "ALL" || value === "DEPARTMENTS") {
      setShowAdvancedOptions(true);
    }
  };

  const onSubmit = async (values: CreateSignatureFormValues) => {
    setIsSubmitting(true);

    try {
      // 1. Subir el PDF y crear SignableDocument
      const formData = new FormData();
      formData.append("file", values.file);
      formData.append("title", values.title);
      formData.append("category", values.category);
      if (values.description) {
        formData.append("description", values.description);
      }

      const uploadResponse = await fetch("/api/signatures/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error ?? "Error al subir documento");
      }

      const { document: uploadedDoc } = await uploadResponse.json();

      // 2. Crear la SignatureRequest
      const requestData = new FormData();
      requestData.append("documentId", uploadedDoc.id);
      requestData.append("policy", "SES");
      requestData.append("expiresAt", values.expiresAt.toISOString());
      requestData.append("recipientType", values.recipientType);

      if (values.recipientType === "DEPARTMENTS" && values.departmentIds) {
        requestData.append("departmentIds", JSON.stringify(values.departmentIds));
      } else if (values.recipientType === "SPECIFIC" && values.employeeIds) {
        requestData.append("employeeIds", JSON.stringify(values.employeeIds));
      }

      const createResponse = await fetch("/api/signatures/requests/create", {
        method: "POST",
        body: requestData,
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error ?? "Error al crear solicitud");
      }

      const { request } = await createResponse.json();

      toast.success(`Solicitud creada: ${request.signerCount} firmante(s) notificado(s)`);

      setOpen(false);
      form.reset();
      setSelectedFile(null);
      setSelectedEmployees([]);
      setSelectedDepartments([]);
      setRecipientType("SPECIFIC");
      setShowAdvancedOptions(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating signature request:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear solicitud de firma");
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

            {/* Firmante(s) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel>Firmante *</FormLabel>
                  <FormDescription>Empleado que debe firmar este documento</FormDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-xs"
                >
                  {showAdvancedOptions ? "Opciones básicas" : "Múltiples destinatarios"}
                </Button>
              </div>

              {/* Modo simple: Un solo empleado */}
              {!showAdvancedOptions && (
                <div className="space-y-2">
                  <FormDescription className="text-xs">Busca por nombre, email o número de empleado</FormDescription>

                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        <span className="text-muted-foreground">Buscar empleado...</span>
                        <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar empleado..."
                          value={employeeSearch}
                          onValueChange={setEmployeeSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isSearching
                              ? "Buscando..."
                              : employeeSearch.length < 2
                                ? "Escribe al menos 2 caracteres"
                                : "No se encontraron empleados"}
                          </CommandEmpty>
                          {searchResults.length > 0 && (
                            <CommandGroup>
                              {searchResults.map((employee) => (
                                <CommandItem
                                  key={employee.id}
                                  value={employee.id}
                                  onSelect={() => handleAddEmployee(employee)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{employee.fullName}</span>
                                      {employee.employeeNumber && (
                                        <span className="text-muted-foreground text-xs">
                                          #{employee.employeeNumber}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-muted-foreground flex gap-2 text-xs">
                                      {employee.position && <span>{employee.position}</span>}
                                      {employee.department && <span>• {employee.department}</span>}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedEmployees.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {selectedEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="bg-muted/50 flex items-center justify-between rounded-md border p-2 text-sm"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <Users className="text-muted-foreground h-4 w-4" />
                              <span className="font-medium">{employee.fullName}</span>
                            </div>
                            {employee.position && (
                              <span className="text-muted-foreground pl-6 text-xs">
                                {employee.position}
                                {employee.department && ` • ${employee.department}`}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEmployee(employee.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modo avanzado: Múltiples opciones */}
              {showAdvancedOptions && (
                <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
                  <FormLabel className="text-sm">Tipo de destinatarios</FormLabel>

                  <RadioGroup
                    value={recipientType}
                    onValueChange={(value) => handleRecipientTypeChange(value as "ALL" | "DEPARTMENTS" | "SPECIFIC")}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SPECIFIC" id="specific" />
                      <Label htmlFor="specific" className="flex cursor-pointer items-center gap-2 font-normal">
                        <Users className="h-4 w-4" />
                        Empleados específicos
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="DEPARTMENTS" id="departments" />
                      <Label htmlFor="departments" className="flex cursor-pointer items-center gap-2 font-normal">
                        <Building2 className="h-4 w-4" />
                        Departamentos completos
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ALL" id="all" />
                      <Label htmlFor="all" className="flex cursor-pointer items-center gap-2 font-normal">
                        <Building2 className="h-4 w-4" />
                        Toda la organización
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Empleados específicos (múltiples) */}
                  {recipientType === "SPECIFIC" && (
                    <div className="space-y-2 pl-6">
                      <FormLabel className="text-sm">Agregar empleados</FormLabel>
                      <FormDescription className="text-xs">Busca y agrega múltiples empleados</FormDescription>

                      <Popover open={openComboboxAdvanced} onOpenChange={setOpenComboboxAdvanced}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            <span className="text-muted-foreground">Buscar empleado...</span>
                            <Plus className="ml-2 h-4 w-4 shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Buscar empleado..."
                              value={employeeSearch}
                              onValueChange={setEmployeeSearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {isSearching
                                  ? "Buscando..."
                                  : employeeSearch.length < 2
                                    ? "Escribe al menos 2 caracteres"
                                    : "No se encontraron empleados"}
                              </CommandEmpty>
                              {searchResults.length > 0 && (
                                <CommandGroup>
                                  {searchResults.map((employee) => (
                                    <CommandItem
                                      key={employee.id}
                                      value={employee.id}
                                      onSelect={() => handleAddEmployee(employee)}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{employee.fullName}</span>
                                          {employee.employeeNumber && (
                                            <span className="text-muted-foreground text-xs">
                                              #{employee.employeeNumber}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-muted-foreground flex gap-2 text-xs">
                                          {employee.position && <span>{employee.position}</span>}
                                          {employee.department && <span>• {employee.department}</span>}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {selectedEmployees.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {selectedEmployees.map((employee, index) => (
                            <div
                              key={employee.id}
                              className="flex items-center justify-between rounded-md border p-2 text-sm"
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">#{index + 1}:</span>
                                  <span>{employee.fullName}</span>
                                </div>
                                {employee.position && (
                                  <span className="text-muted-foreground pl-8 text-xs">
                                    {employee.position}
                                    {employee.department && ` • ${employee.department}`}
                                  </span>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEmployee(employee.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Por departamentos */}
                  {recipientType === "DEPARTMENTS" && (
                    <div className="space-y-2 pl-6">
                      <FormLabel className="text-sm">Selecciona departamentos</FormLabel>
                      <div className="bg-background grid max-h-[200px] gap-2 overflow-y-auto rounded-md border p-2">
                        {departments.map((dept) => (
                          <div key={dept.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={dept.id}
                              checked={selectedDepartments.includes(dept.id)}
                              onChange={() => handleToggleDepartment(dept.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={dept.id} className="cursor-pointer font-normal">
                              {dept.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {selectedDepartments.length > 0 && (
                        <p className="text-muted-foreground text-xs">
                          {selectedDepartments.length} departamento(s) seleccionado(s)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Toda la organización */}
                  {recipientType === "ALL" && (
                    <div className="bg-primary/10 rounded-md p-3 pl-6">
                      <p className="text-primary text-sm">
                        Se enviará a <strong>todos los empleados activos</strong> de la organización
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

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
