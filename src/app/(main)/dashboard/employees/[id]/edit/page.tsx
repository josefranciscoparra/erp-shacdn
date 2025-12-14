"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Save,
  User,
  Briefcase,
  Phone,
  AlertCircle,
  Shield,
  Loader2,
  Check,
  ChevronsUpDown,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmployeeStatusSelect, type EmploymentStatus } from "@/components/employees/employee-status-select";
import { TemporaryPasswordManager } from "@/components/employees/temporary-password-manager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getTeams, type TeamListItem } from "@/server/actions/teams";

const editEmployeeSchema = z.object({
  // Datos personales
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  secondLastName: z.string().optional(),
  nifNie: z.string().min(9, "NIF/NIE debe tener al menos 9 caracteres"),
  birthDate: z.string().optional(),
  nationality: z.string().optional(),

  // Información laboral
  employeeNumber: z.string().optional(),
  employmentStatus: z.enum([
    "PENDING_CONTRACT",
    "ACTIVE",
    "ON_LEAVE",
    "VACATION",
    "SUSPENDED",
    "TERMINATED",
    "RETIRED",
  ]),
  teamId: z.string().optional(),

  // Contacto
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),

  // Dirección
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  province: z.string().optional(),
  country: z.string().default("ES"),

  // Contacto de emergencia
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyRelationship: z.string().optional(),

  // Datos bancarios
  iban: z.string().optional(),

  // Usuario del sistema
  createUser: z.boolean().default(false),
  userRole: z.enum(["EMPLOYEE", "MANAGER", "HR_ADMIN"]).default("EMPLOYEE"),

  // Notas
  notes: z.string().optional(),
});

