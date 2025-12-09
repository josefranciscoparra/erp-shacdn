"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Plus,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createSignatureBatch,
  activateBatchWithRecipients,
  getAvailableDocumentsForBatch,
  getAvailableEmployeesForBatch,
} from "@/server/actions/signature-batch";

// Schema para el wizard de lotes
const createBatchSchema = z
  .object({
    // Paso 1: Información del lote
    name: z.string().min(1, "El nombre es requerido").max(200, "Máximo 200 caracteres"),
    description: z.string().max(500, "Máximo 500 caracteres").optional(),
    documentId: z.string().min(1, "Debes seleccionar un documento"),

    // Paso 2: Destinatarios
    recipientType: z.enum(["ALL", "DEPARTMENT", "MANUAL"]),
    departmentId: z.string().optional(),
    employeeIds: z.array(z.string()),

    // Paso 3: Doble firma
    requireDoubleSignature: z.boolean(),
    secondSignerRole: z.enum(["MANAGER", "HR", "SPECIFIC_USER"]).optional(),
    secondSignerUserId: z.string().optional(),

    // Paso 4: Expiración y recordatorios
    expiresAt: z.date(),
    reminderDays: z.array(z.number()),
  })
  .refine(
    (data) => {
      if (data.recipientType === "DEPARTMENT") {
        return !!data.departmentId;
      }
      if (data.recipientType === "MANUAL") {
        return data.employeeIds.length > 0;
      }
      return true;
    },
    {
      message: "Debes seleccionar al menos un destinatario",
      path: ["employeeIds"],
    },
  )
  .refine(
    (data) => {
      if (data.requireDoubleSignature) {
        return !!data.secondSignerRole;
      }
      return true;
    },
    {
      message: "Debes seleccionar quién será el segundo firmante",
      path: ["secondSignerRole"],
    },
  )
  .refine(
    (data) => {
      if (data.requireDoubleSignature && data.secondSignerRole === "SPECIFIC_USER") {
        return !!data.secondSignerUserId;
      }
      return true;
    },
    {
      message: "Debes seleccionar un usuario específico",
      path: ["secondSignerUserId"],
    },
  );

type CreateBatchFormValues = z.infer<typeof createBatchSchema>;

interface CreateBatchDialogProps {
  onSuccess?: () => void;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string | null;
  hasUser: boolean;
  userId: string | null;
}

const STEPS = [
  { title: "Documento", icon: FileText, description: "Selecciona el documento" },
  { title: "Destinatarios", icon: Users, description: "Elige quién firmará" },
  { title: "Doble firma", icon: UserPlus, description: "Configura validación" },
  { title: "Expiración", icon: CalendarIcon, description: "Fecha y recordatorios" },
  { title: "Resumen", icon: Check, description: "Confirma y crea" },
];

const DEFAULT_REMINDER_DAYS = [7, 3, 1];

