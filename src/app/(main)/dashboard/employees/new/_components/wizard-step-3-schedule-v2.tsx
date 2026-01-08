"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock, ExternalLink, Info, Loader2, RotateCcw, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getScheduleTemplates } from "@/server/actions/schedules-v2";

// Tipo de datos que enviaremos al wizard
export interface ScheduleAssignmentData {
  scheduleType: "FIXED" | "SHIFT" | "FLEXIBLE";
  scheduleTemplateId?: string;
  validFrom?: Date;
}

interface WizardStep3ScheduleV2Props {
  onSubmit: (data: ScheduleAssignmentData | null) => void;
  isLoading?: boolean;
  initialData?: ScheduleAssignmentData;
}

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
  employeeCount: number;
}

export function WizardStep3ScheduleV2({ onSubmit, isLoading, initialData }: WizardStep3ScheduleV2Props) {
  const [fixedTemplates, setFixedTemplates] = useState<TemplateOption[]>([]);
  const [flexibleTemplates, setFlexibleTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [scheduleType, setScheduleType] = useState<"FIXED" | "SHIFT" | "FLEXIBLE" | null>(
    initialData?.scheduleType ?? null,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialData?.scheduleTemplateId ?? null);
  const [validFrom, setValidFrom] = useState<Date>(initialData?.validFrom ?? new Date());
  const [skipSchedule, setSkipSchedule] = useState(false);

  // Refs para hacer scroll al contenido cuando se selecciona tipo
  const fixedContentRef = useRef<HTMLDivElement>(null);
  const shiftContentRef = useRef<HTMLDivElement>(null);
  const flexibleContentRef = useRef<HTMLDivElement>(null);

  // Cargar plantillas de horario fijo al montar
  useEffect(() => {
    async function loadTemplates() {
      try {
        const data = await getScheduleTemplates({ isActive: true });
        const toOption = (t: {
          id: string;
          name: string;
          description: string | null;
          _count?: { employeeAssignments?: number | null };
        }) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          employeeCount:
            t._count && t._count.employeeAssignments !== undefined && t._count.employeeAssignments !== null
              ? t._count.employeeAssignments
              : 0,
        });
        const fixed = data.filter((t) => t.templateType === "FIXED").map(toOption);
        const flexible = data.filter((t) => t.templateType === "FLEXIBLE").map(toOption);
        setFixedTemplates(fixed);
        setFlexibleTemplates(flexible);
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, []);

  // Scroll suave al contenido cuando se selecciona tipo de jornada
  useEffect(() => {
    if (scheduleType) {
      // Pequeño delay para que el contenido se renderice primero
      setTimeout(() => {
        const targetRef =
          scheduleType === "SHIFT"
            ? shiftContentRef
            : scheduleType === "FLEXIBLE"
              ? flexibleContentRef
              : fixedContentRef;
        targetRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [scheduleType]);

  // Manejar submit
  const handleSubmit = () => {
    if (skipSchedule) {
      onSubmit(null);
      return;
    }

    if (!scheduleType) {
      onSubmit(null);
      return;
    }

    if (scheduleType === "SHIFT") {
      // Turnos: solo guardar el tipo, los turnos se asignan desde /dashboard/shifts
      onSubmit({
        scheduleType: "SHIFT",
      });
      return;
    }

    if (scheduleType === "FIXED" || scheduleType === "FLEXIBLE") {
      if (!selectedTemplateId) {
        // Si es FIXED/FLEXIBLE pero no seleccionó plantilla, solo guardar el tipo
        onSubmit({
          scheduleType,
        });
        return;
      }

      onSubmit({
        scheduleType,
        scheduleTemplateId: selectedTemplateId,
        validFrom,
      });
    }
  };

  // Formulario oculto para integrar con el wizard
  useEffect(() => {
    const form = document.getElementById("wizard-step-3-form") as HTMLFormElement;
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        handleSubmit();
      };
    }
  });

  // Renderizar lista de plantillas
  const renderTemplateList = (templateList: TemplateOption[], emptyMessage: string) => {
    if (templateList.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/dashboard/schedules" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Crear plantilla
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <RadioGroup
        value={selectedTemplateId ?? ""}
        onValueChange={(value) => {
          setSelectedTemplateId(value);
        }}
        className="space-y-3"
      >
        {templateList.map((template) => (
          <div
            key={template.id}
            className={cn(
              "flex items-start space-x-3 rounded-lg border p-4 transition-colors",
              selectedTemplateId === template.id && "border-primary bg-primary/5",
            )}
          >
            <RadioGroupItem value={template.id} id={template.id} className="mt-0.5" />
            <Label htmlFor={template.id} className="flex-1 cursor-pointer space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{template.name}</span>
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  {template.employeeCount}
                </div>
              </div>
              {template.description && <p className="text-muted-foreground text-sm">{template.description}</p>}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando plantillas de horario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Banner de configurar más tarde - Igual que en contratos */}
      <div className="from-primary/15 to-card border-muted hover:border-primary/40 flex items-center justify-between rounded-xl border-2 bg-gradient-to-br p-5 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex-1 space-y-1">
          <Label htmlFor="skip-schedule" className="text-lg font-semibold">
            Configurar horario más tarde
          </Label>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Podrás asignar un horario desde el perfil del empleado.
          </p>
        </div>
        <Switch
          id="skip-schedule"
          checked={skipSchedule}
          onCheckedChange={(checked) => {
            setSkipSchedule(checked);
            if (checked) {
              setScheduleType(null);
              setSelectedTemplateId(null);
            }
          }}
          className="wizard-switch"
        />
      </div>

      {skipSchedule && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            El empleado se creará sin horario asignado. Podrás configurarlo después desde su perfil.
          </AlertDescription>
        </Alert>
      )}

      {/* Selector de tipo de horario - Solo visible si no se omite */}
      {!skipSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Tipo de Jornada
            </CardTitle>
            <CardDescription>¿Cómo trabaja este empleado?</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={scheduleType ?? ""}
              onValueChange={(value) => {
                const nextType = value as "FIXED" | "SHIFT" | "FLEXIBLE";
                setScheduleType(nextType);
                if (nextType !== scheduleType) {
                  setSelectedTemplateId(null);
                }
              }}
              className="grid grid-cols-1 gap-4 @md/main:grid-cols-3"
            >
              {/* Opción Horario Fijo */}
              <div
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all",
                  scheduleType === "FIXED" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40",
                )}
                onClick={() => {
                  setScheduleType("FIXED");
                }}
              >
                <Clock className={cn("h-8 w-8", scheduleType === "FIXED" ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <Label className="cursor-pointer text-base font-semibold">Horario Fijo</Label>
                  <p className="text-muted-foreground mt-1 text-xs">Mismo horario cada semana</p>
                </div>
                <RadioGroupItem value="FIXED" className="sr-only" />
              </div>

              {/* Opción Turnos */}
              <div
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all",
                  scheduleType === "SHIFT" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40",
                )}
                onClick={() => {
                  setScheduleType("SHIFT");
                  setSelectedTemplateId(null);
                }}
              >
                <RotateCcw
                  className={cn("h-8 w-8", scheduleType === "SHIFT" ? "text-primary" : "text-muted-foreground")}
                />
                <div className="text-center">
                  <Label className="cursor-pointer text-base font-semibold">Turnos</Label>
                  <p className="text-muted-foreground mt-1 text-xs">Turnos rotativos o variables</p>
                </div>
                <RadioGroupItem value="SHIFT" className="sr-only" />
              </div>

              {/* Flexible option */}
              <div
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all",
                  scheduleType === "FLEXIBLE" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40",
                )}
                onClick={() => {
                  setScheduleType("FLEXIBLE");
                  setSelectedTemplateId(null);
                }}
              >
                <Clock
                  className={cn("h-8 w-8", scheduleType === "FLEXIBLE" ? "text-primary" : "text-muted-foreground")}
                />
                <div className="text-center">
                  <Label className="cursor-pointer text-base font-semibold">Flexible total</Label>
                  <p className="text-muted-foreground mt-1 text-xs">Objetivo semanal sin franjas</p>
                </div>
                <RadioGroupItem value="FLEXIBLE" className="sr-only" />
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Contenido para Horario Fijo */}
      {!skipSchedule && scheduleType === "FIXED" && (
        <div ref={fixedContentRef} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plantilla de Horario</CardTitle>
              <CardDescription>Selecciona una plantilla de horario semanal (opcional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fixedTemplates.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No hay plantillas de horario fijo creadas.{" "}
                      <Link
                        href="/dashboard/schedules"
                        target="_blank"
                        className="text-primary font-medium hover:underline"
                      >
                        Crear plantilla
                      </Link>
                    </AlertDescription>
                  </Alert>
                ) : (
                  renderTemplateList(fixedTemplates, "No hay plantillas de horario fijo")
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fecha desde - Solo si seleccionó plantilla */}
          {selectedTemplateId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fecha de inicio</CardTitle>
                <CardDescription>Indica desde qué fecha aplica este horario</CardDescription>
              </CardHeader>
              <CardContent>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !validFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validFrom ? format(validFrom, "PPP", { locale: es }) : "Selecciona una fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={validFrom}
                      onSelect={(date) => date && setValidFrom(date)}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Contenido para Flexible Total */}
      {!skipSchedule && scheduleType === "FLEXIBLE" && (
        <div ref={flexibleContentRef} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plantilla Flexible Total</CardTitle>
              <CardDescription>Selecciona una plantilla flexible con objetivo semanal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flexibleTemplates.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No hay plantillas flexibles creadas.{" "}
                      <Link
                        href="/dashboard/schedules"
                        target="_blank"
                        className="text-primary font-medium hover:underline"
                      >
                        Crear plantilla
                      </Link>
                    </AlertDescription>
                  </Alert>
                ) : (
                  renderTemplateList(flexibleTemplates, "No hay plantillas flexibles")
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fecha desde - Solo si seleccionó plantilla */}
          {selectedTemplateId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fecha de inicio</CardTitle>
                <CardDescription>Indica desde qué fecha aplica este horario</CardDescription>
              </CardHeader>
              <CardContent>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !validFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validFrom ? format(validFrom, "PPP", { locale: es }) : "Selecciona una fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={validFrom}
                      onSelect={(date) => date && setValidFrom(date)}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Contenido para Turnos */}
      {!skipSchedule && scheduleType === "SHIFT" && (
        <div ref={shiftContentRef}>
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">Empleado de turnos</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              El empleado aparecerá en{" "}
              <Link href="/dashboard/shifts" target="_blank" className="font-medium underline">
                Gestión de Turnos
              </Link>{" "}
              donde podrás asignarle turnos semanalmente.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Link para crear nueva plantilla */}
      {!skipSchedule &&
        (scheduleType === "FIXED" || scheduleType === "FLEXIBLE") &&
        (scheduleType === "FIXED" ? fixedTemplates.length > 0 : flexibleTemplates.length > 0) && (
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              ¿No encuentras la plantilla que necesitas?{" "}
              <Link href="/dashboard/schedules" target="_blank" className="text-primary hover:underline">
                Crear nueva plantilla
              </Link>
            </p>
          </div>
        )}

      {/* Form oculto para el wizard */}
      <form id="wizard-step-3-form" className="hidden" />
    </div>
  );
}