type EditEmployeeForm = z.infer<typeof editEmployeeSchema>;

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  nifNie: string;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  country: string;
  birthDate: string | null;
  nationality: string | null;
  employmentStatus: EmploymentStatus;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyRelationship: string | null;
  iban: string | null;
  notes: string | null;
  active: boolean;
  teamId: string | null;
  user: {
    id: string;
    email: string;
    role: string;
    active: boolean;
    temporaryPasswords?: Array<{
      id: string;
      password: string;
      createdAt: string;
      expiresAt: string;
      reason: string | null;
      usedAt: string | null;
      active: boolean;
      invalidatedAt: string | null;
      invalidatedReason: string | null;
      notes: string | null;
      createdBy: {
        name: string;
      };
    }>;
  } | null;
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const form = useForm<EditEmployeeForm>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      secondLastName: "",
      nifNie: "",
      birthDate: "",
      nationality: "",
      employeeNumber: "",
      employmentStatus: "PENDING_CONTRACT",
      email: "",
      phone: "",
      mobilePhone: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
      country: "ES",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyRelationship: "",
      iban: "",
      teamId: "",
      createUser: false,
      userRole: "EMPLOYEE",
      notes: "",
    },
  });

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${params.id}`);
      if (!response.ok) {
        throw new Error("Empleado no encontrado");
      }
      const data = await response.json();
      setEmployee(data);

      // Llenar el formulario con los datos del empleado
      form.reset({
        firstName: data.firstName,
        lastName: data.lastName,
        secondLastName: data.secondLastName ?? "",
        nifNie: data.nifNie,
        birthDate: data.birthDate ? data.birthDate.split("T")[0] : "",
        nationality: data.nationality ?? "",
        employeeNumber: data.employeeNumber ?? "",
        employmentStatus: data.employmentStatus,
        email: data.email ?? "",
        phone: data.phone ?? "",
        mobilePhone: data.mobilePhone ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        postalCode: data.postalCode ?? "",
        province: data.province ?? "",
        country: data.country ?? "ES",
        emergencyContactName: data.emergencyContactName ?? "",
        emergencyContactPhone: data.emergencyContactPhone ?? "",
        emergencyRelationship: data.emergencyRelationship ?? "",
        iban: data.iban ?? "",
        teamId: data.teamId ?? "",
        createUser: false,
        userRole: data.user?.role ?? "EMPLOYEE",
        notes: data.notes ?? "",
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async () => {
    setIsTeamsLoading(true);
    try {
      const { success, teams: data } = await getTeams();
      if (success && data) {
        setTeams(data);
      }
    } finally {
      setIsTeamsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchEmployee();
      loadTeams();
    }
  }, [params.id]);

  const onSubmit = async (data: EditEmployeeForm) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/employees/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? errorData.message ?? "Error al actualizar empleado");
      }

      // Redirigir al perfil del empleado
      router.push(`/dashboard/employees/${params.id}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cargando empleado...</h1>
            <p className="text-muted-foreground text-sm">Obteniendo datos del empleado</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando datos del empleado...</span>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Error</h1>
            <p className="text-muted-foreground text-sm">No se pudo cargar el empleado</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error ?? "No se pudo cargar la información del empleado"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Editar empleado</h1>
            <p className="text-muted-foreground text-sm">{fullName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:gap-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Personal</span>
              </TabsTrigger>
              <TabsTrigger value="laboral" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Laboral</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Contacto</span>
              </TabsTrigger>
              <TabsTrigger value="emergency" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Emergencia</span>
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Acceso</span>
              </TabsTrigger>
            </TabsList>

            {/* Datos Personales */}
            <TabsContent value="personal">
              <div className="grid gap-6 @4xl/main:grid-cols-2">
                <Card className="bg-card rounded-lg border">
                  <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>Datos básicos del empleado</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nombre"
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
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primer apellido *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Primer apellido"
                                className="placeholder:text-muted-foreground/50 bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="secondLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segundo apellido</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Segundo apellido (opcional)"
                              className="placeholder:text-muted-foreground/50 bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="nifNie"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NIF/NIE *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="12345678A"
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
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de nacimiento</FormLabel>
                            <FormControl>
                              <Input type="date" className="bg-white" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nacionalidad</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Española"
                              className="placeholder:text-muted-foreground/50 bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-card rounded-lg border">
                  <CardHeader>
                    <CardTitle>Dirección</CardTitle>
                    <CardDescription>Domicilio del empleado</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Calle, número, piso..."
                              className="placeholder:text-muted-foreground/50 bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Madrid"
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
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código postal</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="28001"
                                className="placeholder:text-muted-foreground/50 bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provincia</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Madrid"
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
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>País</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Selecciona un país" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ES">España</SelectItem>
                                  <SelectItem value="FR">Francia</SelectItem>
                                  <SelectItem value="IT">Italia</SelectItem>
                                  <SelectItem value="PT">Portugal</SelectItem>
                                  <SelectItem value="DE">Alemania</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Información Laboral */}
            <TabsContent value="laboral">
              <Card className="bg-card rounded-lg border">
                <CardHeader>
                  <CardTitle>Información Laboral</CardTitle>
                  <CardDescription>Estado y datos laborales del empleado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="employmentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado del empleado *</FormLabel>
                          <FormControl>
                            <EmployeeStatusSelect value={field.value} onValueChange={field.onChange} />
                          </FormControl>
                          <FormDescription>Estado actual de la situación laboral</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employeeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de empleado</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="EMP001"
                              className="placeholder:text-muted-foreground/50 bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Identificador único en la empresa</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Equipo (opcional)</FormLabel>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              >
                                {field.value
                                  ? teams.find((team) => team.id === field.value)?.name
                                  : "Seleccionar equipo"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar equipo..." />
                              <CommandList>
                                <CommandEmpty>
                                  {isTeamsLoading ? "Cargando..." : "No se encontraron equipos"}
                                </CommandEmpty>
                                <CommandGroup>
                                  {field.value && (
                                    <CommandItem
                                      onSelect={() => {
                                        form.setValue("teamId", "");
                                        setComboboxOpen(false);
                                      }}
                                    >
                                      <span className="text-muted-foreground italic">Sin equipo</span>
                                    </CommandItem>
                                  )}
                                  {teams.map((team) => (
                                    <CommandItem
                                      value={team.name}
                                      key={team.id}
                                      onSelect={() => {
                                        form.setValue("teamId", team.id);
                                        setComboboxOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          team.id === field.value ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      <Users className="mr-2 h-4 w-4 opacity-50" />
                                      <div className="flex flex-col">
                                        <span>{team.name}</span>
                                        {team.code && (
                                          <span className="text-muted-foreground text-xs">{team.code}</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Asigna el empleado a un equipo de trabajo</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ES00 0000 0000 0000 0000 0000"
                            className="placeholder:text-muted-foreground/50 bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Cuenta bancaria para nóminas (se almacena cifrada)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas internas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Información adicional, observaciones..."
                            className="placeholder:text-muted-foreground/50 min-h-[100px] bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Notas internas sobre el empleado (no visibles para él)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contacto */}
            <TabsContent value="contact">
              <Card className="bg-card rounded-lg border">
                <CardHeader>
                  <CardTitle>Información de contacto</CardTitle>
                  <CardDescription>Teléfonos y email del empleado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="empleado@empresa.com"
                            className="placeholder:text-muted-foreground/50 bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono fijo</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+34 912 345 678"
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
                      name="mobilePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono móvil</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+34 600 123 456"
                              className="placeholder:text-muted-foreground/50 bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contacto de Emergencia */}
            <TabsContent value="emergency">
              <Card className="bg-card rounded-lg border">
                <CardHeader>
                  <CardTitle>Contacto de emergencia</CardTitle>
                  <CardDescription>Persona a contactar en caso de emergencia</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="María García López"
                            className="placeholder:text-muted-foreground/50 bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+34 600 123 456"
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
                      name="emergencyRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relación</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecciona relación" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SPOUSE">Cónyuge</SelectItem>
                                <SelectItem value="PARENT">Padre/Madre</SelectItem>
                                <SelectItem value="CHILD">Hijo/a</SelectItem>
                                <SelectItem value="SIBLING">Hermano/a</SelectItem>
                                <SelectItem value="FRIEND">Amigo/a</SelectItem>
                                <SelectItem value="OTHER">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Acceso al Sistema */}
            <TabsContent value="access">
              <Card className="bg-card rounded-lg border">
                <CardHeader>
                  <CardTitle>Acceso al sistema</CardTitle>
                  <CardDescription>Configuración de acceso y permisos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {employee.user ? (
                    <div className="space-y-4">
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>Este empleado ya tiene un usuario del sistema creado.</AlertDescription>
                      </Alert>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Email de usuario</label>
                          <div className="bg-muted rounded-md p-2 font-mono text-sm">{employee.user.email}</div>
                        </div>
                        <FormField
                          control={form.control}
                          name="userRole"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rol del usuario</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecciona un rol" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="EMPLOYEE">
                                    <div className="flex flex-col">
                                      <span>Empleado</span>
                                      <span className="text-muted-foreground text-xs">Acceso básico al sistema</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="MANAGER">
                                    <div className="flex flex-col">
                                      <span>Manager</span>
                                      <span className="text-muted-foreground text-xs">Gestión de equipo</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="HR_ADMIN">
                                    <div className="flex flex-col">
                                      <span>Admin RRHH</span>
                                      <span className="text-muted-foreground text-xs">
                                        Gestión completa de empleados
                                      </span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="createUser"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Crear usuario del sistema</FormLabel>
                              <FormDescription>Permitir al empleado acceder al sistema con su email</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch("createUser") && (
                        <FormField
                          control={form.control}
                          name="userRole"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rol del usuario</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecciona un rol" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="EMPLOYEE">
                                    <div className="flex flex-col">
                                      <span>Empleado</span>
                                      <span className="text-muted-foreground text-xs">Acceso básico al sistema</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="MANAGER">
                                    <div className="flex flex-col">
                                      <span>Manager</span>
                                      <span className="text-muted-foreground text-xs">Gestión de equipo</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="HR_ADMIN">
                                    <div className="flex flex-col">
                                      <span>Admin RRHH</span>
                                      <span className="text-muted-foreground text-xs">
                                        Gestión completa de empleados
                                      </span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>El empleado recibirá una contraseña temporal por email</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gestión de contraseñas temporales - solo si el usuario existe */}
              {employee.user && (
                <TemporaryPasswordManager
                  userId={employee.user.id}
                  temporaryPasswords={employee.user.temporaryPasswords ?? []}
                  onPasswordReset={fetchEmployee}
                />
              )}
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