export function CreateBatchDialog({ onSuccess }: CreateBatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Datos cargados
  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [allEmployeesCount, setAllEmployeesCount] = useState(0);

  // Estados de UI
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openEmployeeCombobox, setOpenEmployeeCombobox] = useState(false);
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<Employee[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedSecondSigner, setSelectedSecondSigner] = useState<Employee | null>(null);

  const form = useForm<CreateBatchFormValues>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      name: "",
      description: "",
      documentId: "",
      recipientType: "MANUAL",
      departmentId: "",
      employeeIds: [],
      requireDoubleSignature: false,
      secondSignerRole: undefined,
      secondSignerUserId: "",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 días
      reminderDays: DEFAULT_REMINDER_DAYS,
    },
  });

  const recipientType = form.watch("recipientType");
  const requireDoubleSignature = form.watch("requireDoubleSignature");
  const secondSignerRole = form.watch("secondSignerRole");
  const selectedDocumentId = form.watch("documentId");
  const selectedDepartmentId = form.watch("departmentId");

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      loadDocuments();
      loadDepartments();
      loadAllEmployees();
    }
  }, [open]);

  // Buscar empleados para selección manual
  useEffect(() => {
    const searchEmployees = async () => {
      if (employeeSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await getAvailableEmployeesForBatch({ search: employeeSearch });
        if (result.success && result.data) {
          // Filtrar empleados ya seleccionados
          const filtered = result.data.filter(
            (emp) => !selectedEmployees.find((s) => s.id === emp.id) && emp.hasUser && Boolean(emp.userId),
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error("Error searching employees:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchEmployees, 300);
    return () => clearTimeout(debounceTimer);
  }, [employeeSearch, selectedEmployees]);

  // Buscar usuarios para segundo firmante específico
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setUserSearchResults([]);
        return;
      }

      try {
        const result = await getAvailableEmployeesForBatch({ search: userSearch });
        if (result.success && result.data) {
          const withUser = result.data.filter((emp) => emp.hasUser && Boolean(emp.userId));
          setUserSearchResults(withUser);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [userSearch]);

  const loadDocuments = async () => {
    try {
      const result = await getAvailableDocumentsForBatch();
      if (result.success && result.data) {
        setDocuments(result.data);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  };

  const loadAllEmployees = async () => {
    try {
      const result = await getAvailableEmployeesForBatch();
      if (result.success && result.data) {
        const withUser = result.data.filter((emp) => emp.hasUser && Boolean(emp.userId));
        setEmployees(withUser);
        setAllEmployeesCount(withUser.length);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const handleAddEmployee = (employee: Employee) => {
    const newEmployees = [...selectedEmployees, employee];
    setSelectedEmployees(newEmployees);
    form.setValue(
      "employeeIds",
      newEmployees.map((e) => e.id),
    );
    setEmployeeSearch("");
    setOpenEmployeeCombobox(false);
  };

  const handleRemoveEmployee = (employeeId: string) => {
    const newEmployees = selectedEmployees.filter((e) => e.id !== employeeId);
    setSelectedEmployees(newEmployees);
    form.setValue(
      "employeeIds",
      newEmployees.map((e) => e.id),
    );
  };

  const handleSelectSecondSigner = (employee: Employee) => {
    if (!employee.userId) {
      toast.error("El empleado seleccionado no tiene usuario activo");
      return;
    }

    setSelectedSecondSigner(employee);
    form.setValue("secondSignerUserId", employee.userId);
    setUserSearch("");
    setOpenUserCombobox(false);
  };

  const getRecipientCount = (): number => {
    switch (recipientType) {
      case "ALL":
        return allEmployeesCount;
      case "DEPARTMENT":
        return employees.filter((emp) => {
          const dept = departments.find((d) => d.id === selectedDepartmentId);
          return dept && emp.departmentName === dept.name;
        }).length;
      case "MANUAL":
        return selectedEmployees.length;
      default:
        return 0;
    }
  };

  const getRecipientEmployeeIds = (): string[] => {
    switch (recipientType) {
      case "ALL":
        return employees.map((emp) => emp.id);
      case "DEPARTMENT": {
        const dept = departments.find((d) => d.id === selectedDepartmentId);
        return employees.filter((emp) => dept && emp.departmentName === dept.name).map((emp) => emp.id);
      }
      case "MANUAL":
        return selectedEmployees.map((emp) => emp.id);
      default:
        return [];
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Documento
        return !!selectedDocumentId && !!form.getValues("name");
      case 1: // Destinatarios
        return getRecipientCount() > 0;
      case 2: // Doble firma
        if (!requireDoubleSignature) return true;
        if (!secondSignerRole) return false;
        if (secondSignerRole === "SPECIFIC_USER" && !selectedSecondSigner) return false;
        return true;
      case 3: // Expiración
        return !!form.getValues("expiresAt");
      case 4: // Resumen
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit = async () => {
    setIsSubmitting(true);

    try {
      const values = form.getValues();
      const recipientIds = getRecipientEmployeeIds();

      // 1. Crear el lote en estado DRAFT
      const createResult = await createSignatureBatch({
        name: values.name,
        description: values.description,
        documentId: values.documentId,
        recipientEmployeeIds: recipientIds,
        requireDoubleSignature: values.requireDoubleSignature,
        secondSignerRole: values.secondSignerRole,
        secondSignerUserId: values.secondSignerUserId,
        expiresAt: values.expiresAt,
        reminderDays: values.reminderDays,
      });

      if (!createResult.success || !createResult.data) {
        throw new Error(createResult.error ?? "Error al crear el lote");
      }

      // 2. Activar el lote (crear SignatureRequests)
      const activateResult = await activateBatchWithRecipients(createResult.data.id, recipientIds);

      if (!activateResult.success) {
        throw new Error(activateResult.error ?? "Error al activar el lote");
      }

      toast.success(`Lote creado: ${recipientIds.length} solicitud(es) de firma enviada(s)`);

      // Reset y cerrar
      setOpen(false);
      setCurrentStep(0);
      form.reset();
      setSelectedEmployees([]);
      setSelectedSecondSigner(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating batch:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear el lote de firmas");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReminderDayToggle = (day: number) => {
    const current = form.getValues("reminderDays");
    const newDays = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => b - a);
    form.setValue("reminderDays", newDays);
  };

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Layers className="mr-2 h-4 w-4" />
          Nuevo Lote de Firmas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Lote de Firmas Masivas</DialogTitle>
          <DialogDescription>
            Envía un documento para que múltiples empleados lo firmen. Paso {currentStep + 1} de {STEPS.length}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-between py-4">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={index} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      isActive && "border-primary bg-primary text-primary-foreground",
                      isCompleted && "border-primary bg-primary/10 text-primary",
                      !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <span className={cn("mt-2 text-xs", isActive ? "font-medium" : "text-muted-foreground")}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn("mx-2 h-0.5 flex-1", index < currentStep ? "bg-primary" : "bg-muted")} />
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        <Form {...form}>
          <form className="space-y-6 py-4">
            {/* Paso 1: Documento */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del lote *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Política de privacidad 2025" {...field} />
                      </FormControl>
                      <FormDescription>Nombre descriptivo para identificar este lote</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detalles adicionales sobre el lote..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento a firmar *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un documento existente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documents.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No hay documentos disponibles
                            </SelectItem>
                          ) : (
                            documents.map((doc) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecciona un documento previamente subido. Para subir uno nuevo, usa &quot;Nueva
                        Solicitud&quot;.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Paso 2: Destinatarios */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="recipientType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de destinatarios *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-y-0 space-x-3">
                            <RadioGroupItem value="ALL" id="all" />
                            <Label htmlFor="all" className="flex cursor-pointer items-center gap-2 font-normal">
                              <Building2 className="h-4 w-4" />
                              Toda la organización
                              <Badge variant="secondary">{allEmployeesCount} empleados</Badge>
                            </Label>
                          </div>
                          <div className="flex items-center space-y-0 space-x-3">
                            <RadioGroupItem value="DEPARTMENT" id="department" />
                            <Label htmlFor="department" className="flex cursor-pointer items-center gap-2 font-normal">
                              <Building2 className="h-4 w-4" />
                              Por departamento
                            </Label>
                          </div>
                          <div className="flex items-center space-y-0 space-x-3">
                            <RadioGroupItem value="MANUAL" id="manual" />
                            <Label htmlFor="manual" className="flex cursor-pointer items-center gap-2 font-normal">
                              <Users className="h-4 w-4" />
                              Selección manual
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selector de departamento */}
                {recipientType === "DEPARTMENT" && (
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un departamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Selector manual de empleados */}
                {recipientType === "MANUAL" && (
                  <div className="space-y-3">
                    <FormLabel>Empleados *</FormLabel>
                    <Popover open={openEmployeeCombobox} onOpenChange={setOpenEmployeeCombobox}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="text-muted-foreground">Buscar empleados...</span>
                          <Plus className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nombre o email..."
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
                                      <span className="font-medium">
                                        {employee.firstName} {employee.lastName}
                                      </span>
                                      <span className="text-muted-foreground text-xs">
                                        {employee.email}
                                        {employee.departmentName && ` · ${employee.departmentName}`}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Lista de empleados seleccionados */}
                    {selectedEmployees.length > 0 && (
                      <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-md border p-2">
                        {selectedEmployees.map((employee) => (
                          <div
                            key={employee.id}
                            className="bg-muted/50 flex items-center justify-between rounded-md p-2 text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {employee.firstName} {employee.lastName}
                              </span>
                              {employee.departmentName && (
                                <span className="text-muted-foreground ml-2 text-xs">({employee.departmentName})</span>
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

                {/* Contador de destinatarios */}
                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="text-primary h-5 w-5" />
                    <span className="font-medium">Se crearán {getRecipientCount()} solicitudes de firma</span>
                  </div>
                </div>
              </div>
            )}

            {/* Paso 3: Doble firma */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="double-sig">Requerir doble firma</Label>
                    <p className="text-muted-foreground text-sm">
                      Cada documento necesitará una segunda firma de validación
                    </p>
                  </div>
                  <Switch
                    id="double-sig"
                    checked={requireDoubleSignature}
                    onCheckedChange={(checked) => form.setValue("requireDoubleSignature", checked)}
                  />
                </div>

                {requireDoubleSignature && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <FormField
                      control={form.control}
                      name="secondSignerRole"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Segundo firmante *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-y-0 space-x-3">
                                <RadioGroupItem value="MANAGER" id="manager" />
                                <Label htmlFor="manager" className="cursor-pointer font-normal">
                                  Manager directo de cada empleado
                                </Label>
                              </div>
                              <div className="flex items-center space-y-0 space-x-3">
                                <RadioGroupItem value="HR" id="hr" />
                                <Label htmlFor="hr" className="cursor-pointer font-normal">
                                  Equipo de Recursos Humanos
                                </Label>
                              </div>
                              <div className="flex items-center space-y-0 space-x-3">
                                <RadioGroupItem value="SPECIFIC_USER" id="specific" />
                                <Label htmlFor="specific" className="cursor-pointer font-normal">
                                  Usuario específico
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {secondSignerRole === "SPECIFIC_USER" && (
                      <div className="space-y-2 pl-6">
                        <FormLabel>Seleccionar usuario *</FormLabel>
                        {selectedSecondSigner ? (
                          <div className="flex items-center justify-between rounded-md border p-3">
                            <div>
                              <span className="font-medium">
                                {selectedSecondSigner.firstName} {selectedSecondSigner.lastName}
                              </span>
                              <span className="text-muted-foreground ml-2 text-sm">{selectedSecondSigner.email}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSecondSigner(null);
                                form.setValue("secondSignerUserId", "");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between">
                                <span className="text-muted-foreground">Buscar usuario...</span>
                                <Users className="ml-2 h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Buscar por nombre o email..."
                                  value={userSearch}
                                  onValueChange={setUserSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {userSearch.length < 2 ? "Escribe al menos 2 caracteres" : "No se encontró"}
                                  </CommandEmpty>
                                  {userSearchResults.length > 0 && (
                                    <CommandGroup>
                                      {userSearchResults.map((user) => (
                                        <CommandItem
                                          key={user.id}
                                          value={user.id}
                                          onSelect={() => handleSelectSecondSigner(user)}
                                          className="cursor-pointer"
                                        >
                                          <div className="flex flex-col gap-0.5">
                                            <span className="font-medium">
                                              {user.firstName} {user.lastName}
                                            </span>
                                            <span className="text-muted-foreground text-xs">{user.email}</span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    )}

                    {secondSignerRole === "MANAGER" && (
                      <div className="bg-muted/50 rounded-md p-3 text-sm">
                        <p className="text-muted-foreground">
                          Si un empleado no tiene manager asignado, se marcará para corrección manual.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Paso 4: Expiración y recordatorios */}
            {currentStep === 3 && (
              <div className="space-y-6">
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
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
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
                            disabled={(date) => date <= new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Fecha máxima para completar todas las firmas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Recordatorios automáticos</FormLabel>
                  <FormDescription>
                    Se enviarán notificaciones a los firmantes pendientes estos días antes del vencimiento
                  </FormDescription>
                  <div className="flex flex-wrap gap-2">
                    {[14, 7, 5, 3, 1].map((day) => {
                      const isSelected = form.getValues("reminderDays").includes(day);
                      return (
                        <Button
                          key={day}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleReminderDayToggle(day)}
                        >
                          {day} {day === 1 ? "día" : "días"}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Paso 5: Resumen */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Resumen del lote</h3>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium">{form.getValues("name")}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Documento:</span>
                    <span className="font-medium">{selectedDocument?.title ?? "No seleccionado"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Destinatarios:</span>
                    <Badge>{getRecipientCount()} empleados</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Doble firma:</span>
                    <span className="font-medium">
                      {requireDoubleSignature
                        ? secondSignerRole === "MANAGER"
                          ? "Manager directo"
                          : secondSignerRole === "HR"
                            ? "Equipo HR"
                            : `Usuario: ${selectedSecondSigner?.firstName} ${selectedSecondSigner?.lastName}`
                        : "No"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha límite:</span>
                    <span className="font-medium">
                      {form.getValues("expiresAt").toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recordatorios:</span>
                    <span className="font-medium">{form.getValues("reminderDays").join(", ")} días antes</span>
                  </div>
                </div>

                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm">
                    Al confirmar, se crearán <strong>{getRecipientCount()} solicitudes de firma</strong> y se notificará
                    a cada empleado.
                  </p>
                </div>
              </div>
            )}
          </form>
        </Form>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 0 || isSubmitting}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext} disabled={!canProceed()}>
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit} disabled={isSubmitting || !canProceed()}>
              {isSubmitting ? "Creando..." : "Crear Lote de Firmas"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
