"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Clock,
  Calendar,
  AlertCircle,
  Pencil,
  Sun,
  CalendarDays,
  ExternalLink,
  RotateCcw,
  CheckCircle,
  Info,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmployeeCurrentAssignment, getScheduleTemplates } from "@/server/actions/schedules-v2";

// Tipos para la asignación V2
interface TimeSlot {
  id: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  slotType: "WORK" | "BREAK" | "ON_CALL" | "OTHER";
  presenceType: "MANDATORY" | "FLEXIBLE" | "REMOTE_ALLOWED";
  description: string | null;
}

interface WorkDayPattern {
  id: string;
  dayOfWeek: number;
  isWorkingDay: boolean;
  timeSlots: TimeSlot[];
}

interface SchedulePeriod {
  id: string;
  periodType: "REGULAR" | "INTENSIVE" | "SPECIAL";
  name: string;
  description: string | null;
  startMonthDay: string | null;
  endMonthDay: string | null;
  workDayPatterns: WorkDayPattern[];
}

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string | null;
  templateType: "FIXED" | "SHIFT" | "ROTATION" | "FLEXIBLE";
  weeklyHours: number | null;
  periods: SchedulePeriod[];
}

interface ScheduleAssignment {
  id: string;
  employeeId: string;
  assignmentType: "FIXED" | "SHIFT" | "ROTATION" | "FLEXIBLE";
  scheduleTemplateId: string | null;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  scheduleTemplate: ScheduleTemplate | null;
  rotationPattern: {
    id: string;
    name: string;
    steps: Array<{
      id: string;
      stepOrder: number;
      durationDays: number;
      scheduleTemplate: { id: string; name: string } | null;
    }>;
  } | null;
}

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
}

const DAYS = [
  { dayOfWeek: 1, label: "Lunes", short: "L" },
  { dayOfWeek: 2, label: "Martes", short: "M" },
  { dayOfWeek: 3, label: "Miércoles", short: "X" },
  { dayOfWeek: 4, label: "Jueves", short: "J" },
  { dayOfWeek: 5, label: "Viernes", short: "V" },
  { dayOfWeek: 6, label: "Sábado", short: "S" },
  { dayOfWeek: 0, label: "Domingo", short: "D" },
] as const;

// Convertir minutos a formato HH:MM
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Calcular horas de trabajo de un día
function calculateDayWorkHours(pattern: WorkDayPattern): number {
  if (!pattern.isWorkingDay) return 0;
  return pattern.timeSlots
    .filter((slot) => slot.slotType === "WORK")
    .reduce((sum, slot) => sum + (slot.endTimeMinutes - slot.startTimeMinutes) / 60, 0);
}

// Obtener configuración del tipo de asignación
function getAssignmentTypeConfig(assignmentType: string) {
  switch (assignmentType) {
    case "FIXED":
      return { label: "Horario Fijo", variant: "default" as const, color: "text-blue-600", icon: Clock };
    case "SHIFT":
      return { label: "Turnos", variant: "outline" as const, color: "text-purple-600", icon: RotateCcw };
    case "ROTATION":
      return { label: "Rotación", variant: "secondary" as const, color: "text-orange-600", icon: RotateCcw };
    case "FLEXIBLE":
      return { label: "Flexible", variant: "outline" as const, color: "text-green-600", icon: Clock };
    default:
      return { label: assignmentType, variant: "outline" as const, color: "text-gray-600", icon: Clock };
  }
}

