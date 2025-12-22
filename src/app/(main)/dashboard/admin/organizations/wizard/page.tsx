"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { HierarchyType } from "@prisma/client";
import { ArrowLeft, Building2, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { generateOrganizationPrefix } from "@/services/employees";

interface OrgFormState {
  name: string;
  vat: string;
  hierarchyType: HierarchyType;
  employeeNumberPrefix: string;
  annualPtoDays: number;
  allowedEmailDomains: string[];
}

interface CatalogFormState {
  costCenterName: string;
  costCenterCode: string;
  costCenterDescription: string;
  costCenterTimezone: string;
  departmentName: string;
  departmentDescription: string;
  scheduleName: string;
  scheduleDescription: string;
  startTime: string;
  breakStart: string;
  breakEnd: string;
  endTime: string;
}

const steps = [
  { id: 1, title: "Identidad de la organización", description: "Nombre legal, prefijo y dominios corporativos." },
  { id: 2, title: "Catálogos base", description: "Centro principal, departamento inicial y horario oficial." },
  { id: 3, title: "Resumen y confirmación", description: "Revisión final antes de generar la organización." },
];

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
};

export default function OrganizationWizardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";

  const [currentStep, setCurrentStep] = useState(1);
  const [orgForm, setOrgForm] = useState<OrgFormState>({
    name: "",
    vat: "",
    hierarchyType: HierarchyType.DEPARTMENTAL,
    employeeNumberPrefix: "",
    annualPtoDays: 23,
    allowedEmailDomains: [],
  });
  const [domainInput, setDomainInput] = useState("");
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>({
    costCenterName: "Centro principal",
    costCenterCode: "",
    costCenterDescription: "",
    costCenterTimezone: "Europe/Madrid",
    departmentName: "Departamento general",
    departmentDescription: "",
    scheduleName: "Horario 9:00-18:00",
    scheduleDescription: "Horario estándar con pausa de comida",
    startTime: "09:00",
    breakStart: "14:00",
    breakEnd: "15:00",
    endTime: "18:00",
  });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (orgForm.name && !orgForm.employeeNumberPrefix) {
      setOrgForm((prev) => ({
        ...prev,
        employeeNumberPrefix: generateOrganizationPrefix(prev.name),
      }));
    }
  }, [orgForm.name, orgForm.employeeNumberPrefix]);

  const handleAddDomain = () => {
    const domain = domainInput.trim().replace(/^@/, "").toLowerCase();
    if (!domain) return;
    if (orgForm.allowedEmailDomains.includes(domain)) {
      toast.info("Ese dominio ya está en la lista.");
      return;
    }
    setOrgForm((prev) => ({
      ...prev,
      allowedEmailDomains: [...prev.allowedEmailDomains, domain],
    }));
    setDomainInput("");
  };

  const handleRemoveDomain = (domain: string) => {
    setOrgForm((prev) => ({
      ...prev,
      allowedEmailDomains: prev.allowedEmailDomains.filter((item) => item !== domain),
    }));
  };

  const validateStepOne = () => {
    if (!orgForm.name.trim()) {
      return "El nombre de la organización es obligatorio.";
    }
    const prefix = orgForm.employeeNumberPrefix.trim();
    if (!prefix) {
      return "Necesitas un prefijo para numerar empleados automáticamente.";
    }
    if (prefix.length < 2) {
      return "El prefijo debe tener al menos 2 caracteres.";
    }
    if (prefix.length > 6) {
      return "El prefijo no puede tener más de 6 caracteres.";
    }
    if (Number.isNaN(orgForm.annualPtoDays) || orgForm.annualPtoDays < 0) {
      return "Indica los días de vacaciones que dais por defecto (puede ser 0).";
    }
    return null;
  };

  const validateStepTwo = () => {
    if (!catalogForm.costCenterName.trim()) {
      return "El centro de trabajo necesita un nombre.";
    }
    if (!catalogForm.departmentName.trim()) {
      return "Debes definir al menos un departamento.";
    }
    if (!catalogForm.scheduleName.trim()) {
      return "Ponle un nombre identificativo al horario.";
    }
    if (!timeRegex.test(catalogForm.startTime) || !timeRegex.test(catalogForm.endTime)) {
      return "Las horas de inicio y fin deben tener formato HH:MM.";
    }
    const startMinutes = timeToMinutes(catalogForm.startTime);
    const endMinutes = timeToMinutes(catalogForm.endTime);
    if (endMinutes <= startMinutes) {
      return "La hora de fin debe ser posterior a la de inicio.";
    }
    if (catalogForm.breakStart || catalogForm.breakEnd) {
      if (!timeRegex.test(catalogForm.breakStart) || !timeRegex.test(catalogForm.breakEnd)) {
        return "La pausa debe tener formato HH:MM tanto en inicio como fin.";
      }
      const breakStartMinutes = timeToMinutes(catalogForm.breakStart);
      const breakEndMinutes = timeToMinutes(catalogForm.breakEnd);
      if (breakEndMinutes <= breakStartMinutes) {
        return "La pausa debe terminar después de haber empezado.";
      }
      if (breakStartMinutes <= startMinutes || breakEndMinutes >= endMinutes) {
        return "Coloca la pausa dentro del horario laboral (entre inicio y fin).";
      }
    }
    return null;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      const validation = validateStepOne();
      if (validation) {
        setError(validation);
        toast.error(validation);
        return;
      }
    }
    if (currentStep === 2) {
      const validation = validateStepTwo();
      if (validation) {
        setError(validation);
        toast.error(validation);
        return;
      }
    }
    setCurrentStep((prev) => Math.min(3, prev + 1));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleConfirm = async () => {
    const validation = validateStepTwo();
    if (validation) {
      setError(validation);
      toast.error(validation);
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/admin/organizations/wizard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization: {
            name: orgForm.name,
            vat: orgForm.vat || undefined,
            hierarchyType: orgForm.hierarchyType,
            annualPtoDays: orgForm.annualPtoDays,
            employeeNumberPrefix: orgForm.employeeNumberPrefix.trim() ? orgForm.employeeNumberPrefix.trim() : undefined,
            allowedEmailDomains: orgForm.allowedEmailDomains,
          },
          catalogs: {
            costCenter: {
              name: catalogForm.costCenterName,
              code: catalogForm.costCenterCode || undefined,
              description: catalogForm.costCenterDescription || undefined,
              timezone: catalogForm.costCenterTimezone,
            },
            department: {
              name: catalogForm.departmentName,
              description: catalogForm.departmentDescription || undefined,
            },
            schedule: {
              name: catalogForm.scheduleName,
              description: catalogForm.scheduleDescription || undefined,
              startTime: catalogForm.startTime,
              endTime: catalogForm.endTime,
              breakStart: catalogForm.breakStart || undefined,
              breakEnd: catalogForm.breakEnd || undefined,
            },
          },
          notes: notes || undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        let errorMessage = "No se pudo crear la organización.";
        const serverError = data?.error;
        if (typeof serverError === "string") {
          errorMessage = serverError;
        } else if (serverError?.message && typeof serverError.message === "string") {
          errorMessage = serverError.message;
        } else if (serverError) {
          errorMessage = JSON.stringify(serverError);
        }
        throw new Error(errorMessage);
      }

      toast.success(
        `Organización "${data.organization?.name ?? orgForm.name}" creada con catálogos base listos para importar.`,
      );
      router.push("/dashboard/admin/organizations");
    } catch (submissionError) {
      console.error(submissionError);
      toast.error(
        submissionError instanceof Error ? submissionError.message : "No se pudo completar la configuración guiada.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const schedulePreview = useMemo(() => {
    const start = catalogForm.startTime;
    const end = catalogForm.endTime;
    return catalogForm.breakStart && catalogForm.breakEnd
      ? `${start} - ${catalogForm.breakStart} Trabajo · ${catalogForm.breakStart} - ${catalogForm.breakEnd} Pausa · ${catalogForm.breakEnd} - ${end} Trabajo`
      : `${start} - ${end} Jornada completa`;
  }, [catalogForm.startTime, catalogForm.endTime, catalogForm.breakStart, catalogForm.breakEnd]);

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <EmptyState
        icon={<Building2 className="mx-auto h-12 w-12" />}
        title="Solo los super administradores pueden crear organizaciones"
        description="Pide acceso al equipo de plataforma o cambia al perfil de SUPER_ADMIN para continuar."
      />
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Alta guiada de organización"
        subtitle="Prepara una nueva empresa con todos los catálogos imprescindibles para importar empleados sin scripts."
        backButton={{
          href: "/dashboard/admin/organizations",
          label: "Volver a organizaciones",
        }}
        badge={
          <Badge variant="outline" className="gap-1 text-xs">
            <Sparkles className="h-3 w-3" />
            Wizard
          </Badge>
        }
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>¿Qué vas a conseguir?</CardTitle>
          <CardDescription>
            Este wizard crea la organización, le asigna un centro de trabajo, un departamento inicial y un horario listo
            para la importación masiva de empleados. Piensa en él como la “configuración básica” que antes hacías con
            scripts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="text-muted-foreground list-decimal space-y-2 pl-4 text-sm">
            <li>Cuéntanos el nombre legal, el prefijo y los dominios que usa la empresa.</li>
            <li>
              Define dónde trabaja la gente (centro), cómo organizas al equipo (departamento) y cuál es el horario.
            </li>
            <li>Revisa el resumen y confirma. Al terminar podrás ir directo al importador de empleados.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Paso {currentStep} de 3 · {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>{steps[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step) => {
              const status =
                step.id < currentStep ? "done" : step.id === currentStep ? "current" : ("pending" as const);
              return (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm",
                    status === "done" && "border-emerald-200 bg-emerald-50/80 text-emerald-900",
                    status === "current" && "border-primary/50 bg-primary/5 text-primary",
                    status === "pending" && "text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {status === "done" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                    <p className="font-medium">{step.title}</p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          {currentStep === 1 ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre legal</Label>
                  <Input
                    value={orgForm.name}
                    onChange={(event) =>
                      setOrgForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ej. ACME Iberia SL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIF/CIF (opcional)</Label>
                  <Input
                    value={orgForm.vat}
                    onChange={(event) =>
                      setOrgForm((prev) => ({
                        ...prev,
                        vat: event.target.value,
                      }))
                    }
                    placeholder="B12345678"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prefijo para números de empleado</Label>
                  <Input
                    value={orgForm.employeeNumberPrefix}
                    maxLength={6}
                    onChange={(event) =>
                      setOrgForm((prev) => ({
                        ...prev,
                        employeeNumberPrefix: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                      }))
                    }
                    placeholder="TMNW"
                  />
                  <p className="text-muted-foreground text-xs">
                    Así generaremos códigos como {orgForm.employeeNumberPrefix || "TMNW"}00001 automáticamente.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Días de vacaciones anuales</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={orgForm.annualPtoDays}
                    onChange={(event) =>
                      setOrgForm((prev) => ({
                        ...prev,
                        annualPtoDays: Number.parseInt(event.target.value || "0", 10),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de jerarquía</Label>
                  <Select
                    value={orgForm.hierarchyType}
                    onValueChange={(value) =>
                      setOrgForm((prev) => ({
                        ...prev,
                        hierarchyType: value as HierarchyType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Elige el tipo de jerarquía" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={HierarchyType.DEPARTMENTAL}>Departamental</SelectItem>
                      <SelectItem value={HierarchyType.FLAT}>Plana (sin jerarquía)</SelectItem>
                      <SelectItem value={HierarchyType.HIERARCHICAL}>Jerárquica completa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dominios corporativos</Label>
                  <div className="flex gap-2">
                    <Input
                      value={domainInput}
                      onChange={(event) => setDomainInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddDomain();
                        }
                      }}
                      placeholder="empresa.com"
                    />
                    <Button type="button" variant="outline" onClick={handleAddDomain}>
                      Añadir
                    </Button>
                  </div>
                  {orgForm.allowedEmailDomains.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {orgForm.allowedEmailDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="gap-2">
                          @{domain}
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(domain)}
                            className="text-destructive text-xs hover:underline"
                          >
                            quitar
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Puedes dejarlo vacío si aún no tenéis dominio propio (permitirá cualquier email).
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Centro de trabajo principal</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={catalogForm.costCenterName}
                    onChange={(event) =>
                      setCatalogForm((prev) => ({
                        ...prev,
                        costCenterName: event.target.value,
                      }))
                    }
                    placeholder="Centro HQ Madrid"
                  />
                  <Input
                    value={catalogForm.costCenterCode}
                    onChange={(event) =>
                      setCatalogForm((prev) => ({
                        ...prev,
                        costCenterCode: event.target.value,
                      }))
                    }
                    placeholder="Código interno (opcional)"
                  />
                </div>
                <Textarea
                  value={catalogForm.costCenterDescription}
                  onChange={(event) =>
                    setCatalogForm((prev) => ({
                      ...prev,
                      costCenterDescription: event.target.value,
                    }))
                  }
                  placeholder="Describe este centro o su dirección (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Departamento inicial</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={catalogForm.departmentName}
                    onChange={(event) =>
                      setCatalogForm((prev) => ({
                        ...prev,
                        departmentName: event.target.value,
                      }))
                    }
                    placeholder="Departamento general"
                  />
                  <Input
                    value={catalogForm.departmentDescription}
                    onChange={(event) =>
                      setCatalogForm((prev) => ({
                        ...prev,
                        departmentDescription: event.target.value,
                      }))
                    }
                    placeholder="Descripción (opcional)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Horario oficial</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={catalogForm.scheduleName}
                    onChange={(event) =>
                      setCatalogForm((prev) => ({
                        ...prev,
                        scheduleName: event.target.value,
                      }))
                    }
                    placeholder="Horario Comercial"
                  />
                  <Input
                    value={catalogForm.scheduleDescription}
                    onChange={(event) =>
                      setCatalogForm((prev) => ({
                        ...prev,
                        scheduleDescription: event.target.value,
                      }))
                    }
                    placeholder="Descripción (opcional)"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Inicio</Label>
                    <Input
                      value={catalogForm.startTime}
                      onChange={(event) =>
                        setCatalogForm((prev) => ({
                          ...prev,
                          startTime: event.target.value,
                        }))
                      }
                      type="time"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Pausa (inicio)</Label>
                    <Input
                      value={catalogForm.breakStart}
                      onChange={(event) =>
                        setCatalogForm((prev) => ({
                          ...prev,
                          breakStart: event.target.value,
                        }))
                      }
                      type="time"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Pausa (fin)</Label>
                    <Input
                      value={catalogForm.breakEnd}
                      onChange={(event) =>
                        setCatalogForm((prev) => ({
                          ...prev,
                          breakEnd: event.target.value,
                        }))
                      }
                      type="time"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Fin</Label>
                    <Input
                      value={catalogForm.endTime}
                      onChange={(event) =>
                        setCatalogForm((prev) => ({
                          ...prev,
                          endTime: event.target.value,
                        }))
                      }
                      type="time"
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">Vista previa: {schedulePreview}</p>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  title="Organización"
                  items={[
                    { label: "Nombre legal", value: orgForm.name },
                    { label: "Prefijo", value: orgForm.employeeNumberPrefix || "Pendiente" },
                    { label: "Vacaciones anuales", value: `${orgForm.annualPtoDays} días` },
                    {
                      label: "Dominios",
                      value:
                        orgForm.allowedEmailDomains.length > 0
                          ? orgForm.allowedEmailDomains.map((domain) => `@${domain}`).join(", ")
                          : "Cualquier email",
                    },
                  ]}
                />
                <SummaryCard
                  title="Catálogos"
                  items={[
                    { label: "Centro", value: catalogForm.costCenterName },
                    { label: "Departamento", value: catalogForm.departmentName },
                    { label: "Horario", value: catalogForm.scheduleName },
                    { label: "Horario detalle", value: schedulePreview },
                  ]}
                />
                <SummaryCard
                  title="Checklist"
                  items={[
                    { label: "Prefijo y dominios", value: orgForm.employeeNumberPrefix ? "Listo" : "Pendiente" },
                    {
                      label: "Centros / Departamentos / Horarios",
                      value: "Se crearán automáticamente (1 de cada)",
                    },
                    { label: "Importador masivo", value: "Listo para usarse tras confirmar" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas internas (solo para SUPER_ADMIN)</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Si necesitas recordar algo (ej. 'Generada para onboarding PRO - Feb 2025'), escríbelo aquí."
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={currentStep === 1 ? () => router.push("/dashboard/admin/organizations") : handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentStep === 1 ? "Cancelar" : "Volver"}
            </Button>
            <div className="flex gap-2">
              {currentStep < 3 ? (
                <Button onClick={handleNext}>Continuar</Button>
              ) : (
                <Button onClick={handleConfirm} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando organización...
                    </>
                  ) : (
                    "Confirmar y crear"
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  items: { label: string; value: string }[];
}

function SummaryCard({ title, items }: SummaryCardProps) {
  return (
    <div className="rounded-lg border p-4 text-sm">
      <p className="font-semibold">{title}</p>
      <ul className="text-muted-foreground mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col">
            <span className="text-xs tracking-wide uppercase">{item.label}</span>
            <span className="text-foreground">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
