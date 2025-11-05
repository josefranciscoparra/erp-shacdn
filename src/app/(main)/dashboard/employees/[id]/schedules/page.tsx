"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, Clock, Calendar, AlertCircle, Pencil, Sun, CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  employmentContracts: Array<{
    id: string;
    active: boolean;
    weeklyHours: number;
    workingDaysPerWeek: number | null;
    hasIntensiveSchedule: boolean | null;
    intensiveStartDate: string | null;
    intensiveEndDate: string | null;
    intensiveWeeklyHours: number | null;
    hasCustomWeeklyPattern: boolean | null;
    mondayHours: number | null;
    tuesdayHours: number | null;
    wednesdayHours: number | null;
    thursdayHours: number | null;
    fridayHours: number | null;
    saturdayHours: number | null;
    sundayHours: number | null;
    intensiveMondayHours: number | null;
    intensiveTuesdayHours: number | null;
    intensiveWednesdayHours: number | null;
    intensiveThursdayHours: number | null;
    intensiveFridayHours: number | null;
    intensiveSaturdayHours: number | null;
    intensiveSundayHours: number | null;
  }>;
}

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

export default function EmployeeSchedulesPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`/api/employees/${params.id}`);
        if (!response.ok) {
          throw new Error("Empleado no encontrado");
        }
        const data = await response.json();
        setEmployee(data);
      } catch (error: any) {
        setError(error.message);
        toast.error("Error", { description: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchEmployee();
    }
  }, [params.id]);

  if (isLoading) {
    return (
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
    );
  }

  if (error || !employee) {
    return (
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
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;
  const activeContract = employee.employmentContracts.find((c) => c.active);

  if (!activeContract) {
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
        <EmptyState
          icon={<Clock className="text-muted-foreground mx-auto h-12 w-12" />}
          title="Sin contrato activo"
          description="Este empleado no tiene un contrato activo. Crea un contrato antes de gestionar horarios."
        />
      </div>
    );
  }

  const dailyHours =
    activeContract.workingDaysPerWeek && activeContract.workingDaysPerWeek > 0
      ? activeContract.weeklyHours / activeContract.workingDaysPerWeek
      : 0;

  const intensiveDailyHours =
    activeContract.hasIntensiveSchedule &&
    activeContract.intensiveWeeklyHours &&
    activeContract.workingDaysPerWeek &&
    activeContract.workingDaysPerWeek > 0
      ? activeContract.intensiveWeeklyHours / activeContract.workingDaysPerWeek
      : 0;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Horarios"
        description={`Gestión de horarios laborales de ${fullName}`}
        backButton={{
          href: `/dashboard/employees/${params.id}`,
          label: "Volver al empleado",
        }}
        badge={
          employee.employeeNumber ? (
            <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
          ) : undefined
        }
      />

      <div className="flex justify-end">
        <Button onClick={() => router.push(`/dashboard/employees/${params.id}/schedules/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar Horario
        </Button>
      </div>

      <Tabs defaultValue="normal" className="w-full">
        <TabsList>
          <TabsTrigger value="normal">Horario Normal</TabsTrigger>
          {activeContract.hasIntensiveSchedule && <TabsTrigger value="intensive">Horario Intensivo</TabsTrigger>}
        </TabsList>

        {/* Horario Normal */}
        <TabsContent value="normal" className="space-y-6">
          <Card className="from-primary/5 to-card rounded-lg border bg-gradient-to-t shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Clock className="mr-2 h-5 w-5" />
                Jornada Normal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 @4xl/main:grid-cols-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Horas semanales:</span>
                  <span className="font-semibold">{activeContract.weeklyHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Días laborables:</span>
                  <span className="font-semibold">{activeContract.workingDaysPerWeek ?? 5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Horas diarias (aprox):</span>
                  <span className="text-primary font-semibold">{dailyHours.toFixed(2)}h</span>
                </div>
              </div>

              {activeContract.hasCustomWeeklyPattern && (
                <div className="border-t pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="text-primary h-5 w-5" />
                    <h4 className="font-semibold">Distribución Semanal</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
                    {DAYS.map((day) => {
                      const hours = activeContract[`${day.key}Hours` as keyof typeof activeContract] as number | null;
                      return (
                        <div key={day.key} className="bg-muted/30 flex justify-between rounded-md border p-2">
                          <span className="text-muted-foreground text-sm">{day.label}:</span>
                          <span className="font-medium">{hours ?? 0}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Horario Intensivo */}
        {activeContract.hasIntensiveSchedule && (
          <TabsContent value="intensive" className="space-y-6">
            <Card className="to-card rounded-lg border bg-gradient-to-t from-orange-50/50 shadow-xs dark:from-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Sun className="mr-2 h-5 w-5 text-orange-600" />
                  Jornada Intensiva
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 @4xl/main:grid-cols-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Período:</span>
                    <Badge variant="outline" className="border-orange-300 text-orange-700">
                      {activeContract.intensiveStartDate} a {activeContract.intensiveEndDate}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Horas semanales:</span>
                    <span className="font-semibold">{activeContract.intensiveWeeklyHours ?? 0}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Horas diarias (aprox):</span>
                    <span className="font-semibold text-orange-600">{intensiveDailyHours.toFixed(2)}h</span>
                  </div>
                </div>

                {activeContract.hasCustomWeeklyPattern && (
                  <div className="border-t pt-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-orange-600" />
                      <h4 className="font-semibold">Distribución Semanal Intensiva</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
                      {DAYS.map((day) => {
                        const hours = activeContract[
                          `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}Hours` as keyof typeof activeContract
                        ] as number | null;
                        return (
                          <div
                            key={day.key}
                            className="flex justify-between rounded-md border border-orange-200 bg-orange-50/50 p-2 dark:border-orange-800 dark:bg-orange-950/30"
                          >
                            <span className="text-muted-foreground text-sm">{day.label}:</span>
                            <span className="font-medium">{hours ?? 0}h</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
