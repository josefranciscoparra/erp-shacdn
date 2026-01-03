"use client";

import { useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Mail, Phone, User, CreditCard, Calendar as CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations/employee";

type FieldStatus = "idle" | "checking" | "valid" | "invalid";
type CriticalField = "email" | "nifNie";
type ValidationResult = {
  hasIssues: boolean;
  hadServerError: boolean;
};

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
  const [fieldStatus, setFieldStatus] = useState<{ email: FieldStatus; nifNie: FieldStatus }>({
    email: "idle",
    nifNie: "idle",
  });

  const lastCheckedRef = useRef<{ email?: string; nifNie?: string }>({});
  const lastValueRef = useRef<{ email: string; nifNie: string }>({ email: "", nifNie: "" });
  const requestIdRef = useRef(0);
  const latestRequestRef = useRef<{ email: number; nifNie: number }>({ email: 0, nifNie: 0 });

  // Ref para hacer scroll a los campos adicionales
  const moreFieldsRef = useRef<HTMLDivElement>(null);

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
    },
  });

  const emailValue = form.watch("email");
  const nifNieValue = form.watch("nifNie");

  useEffect(() => {
    const trimmedEmail = emailValue.trim();
    if (trimmedEmail !== lastValueRef.current.email) {
      lastValueRef.current.email = trimmedEmail;
      latestRequestRef.current.email = 0;
      if (trimmedEmail === "") {
        lastCheckedRef.current.email = undefined;
      }
      setFieldStatus((prev) => (prev.email === "idle" ? prev : { ...prev, email: "idle" }));
      const currentError = form.getFieldState("email").error;
      if (currentError?.type === "validate") {
        form.clearErrors("email");
      }
    }
  }, [emailValue, form]);

  useEffect(() => {
    const trimmedNif = nifNieValue.trim();
    if (trimmedNif !== lastValueRef.current.nifNie) {
      lastValueRef.current.nifNie = trimmedNif;
      latestRequestRef.current.nifNie = 0;
      if (trimmedNif === "") {
        lastCheckedRef.current.nifNie = undefined;
      }
      setFieldStatus((prev) => (prev.nifNie === "idle" ? prev : { ...prev, nifNie: "idle" }));
      const currentError = form.getFieldState("nifNie").error;
      if (currentError?.type === "validate") {
        form.clearErrors("nifNie");
      }
    }
  }, [nifNieValue, form]);

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

  // Scroll suave a campos adicionales cuando se muestran
  useEffect(() => {
    if (showMoreFields && moreFieldsRef.current) {
      // Pequeño delay para que el contenido se renderice primero
      setTimeout(() => {
        moreFieldsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [showMoreFields]);

  const validateCriticalFields = async (
    fields: CriticalField[],
    options?: { force?: boolean },
  ): Promise<ValidationResult> => {
    const force = options ? options.force === true : false;
    const values = form.getValues();
    const requestPayload: { email?: string; nifNie?: string } = {};
    const fieldsToCheck: CriticalField[] = [];

    if (fields.includes("email")) {
      const trimmedEmail = values.email.trim();
      if (trimmedEmail !== "" && (force || trimmedEmail !== lastCheckedRef.current.email)) {
        requestPayload.email = trimmedEmail;
        fieldsToCheck.push("email");
      }
    }

    if (fields.includes("nifNie")) {
      const trimmedNif = values.nifNie.trim();
      if (trimmedNif !== "" && (force || trimmedNif !== lastCheckedRef.current.nifNie)) {
        requestPayload.nifNie = trimmedNif;
        fieldsToCheck.push("nifNie");
      }
    }

    if (fieldsToCheck.length === 0) {
      return { hasIssues: false, hadServerError: false };
    }

    setFieldStatus((prev) => {
      const next = { ...prev };
      fieldsToCheck.forEach((field) => {
        next[field] = "checking";
      });
      return next;
    });

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    fieldsToCheck.forEach((field) => {
      latestRequestRef.current[field] = requestId;
    });

    try {
      const response = await fetch("/api/employees/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestPayload),
      });

      const responsePayload = await response.json();
      if (!response.ok) {
        throw new Error("VALIDATION_FAILED");
      }

      const issuesList = Array.isArray(responsePayload?.issues) ? responsePayload.issues : [];
      const issuesByField = new Map<CriticalField, string>();

      issuesList.forEach((issue: any) => {
        if (issue && (issue.field === "email" || issue.field === "nifNie") && typeof issue.message === "string") {
          issuesByField.set(issue.field, issue.message);
        }
      });

      fieldsToCheck.forEach((field) => {
        if (latestRequestRef.current[field] === requestId) {
          form.clearErrors(field);
        }
      });

      fieldsToCheck.forEach((field) => {
        if (latestRequestRef.current[field] === requestId) {
          const issueMessage = issuesByField.get(field);
          if (issueMessage) {
            form.setError(field, { type: "validate", message: issueMessage });
          }
        }
      });

      setFieldStatus((prev) => {
        const next = { ...prev };
        fieldsToCheck.forEach((field) => {
          if (latestRequestRef.current[field] === requestId) {
            next[field] = issuesByField.has(field) ? "invalid" : "valid";
          }
        });
        return next;
      });

      fieldsToCheck.forEach((field) => {
        if (latestRequestRef.current[field] === requestId) {
          if (field === "email") {
            lastCheckedRef.current.email = requestPayload.email;
          } else {
            lastCheckedRef.current.nifNie = requestPayload.nifNie;
          }
        }
      });

      const hasIssues = fieldsToCheck.some(
        (field) => latestRequestRef.current[field] === requestId && issuesByField.has(field),
      );
      return { hasIssues, hadServerError: false };
    } catch {
      setFieldStatus((prev) => {
        const next = { ...prev };
        fieldsToCheck.forEach((field) => {
          if (latestRequestRef.current[field] === requestId) {
            next[field] = "idle";
          }
        });
        return next;
      });

      return { hasIssues: false, hadServerError: true };
    }
  };

  const handleEmailBlur = async () => {
    const isValid = await form.trigger("email");
    if (!isValid) {
      setFieldStatus((prev) => (prev.email === "idle" ? prev : { ...prev, email: "idle" }));
      return;
    }

    await validateCriticalFields(["email"], { force: true });
  };

  const handleNifNieBlur = async () => {
    const isValid = await form.trigger("nifNie");
    if (!isValid) {
      setFieldStatus((prev) => (prev.nifNie === "idle" ? prev : { ...prev, nifNie: "idle" }));
      return;
    }

    await validateCriticalFields(["nifNie"], { force: true });
  };

  const handleSubmit = async (data: CreateEmployeeInput) => {
    const validation = await validateCriticalFields(["email", "nifNie"], { force: true });
    if (validation.hasIssues) {
      toast.error("Revisa los campos marcados", {
        description: "Hay datos que ya existen en el sistema.",
      });
      return;
    }

    if (validation.hadServerError) {
      toast.warning("No se pudo validar la disponibilidad", {
        description: "Se comprobará de nuevo al finalizar el wizard.",
      });
    }

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
                          onBlur={() => {
                            field.onBlur();
                            void handleNifNieBlur();
                          }}
                        />
                      </div>
                    </FormControl>
                    {!fieldState.error && fieldStatus.nifNie === "checking" && (
                      <FormDescription className="text-xs">Comprobando NIF/NIE...</FormDescription>
                    )}
                    {!fieldState.error && fieldStatus.nifNie === "valid" && (
                      <FormDescription className="text-xs text-emerald-600">NIF/NIE disponible</FormDescription>
                    )}
                    <FormMessage />
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
                          onBlur={() => {
                            field.onBlur();
                            void handleEmailBlur();
                          }}
                        />
                      </div>
                    </FormControl>
                    {!fieldState.error && fieldStatus.email === "checking" && (
                      <FormDescription className="text-xs">Comprobando email...</FormDescription>
                    )}
                    {!fieldState.error && fieldStatus.email === "valid" && (
                      <FormDescription className="text-xs text-emerald-600">Email disponible</FormDescription>
                    )}
                    <FormMessage />
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
          <div ref={moreFieldsRef} className="animate-in slide-in-from-top-4 space-y-6">
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
