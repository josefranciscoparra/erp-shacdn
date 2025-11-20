"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  User,
  CreditCard,
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations/employee";
import { getTeams, type TeamListItem } from "@/server/actions/teams";

interface WizardStep1EmployeeProps {
  onSubmit: (data: CreateEmployeeInput) => Promise<void>;
  isLoading?: boolean;
  onTriggerSubmit?: (submitFn: () => void) => void;
  initialData?: CreateEmployeeInput;
}

export function WizardStep1Employee({
  onSubmit,
  isLoading = false,
  onTriggerSubmit,
  initialData,
}: WizardStep1EmployeeProps) {
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    mode: "onChange",
    defaultValues: initialData ?? {
      firstName: "",
      lastName: "",
      secondLastName: "",
      nifNie: "",
      email: "",
      phone: "",
      mobilePhone: "",
      address: "",
      city: "",
      postalCode: "",
      province: "",
      birthDate: "",
      nationality: "",
      employeeNumber: "",
      iban: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyRelationship: "",
      notes: "",
      teamId: "",
    },
  });

  // Cargar equipos al montar el componente
  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    setIsTeamsLoading(true);
    try {
      const { success, teams: data } = await getTeams();
      if (success && data) {
        setTeams(data);
      }
    } finally {
      setIsTeamsLoading(false);
    }
  }

  // Auto-focus en el primer campo
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = document.querySelector('input[name="firstName"]') as HTMLInputElement;
      firstInput?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Exponer función de submit al padre
  useEffect(() => {
    if (onTriggerSubmit) {
      onTriggerSubmit(() => {
        form.handleSubmit(handleSubmit, (errors) => {
          const errorMessages = Object.values(errors).map((error) => error.message);

          toast.error("Revisa los siguientes campos", {
            description: (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                {errorMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            ),
            duration: 6000,
          });
        })();
      });
    }
  }, [onTriggerSubmit, form]);

  const handleSubmit = async (data: CreateEmployeeInput) => {
    await onSubmit(data);
  };

  // Helper para estilos de validación
  const getInputClasses = (fieldState: any) => {
    return cn(
      "transition-colors",
      fieldState.error && "border-red-500 focus-visible:ring-red-500",
      !fieldState.error && fieldState.isDirty && fieldState.invalid === false && "border-emerald-500",
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
        {/* Campos Esenciales */}
        <Card className="rounded-lg border shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="text-primary h-5 w-5" />
              <CardTitle>Información Básica</CardTitle>
            </div>
            <CardDescription>Datos personales del empleado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nombre y apellidos */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                        <Input
                          {...field}
                          placeholder="Juan"
                          className={cn("pl-9", getInputClasses(fieldState))}
                          autoComplete="given-name"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Primer apellido *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="García"
                        className={getInputClasses(fieldState)}
                        autoComplete="family-name"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="secondLastName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Segundo apellido</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="López"
                        className={getInputClasses(fieldState)}
                        autoComplete="family-name"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nifNie"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>NIF/NIE *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CreditCard className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                        <Input
                          {...field}
                          placeholder="12345678Z"
                          className={cn("pl-9", getInputClasses(fieldState))}
                          autoComplete="off"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Email y teléfonos */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="juan.garcia@empresa.com"
                          className={cn("pl-9", getInputClasses(fieldState))}
                          autoComplete="email"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                        <Input
                          {...field}
                          placeholder="+34 600 000 000"
                          className={cn("pl-9", getInputClasses(fieldState))}
                          autoComplete="tel"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="mobilePhone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Móvil</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                        <Input
                          {...field}
                          placeholder="+34 600 000 000"
                          className={cn("pl-9", getInputClasses(fieldState))}
                          autoComplete="tel"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Fecha de nacimiento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarIcon className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                        <Input
                          {...field}
                          type="date"
                          className={cn("pl-9", getInputClasses(fieldState))}
                          autoComplete="bday"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botón para mostrar más campos */}
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={() => setShowMoreFields(!showMoreFields)} className="gap-2">
            {showMoreFields ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar campos opcionales
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Mostrar más campos (opcionales)
              </>
            )}
          </Button>
        </div>

        {/* Campos Opcionales (colapsables) */}
        {showMoreFields && (
          <div className="animate-in slide-in-from-top-4 space-y-6">
            {/* Nacionalidad */}
            <Card className="rounded-lg border shadow-xs">
              <CardHeader>
                <CardTitle>Información Adicional</CardTitle>
                <CardDescription>Datos complementarios del empleado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Nacionalidad</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Española" className={getInputClasses(fieldState)} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Selector de Equipo */}
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
                              {field.value ? teams.find((team) => team.id === field.value)?.name : "Seleccionar equipo"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar equipo..." />
                            <CommandList>
                              <CommandEmpty>
                                {isTeamsLoading ? "Cargando equipos..." : "No se encontraron equipos"}
                              </CommandEmpty>
                              <CommandGroup>
                                {/* Opción para limpiar selección */}
                                {field.value && (
                                  <CommandItem
                                    value="__clear__"
                                    onSelect={() => {
                                      form.setValue("teamId", "");
                                      setComboboxOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
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
                                    <div className="flex items-center gap-2">
                                      <Users className="text-muted-foreground h-4 w-4" />
                                      <div className="flex flex-col">
                                        <span>{team.name}</span>
                                        {team.code && (
                                          <span className="text-muted-foreground text-xs">{team.code}</span>
                                        )}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Asigna el empleado a un equipo de trabajo</FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Dirección */}
            <Card className="rounded-lg border shadow-xs">
              <CardHeader>
                <CardTitle>Dirección</CardTitle>
                <CardDescription>Domicilio del empleado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Calle, número, piso..."
                          className={getInputClasses(fieldState)}
                          autoComplete="street-address"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Madrid"
                            className={getInputClasses(fieldState)}
                            autoComplete="address-level2"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Código postal</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="28001"
                            className={getInputClasses(fieldState)}
                            autoComplete="postal-code"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Provincia</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Madrid"
                            className={getInputClasses(fieldState)}
                            autoComplete="address-level1"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* IBAN */}
            <Card className="rounded-lg border shadow-xs">
              <CardHeader>
                <CardTitle>Datos Bancarios</CardTitle>
                <CardDescription>Información bancaria para nóminas</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="ES00 0000 0000 0000 0000 0000"
                          className={getInputClasses(fieldState)}
                          autoComplete="off"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contacto de emergencia */}
            <Card className="rounded-lg border shadow-xs">
              <CardHeader>
                <CardTitle>Contacto de Emergencia</CardTitle>
                <CardDescription>Persona a contactar en caso de emergencia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Nombre del contacto"
                            className={getInputClasses(fieldState)}
                            autoComplete="off"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="+34 600 000 000"
                            className={getInputClasses(fieldState)}
                            autoComplete="tel"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="emergencyRelationship"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Relación</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Familiar, amigo, etc."
                          className={getInputClasses(fieldState)}
                          autoComplete="off"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Notas */}
            <Card className="rounded-lg border shadow-xs">
              <CardHeader>
                <CardTitle>Notas Adicionales</CardTitle>
                <CardDescription>Información adicional sobre el empleado</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Información adicional, observaciones, etc."
                          rows={4}
                          className={getInputClasses(fieldState)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </form>
    </Form>
  );
}