// Obtener configuración del tipo de período
function getPeriodTypeConfig(periodType: string) {
  switch (periodType) {
    case "REGULAR":
      return { label: "Horario Regular", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
    case "INTENSIVE":
      return {
        label: "Jornada Intensiva",
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      };
    case "SPECIAL":
      return {
        label: "Período Especial",
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      };
    default:
      return { label: periodType, color: "bg-gray-100 text-gray-800" };
  }
}

export default function EmployeeSchedulesPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Horarios del empleado" />
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
  const [assignment, setAssignment] = useState<ScheduleAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener datos del empleado
        const employeeResponse = await fetch(`/api/employees/${params.id}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!employeeResponse.ok) {
          throw new Error("Empleado no encontrado");
        }
        const employeeData = await employeeResponse.json();
        setEmployee(employeeData);

        // Obtener asignación de horario V2
        const assignmentData = await getEmployeeCurrentAssignment(params.id as string);
        setAssignment(assignmentData as ScheduleAssignment | null);
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

  if (isLoading) {
    return (
      <PermissionGuard permissions={["view_employees", "manage_employees"]} fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Cargando horarios..."
            backButton={{
              href: `/dashboard/employees/${params.id}`,
              label: "Volver al empleado",
            }}
          />
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse">Cargando horarios del empleado...</div>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  if (error || !employee) {
    return (
      <PermissionGuard permissions={["view_employees", "manage_employees"]} fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Error"
            backButton={{
              href: `/dashboard/employees/${params.id}`,
              label: "Volver al empleado",
            }}
          />
          <EmptyState
            icon={<AlertCircle className="text-destructive mx-auto h-12 w-12" />}
            title="Error al cargar horarios"
            description={error ?? "No se pudieron cargar los horarios del empleado"}
          />
        </div>
      </PermissionGuard>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;
  const assignmentTypeConfig = assignment ? getAssignmentTypeConfig(assignment.assignmentType) : null;

  // Si no tiene asignación V2
  if (!assignment) {
    return (
      <PermissionGuard permissions={["view_employees", "manage_employees"]} fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Horarios"
            description={`Gestión de horarios laborales de ${fullName}`}
            backButton={{
              href: `/dashboard/employees/${params.id}`,
              label: "Volver al empleado",
            }}
            badge={
              employee.employeeNumber && (
                <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
              )
            }
          />

          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Este empleado no tiene un horario asignado. Puedes asignarle una plantilla de horario existente.
            </AlertDescription>
          </Alert>

          <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Clock className="mr-2 h-5 w-5" />
                Sin Horario Asignado
              </CardTitle>
              <CardDescription>
                Asigna una plantilla de horario para definir la jornada laboral de este empleado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => router.push(`/dashboard/employees/${params.id}/schedules/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Asignar Horario
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/schedules" target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver Plantillas Disponibles
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    );
  }

  // Si es tipo SHIFT (turnos), mostrar mensaje especial
  if (assignment.assignmentType === "SHIFT") {
    return (
      <PermissionGuard permissions={["view_employees", "manage_employees"]} fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader
            title="Horarios"
            description={`Gestión de horarios laborales de ${fullName}`}
            backButton={{
              href: `/dashboard/employees/${params.id}`,
              label: "Volver al empleado",
            }}
            badge={
              <div className="flex items-center gap-2">
                {employee.employeeNumber && (
                  <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
                )}
                <Badge variant="outline" className="text-purple-600">
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Turnos
                </Badge>
              </div>
            }
          />

          <Card className="to-card rounded-lg border bg-gradient-to-t from-purple-50/50 shadow-xs dark:from-purple-950/20">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <RotateCcw className="mr-2 h-5 w-5 text-purple-600" />
                Empleado de Turnos
              </CardTitle>
              <CardDescription>
                Los turnos de este empleado se gestionan desde el módulo de Gestión de Turnos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 @4xl/main:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Tipo de asignación:</span>
                  <Badge variant="outline" className="text-purple-600">
                    Turnos Variables
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Válido desde:</span>
                  <span className="font-semibold">
                    {format(new Date(assignment.validFrom), "dd/MM/yyyy", { locale: es })}
                  </span>
                </div>
              </div>

              <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/30">
                <Info className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800 dark:text-purple-200">
                  Los turnos se asignan semanalmente desde{" "}
                  <Link href="/dashboard/shifts" className="font-medium underline">
                    Gestión de Turnos
                  </Link>
                  . Allí podrás ver y modificar los turnos asignados a este empleado.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/dashboard/shifts">
                    <Calendar className="mr-2 h-4 w-4" />
                    Ir a Gestión de Turnos
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/employees/${params.id}/schedules/edit`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Cambiar Tipo de Horario
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    );
  }

  // Horario FIXED con plantilla asignada
  const template = assignment.scheduleTemplate;

  if (!template) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Horarios"
          description={`Gestión de horarios laborales de ${fullName}`}
          backButton={{
            href: `/dashboard/employees/${params.id}`,
            label: "Volver al empleado",
          }}
        />
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            Error: La asignación existe pero no se encontró la plantilla de horario asociada.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calcular horas semanales del período REGULAR
  const regularPeriod = template.periods.find((p) => p.periodType === "REGULAR");
  const intensivePeriod = template.periods.find((p) => p.periodType === "INTENSIVE");

  const calculateWeeklyHours = (period: SchedulePeriod | undefined): number => {
    if (!period) return 0;
    return period.workDayPatterns.reduce((sum, pattern) => sum + calculateDayWorkHours(pattern), 0);
  };

  const regularWeeklyHours = calculateWeeklyHours(regularPeriod);
  const intensiveWeeklyHours = calculateWeeklyHours(intensivePeriod);

  return (
    <PermissionGuard permissions={["view_employees", "manage_employees"]} fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Horarios"
          description={`Gestión de horarios laborales de ${fullName}`}
          backButton={{
            href: `/dashboard/employees/${params.id}`,
            label: "Volver al empleado",
          }}
          badge={
            <div className="flex items-center gap-2">
              {employee.employeeNumber && (
                <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
              )}
              {assignmentTypeConfig && (
                <Badge variant={assignmentTypeConfig.variant} className={assignmentTypeConfig.color}>
                  {assignmentTypeConfig.label}
                </Badge>
              )}
            </div>
          }
        />

        {/* Información de la asignación */}
        <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-primary h-5 w-5" />
                <CardTitle className="text-lg">Plantilla Asignada</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/employees/${params.id}/schedules/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Cambiar
              </Button>
            </div>
            <CardDescription>{template.description ?? "Sin descripción"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 @4xl/main:grid-cols-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Plantilla</span>
                <span className="font-semibold">{template.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Horas semanales</span>
                <span className="font-semibold">{template.weeklyHours ?? regularWeeklyHours.toFixed(1)}h</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Válido desde</span>
                <span className="font-semibold">
                  {format(new Date(assignment.validFrom), "dd/MM/yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Válido hasta</span>
                <span className="font-semibold">
                  {assignment.validTo
                    ? format(new Date(assignment.validTo), "dd/MM/yyyy", { locale: es })
                    : "Indefinido"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs para períodos */}
        <Tabs defaultValue="regular" className="w-full">
          <TabsList>
            <TabsTrigger value="regular">Horario Regular</TabsTrigger>
            {intensivePeriod && <TabsTrigger value="intensive">Jornada Intensiva</TabsTrigger>}
            {template.periods
              .filter((p) => p.periodType === "SPECIAL")
              .map((period) => (
                <TabsTrigger key={period.id} value={period.id}>
                  {period.name}
                </TabsTrigger>
              ))}
          </TabsList>

          {/* Período Regular */}
          <TabsContent value="regular" className="space-y-6">
            {regularPeriod ? (
              <PeriodCard period={regularPeriod} weeklyHours={regularWeeklyHours} />
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>No hay período regular configurado en esta plantilla.</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Período Intensivo */}
          {intensivePeriod && (
            <TabsContent value="intensive" className="space-y-6">
              <PeriodCard period={intensivePeriod} weeklyHours={intensiveWeeklyHours} isIntensive />
            </TabsContent>
          )}

          {/* Períodos Especiales */}
          {template.periods
            .filter((p) => p.periodType === "SPECIAL")
            .map((period) => (
              <TabsContent key={period.id} value={period.id} className="space-y-6">
                <PeriodCard period={period} weeklyHours={calculateWeeklyHours(period)} isSpecial />
              </TabsContent>
            ))}
        </Tabs>

        {/* Link a gestión de plantillas */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Para modificar los horarios de esta plantilla, ve a{" "}
            <Link href={`/dashboard/schedules/${template.id}`} className="text-primary hover:underline">
              Gestión de Plantillas
            </Link>
          </p>
        </div>
      </div>
    </PermissionGuard>
  );
}

// Componente para mostrar un período
function PeriodCard({
  period,
  weeklyHours,
  isIntensive = false,
  isSpecial = false,
}: {
  period: SchedulePeriod;
  weeklyHours: number;
  isIntensive?: boolean;
  isSpecial?: boolean;
}) {
  const periodConfig = getPeriodTypeConfig(period.periodType);
  const workingDays = period.workDayPatterns.filter((p) => p.isWorkingDay);

  const bgClass = isIntensive
    ? "from-orange-50/50 to-card dark:from-orange-950/20"
    : isSpecial
      ? "from-purple-50/50 to-card dark:from-purple-950/20"
      : "from-primary/5 to-card";

  const iconColor = isIntensive ? "text-orange-600" : isSpecial ? "text-purple-600" : "text-primary";

  return (
    <Card className={`rounded-lg border bg-gradient-to-t shadow-xs ${bgClass}`}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          {isIntensive ? (
            <Sun className={`mr-2 h-5 w-5 ${iconColor}`} />
          ) : (
            <Clock className={`mr-2 h-5 w-5 ${iconColor}`} />
          )}
          {period.name}
          <Badge className={`ml-2 ${periodConfig.color}`}>{periodConfig.label}</Badge>
        </CardTitle>
        {period.description && <CardDescription>{period.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen */}
        <div className="grid gap-4 @4xl/main:grid-cols-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Horas semanales:</span>
            <span className="font-semibold">{weeklyHours.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Días laborables:</span>
            <span className="font-semibold">{workingDays.length}</span>
          </div>
          {period.startMonthDay && period.endMonthDay && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Período:</span>
              <span className="font-semibold">
                {period.startMonthDay} - {period.endMonthDay}
              </span>
            </div>
          )}
        </div>

        {/* Días de la semana */}
        <div className="border-t pt-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className={`h-5 w-5 ${iconColor}`} />
            <h4 className="font-semibold">Días Laborables</h4>
          </div>
          <div className="flex gap-2">
            {DAYS.map((day) => {
              const pattern = period.workDayPatterns.find((p) => p.dayOfWeek === day.dayOfWeek);
              const isWorking = pattern?.isWorkingDay ?? false;
              return (
                <div
                  key={day.dayOfWeek}
                  className={`flex size-10 items-center justify-center rounded-full border-2 font-semibold ${
                    isWorking
                      ? isIntensive
                        ? "border-orange-500 bg-orange-500 text-white"
                        : isSpecial
                          ? "border-purple-500 bg-purple-500 text-white"
                          : "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-muted text-muted-foreground"
                  }`}
                >
                  {day.short}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla de horarios */}
        {workingDays.length > 0 && (
          <div className="border-t pt-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className={`h-5 w-5 ${iconColor}`} />
              <h4 className="font-semibold">Horarios por Día</h4>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className={isIntensive ? "bg-orange-50/50 dark:bg-orange-950/30" : "bg-muted/50"}>
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold">Día</th>
                    <th className="p-3 text-left text-sm font-semibold">Entrada</th>
                    <th className="p-3 text-left text-sm font-semibold">Salida</th>
                    <th className="p-3 text-left text-sm font-semibold">Descansos</th>
                    <th className="p-3 text-right text-sm font-semibold">Horas</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {DAYS.map((day) => {
                    const pattern = period.workDayPatterns.find((p) => p.dayOfWeek === day.dayOfWeek);
                    if (!pattern?.isWorkingDay) return null;

                    const workSlots = pattern.timeSlots.filter((s) => s.slotType === "WORK");
                    const breakSlots = pattern.timeSlots.filter((s) => s.slotType === "BREAK");
                    const dayHours = calculateDayWorkHours(pattern);

                    // Encontrar entrada y salida (primer y último slot de trabajo)
                    const firstWork = workSlots[0];
                    const lastWork = workSlots[workSlots.length - 1];

                    return (
                      <tr key={day.dayOfWeek} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{day.label}</td>
                        <td className="p-3 font-mono text-sm">
                          {firstWork ? minutesToTime(firstWork.startTimeMinutes) : "--:--"}
                        </td>
                        <td className="p-3 font-mono text-sm">
                          {lastWork ? minutesToTime(lastWork.endTimeMinutes) : "--:--"}
                        </td>
                        <td className="p-3 font-mono text-sm">
                          {breakSlots.length > 0
                            ? breakSlots
                                .map((b) => `${minutesToTime(b.startTimeMinutes)}-${minutesToTime(b.endTimeMinutes)}`)
                                .join(", ")
                            : "Sin descanso"}
                        </td>
                        <td className={`p-3 text-right font-semibold ${iconColor}`}>{dayHours.toFixed(2)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
