"use client";

import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
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
import { signableDocumentCategoryLabels } from "@/lib/validations/signature";
import { getAvailableEmployeesForBatch } from "@/server/actions/signature-batch";

const STEPS = [
  { title: "Documento", icon: FileText, description: "Sube el PDF" },
  { title: "Destinatarios", icon: Users, description: "Quién firma" },
  { title: "Configuración", icon: UserPlus, description: "Doble firma y fechas" },
  { title: "Resumen", icon: Check, description: "Confirma y crea" },
];

// Schema para el formulario completo
const createSignatureSchema = z
  .object({
    // Paso 1: Documento
    title: z.string().min(1, "Título requerido"),
    description: z.string().optional(),
    category: z.string().min(1, "Categoría requerida"),
    file: z.instanceof(File).refine((file) => file.size <= 20 * 1024 * 1024, "Max 20MB"),

    // Paso 2: Destinatarios
    recipientType: z.enum(["ALL", "DEPARTMENTS", "SPECIFIC"]),
    departmentIds: z.array(z.string()).optional(),
    employeeIds: z.array(z.string()).optional(),
    additionalSignerEmployeeIds: z.array(z.string()).default([]),

    // Paso 3: Configuración (Doble firma + Expiración)
    requireDoubleSignature: z.boolean().default(false),
    secondSignerRole: z.enum(["MANAGER", "HR", "SPECIFIC_USER"]).optional(),
    secondSignerUserId: z.string().optional(),
    expiresAt: z.date().min(new Date(), "Debe ser fecha futura"),
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
  departmentId?: string | null;
  userId?: string | null;
}

export function CreateSignatureDialog({ onSuccess }: CreateSignatureDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Estados de carga de datos
  const [departments, setDepartments] = useState<Department[]>([]);

  // Estados de búsqueda
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [openComboboxAdvanced, setOpenComboboxAdvanced] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<Employee[]>([]);
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [selectedAdditionalSigners, setSelectedAdditionalSigners] = useState<Employee[]>([]);
  const [additionalSearch, setAdditionalSearch] = useState("");
  const [additionalSearchResults, setAdditionalSearchResults] = useState<Employee[]>([]);
  const [isSearchingAdditional, setIsSearchingAdditional] = useState(false);
  const [openAdditionalCombobox, setOpenAdditionalCombobox] = useState(false);

  // Estados de selección local (para UI)
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedSecondSigner, setSelectedSecondSigner] = useState<Employee | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  const form = useForm<CreateSignatureFormValues>({
    resolver: zodResolver(createSignatureSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      recipientType: "SPECIFIC",
      departmentIds: [],
      employeeIds: [],
      additionalSignerEmployeeIds: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
      requireDoubleSignature: false,
      secondSignerUserId: "",
    },
  });

  const recipientType = form.watch("recipientType");
  const requireDoubleSignature = form.watch("requireDoubleSignature");
  const secondSignerRole = form.watch("secondSignerRole");
  const recipientSummaryLabel = useMemo(() => {
    switch (recipientType) {
      case "ALL":
        return "Toda la organización";
      case "DEPARTMENTS":
        if (selectedDepartments.length === 0) {
          return "Selecciona departamentos";
        }
        if (selectedDepartments.length === 1) {
          const dept = departments.find((department) => department.id === selectedDepartments[0]);
          return dept ? `Departamento: ${dept.name}` : "Departamento seleccionado";
        }
        return `${selectedDepartments.length} departamentos`;
      case "SPECIFIC":
        if (selectedEmployees.length === 0) {
          return "Selecciona empleados";
        }
        if (selectedEmployees.length <= 3) {
          return selectedEmployees.map((employee) => employee.fullName).join(", ");
        }
        return `Empleados seleccionados (${selectedEmployees.length})`;
      default:
        return "Destinatarios";
    }
  }, [recipientType, selectedDepartments, departments, selectedEmployees]);

  const recipientCount = getRecipientCount();

  const secondSignerDisplay = useMemo(() => {
    switch (secondSignerRole) {
      case "MANAGER":
        return "Manager directo";
      case "HR":
        return "Equipo HR";
      case "SPECIFIC_USER":
        return selectedSecondSigner ? selectedSecondSigner.fullName : "Usuario específico";
      default:
        return "Segundo firmante";
    }
  }, [secondSignerRole, selectedSecondSigner]);

  const flowSteps = useMemo(() => {
    const steps: FlowStep[] = [
      {
        label: recipientSummaryLabel,
        description: recipientCount === 1 ? "1 destinatario" : `${recipientCount} destinatarios`,
      },
    ];

    if (requireDoubleSignature && secondSignerRole) {
      steps.push({
        label: secondSignerDisplay,
        description: "Validador automático",
      });
    }

    if (selectedAdditionalSigners.length > 0) {
      selectedAdditionalSigners.forEach((signer, index) => {
        steps.push({
          label: signer.fullName,
          description: `Firmante adicional #${index + 1}`,
        });
      });
    }

    return steps;
  }, [
    recipientSummaryLabel,
    recipientCount,
    requireDoubleSignature,
    secondSignerRole,
    secondSignerDisplay,
    selectedAdditionalSigners,
  ]);

  // Resetear estados al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      form.reset();
      setSelectedFile(null);
      setSelectedEmployees([]);
      setSelectedDepartments([]);
      setSelectedSecondSigner(null);
      setAllEmployees([]);
      setSelectedAdditionalSigners([]);
      setAdditionalSearch("");
      setAdditionalSearchResults([]);
      setOpenAdditionalCombobox(false);
    } else {
      loadDepartments();
      loadAllEmployees();
    }
  }, [open, form]);

  const loadDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
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
        const adapted = withUser.map((e) => ({
          id: e.id,
          fullName: `${e.firstName} ${e.lastName}`,
          employeeNumber: null,
          email: e.email,
          position: null,
          department: e.departmentName,
          departmentId: e.departmentId, // Asegurar que esto venga del server action
          userId: e.userId,
        }));
        setAllEmployees(adapted);
      }
    } catch (error) {
      console.error("Error loading all employees:", error);
    }
  };

  // Buscar empleados
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
      } finally {
        setIsSearching(false);
      }
    };
    const debounceTimer = setTimeout(searchEmployees, 300);
    return () => clearTimeout(debounceTimer);
  }, [employeeSearch]);

  // Buscar usuarios (segundo firmante)
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
          const adapted = withUser.map((e) => ({
            id: e.id,
            fullName: `${e.firstName} ${e.lastName}`,
            employeeNumber: null,
            email: e.email,
            position: null,
            department: e.departmentName,
            userId: e.userId,
          }));
          setUserSearchResults(adapted);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      }
    };
    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [userSearch]);

  // Buscar firmantes adicionales
  useEffect(() => {
    const searchAdditionalSigners = async () => {
      if (additionalSearch.length < 2) {
        setAdditionalSearchResults([]);
        return;
      }

      setIsSearchingAdditional(true);
      try {
        const result = await getAvailableEmployeesForBatch({ search: additionalSearch });
        if (result.success && result.data) {
          const adapted = result.data
            .filter(
              (emp) =>
                emp.hasUser &&
                Boolean(emp.userId) &&
                !selectedAdditionalSigners.some((selected) => selected.id === emp.id),
            )
            .map((emp) => ({
              id: emp.id,
              fullName: `${emp.firstName} ${emp.lastName}`,
              employeeNumber: null,
              email: emp.email,
              position: null,
              department: emp.departmentName,
              departmentId: emp.departmentId,
              userId: emp.userId ?? undefined,
            }));
          setAdditionalSearchResults(adapted);
        }
      } catch (error) {
        console.error("Error searching additional signers:", error);
      } finally {
        setIsSearchingAdditional(false);
      }
    };

    const debounceTimer = setTimeout(searchAdditionalSigners, 300);
    return () => clearTimeout(debounceTimer);
  }, [additionalSearch, selectedAdditionalSigners]);

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

  const handleAddAdditionalSigner = (employee: Employee) => {
    if (selectedAdditionalSigners.find((e) => e.id === employee.id)) {
      return;
    }

    const updated = [...selectedAdditionalSigners, employee];
    setSelectedAdditionalSigners(updated);
    form.setValue(
      "additionalSignerEmployeeIds",
      updated.map((signer) => signer.id),
    );
    setAdditionalSearch("");
    setOpenAdditionalCombobox(false);
  };

  const handleRemoveAdditionalSigner = (employeeId: string) => {
    const updated = selectedAdditionalSigners.filter((signer) => signer.id !== employeeId);
    setSelectedAdditionalSigners(updated);
    form.setValue(
      "additionalSignerEmployeeIds",
      updated.map((signer) => signer.id),
    );
  };

  const handleToggleDepartment = (deptId: string) => {
    const newDepartments = selectedDepartments.includes(deptId)
      ? selectedDepartments.filter((id) => id !== deptId)
      : [...selectedDepartments, deptId];
    setSelectedDepartments(newDepartments);
    form.setValue("departmentIds", newDepartments);
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

  function getRecipientCount(): number {
    switch (recipientType) {
      case "ALL":
        return allEmployees.length;
      case "DEPARTMENTS":
        return allEmployees.filter(
          (employee) => employee.departmentId && selectedDepartments.includes(employee.departmentId),
        ).length;
      case "SPECIFIC":
        return selectedEmployees.length;
      default:
        return 0;
    }
  }

  const canProceed = async (): Promise<boolean> => {
    let isValid = false;
    switch (currentStep) {
      case 0: // Documento
        isValid = await form.trigger(["title", "category", "file"]);
        return isValid;
      case 1: // Destinatarios
        isValid = await form.trigger(["recipientType", "departmentIds", "employeeIds"]);
        return isValid;
      case 2: // Configuración
        isValid = await form.trigger(["requireDoubleSignature", "secondSignerRole", "secondSignerUserId", "expiresAt"]);
        return isValid;
      case 3: // Resumen
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1 && (await canProceed())) {
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

      // Doble firma
      requestData.append("requireDoubleSignature", values.requireDoubleSignature.toString());
      if (values.secondSignerRole) {
        requestData.append("secondSignerRole", values.secondSignerRole);
      }
      if (values.secondSignerUserId) {
        requestData.append("secondSignerUserId", values.secondSignerUserId);
      }

      if (values.recipientType === "DEPARTMENTS" && values.departmentIds) {
        requestData.append("departmentIds", JSON.stringify(values.departmentIds));
      } else if (values.recipientType === "SPECIFIC" && values.employeeIds) {
        requestData.append("employeeIds", JSON.stringify(values.employeeIds));
      }

      if (values.additionalSignerEmployeeIds?.length) {
        requestData.append("additionalSignerEmployeeIds", JSON.stringify(values.additionalSignerEmployeeIds));
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
      const totalRequests = request?.count ?? request?.signerCount ?? 1;
      toast.success(`Solicitud creada: ${totalRequests} destinatario(s) notificado(s)`);

      setOpen(false);
      if (onSuccess) onSuccess();
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
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Firma</DialogTitle>
          <DialogDescription>
            Configura y envía un documento para firma. Paso {currentStep + 1} de {STEPS.length}
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
          <div className="py-4">
            {/* Paso 1: Documento */}
            {currentStep === 0 && (
              <div className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detalles adicionales..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          onValueChange={(val: "ALL" | "DEPARTMENTS" | "SPECIFIC") => {
                            field.onChange(val);
                            // Limpiar búsquedas al cambiar
                            setEmployeeSearch("");
                            setOpenCombobox(false);
                            setOpenComboboxAdvanced(false);
                          }}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selección condicional */}
                {recipientType === "SPECIFIC" && (
                  <div className="space-y-2 pl-6">
                    <FormLabel className="text-sm">Buscar empleados</FormLabel>
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
                            placeholder="Buscar..."
                            value={employeeSearch}
                            onValueChange={setEmployeeSearch}
                          />
                          <CommandList>
                            <CommandEmpty>{isSearching ? "Buscando..." : "No se encontraron empleados"}</CommandEmpty>
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
                                      <span className="font-medium">{employee.fullName}</span>
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
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{index + 1}:</span>
                              <span>{employee.fullName}</span>
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

                {recipientType === "DEPARTMENTS" && (
                  <div className="space-y-2 pl-6">
                    <FormLabel className="text-sm">Seleccionar departamentos</FormLabel>
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
                  </div>
                )}

                {recipientType === "ALL" && (
                  <div className="bg-primary/10 rounded-md p-3 pl-6">
                    <p className="text-primary text-sm">
                      Se enviará a <strong>todos los empleados activos</strong>.
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <FormLabel>Firmantes adicionales</FormLabel>
                      <FormDescription>Se añadirán después de cada destinatario seleccionado.</FormDescription>
                    </div>
                    <Popover open={openAdditionalCombobox} onOpenChange={setOpenAdditionalCombobox}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="gap-2">
                          <UserPlus className="h-4 w-4" />
                          Añadir firmante
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nombre o email..."
                            value={additionalSearch}
                            onValueChange={setAdditionalSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {isSearchingAdditional
                                ? "Buscando..."
                                : additionalSearch.length < 2
                                  ? "Escribe al menos 2 caracteres"
                                  : "No se encontró ningún empleado"}
                            </CommandEmpty>
                            {additionalSearchResults.length > 0 && (
                              <CommandGroup>
                                {additionalSearchResults.map((employee) => (
                                  <CommandItem
                                    key={employee.id}
                                    value={employee.id}
                                    onSelect={() => handleAddAdditionalSigner(employee)}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-medium">{employee.fullName}</span>
                                      <span className="text-muted-foreground text-xs">
                                        {employee.email}
                                        {employee.department && ` · ${employee.department}`}
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
                  </div>

                  {selectedAdditionalSigners.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No has añadido firmantes adicionales. Solo firmará cada destinatario.
                    </p>
                  ) : (
                    <div className="max-h-[220px] space-y-2 overflow-y-auto rounded-md border p-2">
                      {selectedAdditionalSigners.map((signer, index) => (
                        <div
                          key={signer.id}
                          className="bg-muted/50 flex items-center justify-between rounded-md p-2 text-sm"
                        >
                          <div>
                            <span className="font-medium">
                              {index + 1}. {signer.fullName}
                            </span>
                            {signer.department && (
                              <span className="text-muted-foreground ml-2 text-xs">({signer.department})</span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdditionalSigner(signer.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <SigningFlowPreview steps={flowSteps} />
              </div>
            )}

            {/* Paso 3: Configuración */}
            {currentStep === 2 && (
              <div className="space-y-6">
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

                <Separator />

                {/* Doble Firma */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Doble firma</FormLabel>
                      <FormDescription>Requerir una segunda firma de validación</FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="requireDoubleSignature"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
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
                                    Manager directo
                                  </Label>
                                </div>
                                <div className="flex items-center space-y-0 space-x-3">
                                  <RadioGroupItem value="HR" id="hr" />
                                  <Label htmlFor="hr" className="cursor-pointer font-normal">
                                    Equipo de Recursos Humanos
                                  </Label>
                                </div>
                                <div className="flex items-center space-y-0 space-x-3">
                                  <RadioGroupItem value="SPECIFIC_USER" id="specific_user" />
                                  <Label htmlFor="specific_user" className="cursor-pointer font-normal">
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
                        <div className="pl-6">
                          <FormLabel className="mb-2 block text-sm">Buscar usuario</FormLabel>
                          {selectedSecondSigner ? (
                            <div className="flex items-center justify-between rounded-md border p-3">
                              <div>
                                <span className="font-medium">{selectedSecondSigner.fullName}</span>
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
                                    placeholder="Buscar..."
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
                                              <span className="font-medium">{user.fullName}</span>
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paso 4: Resumen */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Resumen de la solicitud</h3>
                <div className="space-y-3 rounded-lg border p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documento:</span>
                    <span className="font-medium">{form.getValues("title")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categoría:</span>
                    <span className="font-medium">
                      {signableDocumentCategoryLabels[
                        form.getValues("category") as keyof typeof signableDocumentCategoryLabels
                      ] || form.getValues("category")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Archivo:</span>
                    <span className="font-medium">{selectedFile?.name}</span>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Destinatarios:</span>
                      <Badge variant="secondary" className="text-right whitespace-normal">
                        {recipientSummaryLabel}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-right text-xs">{recipientCount} empleado(s)</span>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Firmantes adicionales:</span>
                    {selectedAdditionalSigners.length === 0 ? (
                      <p className="font-medium">Ninguno</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedAdditionalSigners.map((signer) => (
                          <Badge key={signer.id} variant="outline">
                            {signer.fullName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Doble firma:</span>
                    <span className="font-medium">{requireDoubleSignature ? secondSignerDisplay : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vence:</span>
                    <span className="font-medium">{form.getValues("expiresAt")?.toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-primary text-sm">
                    Al confirmar, se subir el documento y se notificar a los firmantes.
                  </p>
                </div>

                <SigningFlowPreview steps={flowSteps} />
              </div>
            )}
          </div>
        </Form>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 0 || isSubmitting}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Solicitud"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FlowStep {
  label: string;
  description?: string;
}

function SigningFlowPreview({ steps }: { steps: FlowStep[] }) {
  if (!steps.length) {
    return null;
  }

  return (
    <div className="bg-muted/30 rounded-lg border p-4">
      <p className="text-muted-foreground mb-3 text-sm font-medium">Orden de firma</p>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={`${step.label}-${index}`} className="flex items-start gap-3">
            <div className="text-foreground flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold">
              {index + 1}
            </div>
            <div>
              <p className="font-semibold">{step.label}</p>
              {step.description && <p className="text-muted-foreground text-sm">{step.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
