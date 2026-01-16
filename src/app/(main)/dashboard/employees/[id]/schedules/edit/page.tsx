"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  RotateCcw,
  Save,
  Users,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  assignScheduleToEmployee,
  endEmployeeAssignment,
  getEmployeeCurrentAssignment,
  getScheduleTemplates,
} from "@/server/actions/schedules-v2";

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string | null;
  templateType: "FIXED" | "SHIFT" | "ROTATION" | "FLEXIBLE";
  weeklyHours: number | null;
  isActive: boolean;
  _count?: {
    employeeAssignments: number;
  };
}

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
}

interface CurrentAssignment {
  id: string;
  assignmentType: string;
  scheduleTemplateId: string | null;
  validFrom: Date;
  validTo: Date | null;
  scheduleTemplate: { id: string; name: string } | null;
}

export default function EditEmployeeSchedulePage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Editar horario" />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );
  const params = useParams();
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<CurrentAssignment | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [scheduleType, setScheduleType] = useState<"FIXED" | "SHIFT" | "FLEXIBLE" | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [validFrom, setValidFrom] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employee data
        const employeeResponse = await fetch(`/api/employees/${params.id}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!employeeResponse.ok) {
          throw new Error("Empleado no encontrado");
        }
        const employeeData = await employeeResponse.json();
        setEmployee(employeeData);

        // Fetch current assignment
        const assignmentData = await getEmployeeCurrentAssignment(params.id as string);
        if (assignmentData) {
          setCurrentAssignment(assignmentData as CurrentAssignment);
          setScheduleType(assignmentData.assignmentType as "FIXED" | "SHIFT" | "FLEXIBLE");
          setSelectedTemplateId(assignmentData.scheduleTemplateId);
        }

        // Fetch available templates (FIXED y FLEXIBLE)
        const templatesData = await getScheduleTemplates({ isActive: true });
        setTemplates(templatesData);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        toast.error("Error", { description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleSave = async () => {
    if (!scheduleType) {
      toast.error("Error", { description: "Selecciona un tipo de horario" });
      return;
    }

    setIsSaving(true);
    try {
      const previousTemplateId = currentAssignment ? currentAssignment.scheduleTemplateId : null;

      // If there's a current assignment, end it first
      if (currentAssignment) {
        const endResult = await endEmployeeAssignment(
          currentAssignment.id,
          new Date(validFrom.getTime() - 24 * 60 * 60 * 1000), // Day before new assignment
        );
        if (!endResult.success) {
          throw new Error(endResult.error ?? "Error al finalizar asignacion anterior");
        }
      }

      // Create new assignment
      const result = await assignScheduleToEmployee({
        employeeId: params.id as string,
        assignmentType: scheduleType,
        scheduleTemplateId:
          scheduleType === "FIXED" || scheduleType === "FLEXIBLE" ? (selectedTemplateId ?? undefined) : undefined,
        validFrom,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Error al asignar horario");
      }

      toast.success("Horario actualizado", {
        description: "El horario del empleado ha sido actualizado correctamente",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("schedule-templates:updated"));
        if (previousTemplateId && previousTemplateId !== selectedTemplateId) {
          window.dispatchEvent(
            new CustomEvent("schedule-template:assignments-updated", { detail: { templateId: previousTemplateId } }),
          );
        }
        if (selectedTemplateId) {
          window.dispatchEvent(
            new CustomEvent("schedule-template:assignments-updated", { detail: { templateId: selectedTemplateId } }),
          );
        }
      }

      router.push(`/dashboard/employees/${params.id}/schedules`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PermissionGuard permission="manage_employees" fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Cargando..."
            backButton={{
              href: `/dashboard/employees/${params.id}/schedules`,
              label: "Volver a horarios",
            }}
          />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        </div>
      </PermissionGuard>
    );
  }

  if (error || !employee) {
    return (
      <PermissionGuard permission="manage_employees" fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Error"
            backButton={{
              href: `/dashboard/employees/${params.id}/schedules`,
              label: "Volver a horarios",
            }}
          />
          <EmptyState
            icon={<AlertCircle className="text-destructive mx-auto h-12 w-12" />}
            title="Error al cargar datos"
            description={error ?? "No se pudieron cargar los datos del empleado"}
          />
        </div>
      </PermissionGuard>
    );
  }

  const fixedTemplates = templates.filter((template) => template.templateType === "FIXED");
  const flexibleTemplates = templates.filter((template) => template.templateType === "FLEXIBLE");
  const activeTemplates = scheduleType === "FLEXIBLE" ? flexibleTemplates : fixedTemplates;

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

  return (
    <PermissionGuard permission="manage_employees" fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Editar Horario"
          description={`Cambiar la asignacion de horario de ${fullName}`}
          backButton={{
            href: `/dashboard/employees/${params.id}/schedules`,
            label: "Volver a horarios",
          }}
          badge={
            employee.employeeNumber && (
              <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
            )
          }
        />

        {/* Current assignment info */}
        {currentAssignment && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Asignacion Actual</AlertTitle>
            <AlertDescription>
              {currentAssignment.scheduleTemplate
                ? `Plantilla: ${currentAssignment.scheduleTemplate.name}`
                : `Tipo: ${currentAssignment.assignmentType}`}{" "}
              (desde {format(new Date(currentAssignment.validFrom), "dd/MM/yyyy", { locale: es })})
            </AlertDescription>
          </Alert>
        )}

        {/* Schedule type selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Tipo de Jornada
            </CardTitle>
            <CardDescription>Selecciona como trabaja este empleado</CardDescription>
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
              {/* Fixed schedule option */}
              <div
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all",
                  scheduleType === "FIXED" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40",
                )}
                onClick={() => setScheduleType("FIXED")}
              >
                <Clock className={cn("h-8 w-8", scheduleType === "FIXED" ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <Label className="cursor-pointer text-base font-semibold">Horario Fijo</Label>
                  <p className="text-muted-foreground mt-1 text-xs">Mismo horario cada semana</p>
                </div>
                <RadioGroupItem value="FIXED" className="sr-only" />
              </div>

              {/* Shifts option */}
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

        {/* Template selection for FIXED/FLEXIBLE */}
        {(scheduleType === "FIXED" || scheduleType === "FLEXIBLE") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {scheduleType === "FLEXIBLE" ? "Plantilla Flexible Total" : "Plantilla de Horario"}
              </CardTitle>
              <CardDescription>
                {scheduleType === "FLEXIBLE"
                  ? "Selecciona una plantilla flexible con objetivo semanal"
                  : "Selecciona una plantilla de horario semanal"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTemplates.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    {scheduleType === "FLEXIBLE"
                      ? "No hay plantillas flexibles disponibles."
                      : "No hay plantillas de horario fijo disponibles."}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/dashboard/schedules" target="_blank">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Crear Plantilla
                    </Link>
                  </Button>
                </div>
              ) : (
                <RadioGroup
                  value={selectedTemplateId ?? ""}
                  onValueChange={setSelectedTemplateId}
                  className="space-y-3"
                >
                  {activeTemplates.map((template) => (
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
                            {template._count?.employeeAssignments ?? 0}
                          </div>
                        </div>
                        {template.description && (
                          <p className="text-muted-foreground text-sm">{template.description}</p>
                        )}
                        {template.weeklyHours && (
                          <p className="text-muted-foreground text-xs">{template.weeklyHours}h semanales</p>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shift type info */}
        {scheduleType === "SHIFT" && (
          <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/30">
            <RotateCcw className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-800 dark:text-purple-200">Empleado de Turnos</AlertTitle>
            <AlertDescription className="text-purple-700 dark:text-purple-300">
              El empleado aparecera en{" "}
              <Link href="/dashboard/shifts" target="_blank" className="font-medium underline">
                Gestion de Turnos
              </Link>{" "}
              donde podras asignarle turnos semanalmente.
            </AlertDescription>
          </Alert>
        )}

        {/* Valid from date */}
        {scheduleType && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fecha de Inicio</CardTitle>
              <CardDescription>Indica desde que fecha aplica esta asignacion de horario</CardDescription>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full max-w-sm justify-start text-left font-normal",
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

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push(`/dashboard/employees/${params.id}/schedules`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !scheduleType ||
              ((scheduleType === "FIXED" || scheduleType === "FLEXIBLE") && !selectedTemplateId) ||
              isSaving
            }
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>
      </div>
    </PermissionGuard>
  );
}
