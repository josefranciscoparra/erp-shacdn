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
    scheduleType: "FLEXIBLE" | "FIXED" | "SHIFTS";
    weeklyHours: number;
    workingDaysPerWeek: number | null;

    // FIXED schedule fields
    hasFixedTimeSlots: boolean | null;
    workMonday: boolean | null;
    workTuesday: boolean | null;
    workWednesday: boolean | null;
    workThursday: boolean | null;
    workFriday: boolean | null;
    workSaturday: boolean | null;
    workSunday: boolean | null;

    // Time slots
    mondayStartTime: string | null;
    mondayEndTime: string | null;
    tuesdayStartTime: string | null;
    tuesdayEndTime: string | null;
    wednesdayStartTime: string | null;
    wednesdayEndTime: string | null;
    thursdayStartTime: string | null;
    thursdayEndTime: string | null;
    fridayStartTime: string | null;
    fridayEndTime: string | null;
    saturdayStartTime: string | null;
    saturdayEndTime: string | null;
    sundayStartTime: string | null;
    sundayEndTime: string | null;

    // Breaks
    mondayBreakStartTime: string | null;
    mondayBreakEndTime: string | null;
    tuesdayBreakStartTime: string | null;
    tuesdayBreakEndTime: string | null;
    wednesdayBreakStartTime: string | null;
    wednesdayBreakEndTime: string | null;
    thursdayBreakStartTime: string | null;
    thursdayBreakEndTime: string | null;
    fridayBreakStartTime: string | null;
    fridayBreakEndTime: string | null;
    saturdayBreakStartTime: string | null;
    saturdayBreakEndTime: string | null;
    sundayBreakStartTime: string | null;
    sundayBreakEndTime: string | null;

    // Intensive schedule
    hasIntensiveSchedule: boolean | null;
    intensiveStartDate: string | null;
    intensiveEndDate: string | null;
    intensiveWeeklyHours: number | null;

    // Intensive time slots
    intensiveMondayStartTime: string | null;
    intensiveMondayEndTime: string | null;
    intensiveTuesdayStartTime: string | null;
    intensiveTuesdayEndTime: string | null;
    intensiveWednesdayStartTime: string | null;
    intensiveWednesdayEndTime: string | null;
    intensiveThursdayStartTime: string | null;
    intensiveThursdayEndTime: string | null;
    intensiveFridayStartTime: string | null;
    intensiveFridayEndTime: string | null;
    intensiveSaturdayStartTime: string | null;
    intensiveSaturdayEndTime: string | null;
    intensiveSundayStartTime: string | null;
    intensiveSundayEndTime: string | null;

    // Intensive breaks
    intensiveMondayBreakStartTime: string | null;
    intensiveMondayBreakEndTime: string | null;
    intensiveTuesdayBreakStartTime: string | null;
    intensiveTuesdayBreakEndTime: string | null;
    intensiveWednesdayBreakStartTime: string | null;
    intensiveWednesdayBreakEndTime: string | null;
    intensiveThursdayBreakStartTime: string | null;
    intensiveThursdayBreakEndTime: string | null;
    intensiveFridayBreakStartTime: string | null;
    intensiveFridayBreakEndTime: string | null;
    intensiveSaturdayBreakStartTime: string | null;
    intensiveSaturdayBreakEndTime: string | null;
    intensiveSundayBreakStartTime: string | null;
    intensiveSundayBreakEndTime: string | null;

    // Legacy fields (for backward compatibility)
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
  { key: "monday", label: "Lunes", short: "L" },
  { key: "tuesday", label: "Martes", short: "M" },
  { key: "wednesday", label: "Miércoles", short: "X" },
  { key: "thursday", label: "Jueves", short: "J" },
  { key: "friday", label: "Viernes", short: "V" },
  { key: "saturday", label: "Sábado", short: "S" },
  { key: "sunday", label: "Domingo", short: "D" },
] as const;

// Helper function to calculate hours from time slots (HH:MM format)
function calculateHoursFromTimeSlot(
  startTime: string | null,
  endTime: string | null,
  breakStart: string | null = null,
  breakEnd: string | null = null,
): number {
  if (!startTime || !endTime) return 0;

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);

  // Subtract break time if exists
  let breakMinutes = 0;
  if (breakStart && breakEnd) {
    const [breakStartHour, breakStartMin] = breakStart.split(":").map(Number);
    const [breakEndHour, breakEndMin] = breakEnd.split(":").map(Number);
    breakMinutes = breakEndHour * 60 + breakEndMin - (breakStartHour * 60 + breakStartMin);
  }

  return (totalMinutes - breakMinutes) / 60; // Convert to hours
}

// Get schedule type label and color
function getScheduleTypeConfig(scheduleType: "FLEXIBLE" | "FIXED" | "SHIFTS") {
  switch (scheduleType) {
    case "FIXED":
      return { label: "Horario Fijo", variant: "default" as const, color: "text-blue-600" };
    case "FLEXIBLE":
      return { label: "Horario Flexible", variant: "secondary" as const, color: "text-green-600" };
    case "SHIFTS":
      return { label: "Turnos", variant: "outline" as const, color: "text-purple-600" };
  }
}

export default function EmployeeSchedulesPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`/api/employees/${params.id}`, {
          cache: "no-store", // IMPORTANTE: Fuerza fetch sin cache
          headers: {
            "Cache-Control": "no-cache", // Evita cache del navegador
          },
        });
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

  // Get schedule type configuration
  const scheduleTypeConfig = activeContract ? getScheduleTypeConfig(activeContract.scheduleType) : null;

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

  // Calculate working days from FIXED schedule if applicable
  const getWorkingDays = () => {
    if (activeContract.scheduleType === "FIXED") {
      return DAYS.filter(
        (day) =>
          activeContract[`work${day.key.charAt(0).toUpperCase() + day.key.slice(1)}` as keyof typeof activeContract],
      ).length;
    }
    return activeContract.workingDaysPerWeek ?? 5;
  };

  const workingDaysCount = getWorkingDays();

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
          <div className="flex items-center gap-2">
            {employee.employeeNumber && (
              <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
            )}
            {scheduleTypeConfig && (
              <Badge variant={scheduleTypeConfig.variant} className={scheduleTypeConfig.color}>
                {scheduleTypeConfig.label}
              </Badge>
            )}
          </div>
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
                  <span className="font-semibold">{workingDaysCount}</span>
                </div>
                {activeContract.scheduleType === "FIXED" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Tipo de horario:</span>
                    <Badge variant="outline">
                      {activeContract.hasFixedTimeSlots ? "Horarios fijos" : "Horarios flexibles"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* FIXED Schedule Visualization */}
              {activeContract.scheduleType === "FIXED" && (
                <div className="space-y-4 border-t pt-4">
                  {/* Working Days Visual Indicator */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarDays className="text-primary h-5 w-5" />
                      <h4 className="font-semibold">Días Laborables</h4>
                    </div>
                    <div className="flex gap-2">
                      {DAYS.map((day) => {
                        const isWorking =
                          activeContract[
                            `work${day.key.charAt(0).toUpperCase() + day.key.slice(1)}` as keyof typeof activeContract
                          ];
                        return (
                          <div
                            key={day.key}
                            className={`flex size-10 items-center justify-center rounded-full border-2 font-semibold ${
                              isWorking
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted bg-muted text-muted-foreground"
                            }`}
                          >
                            {day.short}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots Table */}
                  {activeContract.hasFixedTimeSlots && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Clock className="text-primary h-5 w-5" />
                        <h4 className="font-semibold">Horarios por Día</h4>
                      </div>
                      <div className="overflow-hidden rounded-lg border">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="p-3 text-left text-sm font-semibold">Día</th>
                              <th className="p-3 text-left text-sm font-semibold">Entrada</th>
                              <th className="p-3 text-left text-sm font-semibold">Salida</th>
                              <th className="p-3 text-left text-sm font-semibold">Descanso</th>
                              <th className="p-3 text-right text-sm font-semibold">Horas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {DAYS.map((day) => {
                              const isWorking =
                                activeContract[
                                  `work${day.key.charAt(0).toUpperCase() + day.key.slice(1)}` as keyof typeof activeContract
                                ];
                              if (!isWorking) return null;

                              const startTime = activeContract[`${day.key}StartTime` as keyof typeof activeContract] as
                                | string
                                | null;
                              const endTime = activeContract[`${day.key}EndTime` as keyof typeof activeContract] as
                                | string
                                | null;
                              const breakStart = activeContract[
                                `${day.key}BreakStartTime` as keyof typeof activeContract
                              ] as string | null;
                              const breakEnd = activeContract[
                                `${day.key}BreakEndTime` as keyof typeof activeContract
                              ] as string | null;
                              const hours = calculateHoursFromTimeSlot(startTime, endTime, breakStart, breakEnd);

                              return (
                                <tr key={day.key} className="hover:bg-muted/30">
                                  <td className="p-3 font-medium">{day.label}</td>
                                  <td className="p-3 font-mono text-sm">{startTime ?? "--:--"}</td>
                                  <td className="p-3 font-mono text-sm">{endTime ?? "--:--"}</td>
                                  <td className="p-3 font-mono text-sm">
                                    {breakStart && breakEnd ? `${breakStart} - ${breakEnd}` : "Sin descanso"}
                                  </td>
                                  <td className="text-primary p-3 text-right font-semibold">{hours.toFixed(2)}h</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FLEXIBLE Schedule Visualization (Legacy) */}
              {activeContract.scheduleType === "FLEXIBLE" && activeContract.hasCustomWeeklyPattern && (
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
        {activeContract.hasIntensiveSchedule &&
          (() => {
            // Calculate total intensive hours from time slots
            const totalIntensiveHours = DAYS.reduce((total, day) => {
              const isWorking =
                activeContract[
                  `work${day.key.charAt(0).toUpperCase() + day.key.slice(1)}` as keyof typeof activeContract
                ];
              if (!isWorking) return total;

              const startTime = activeContract[
                `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}StartTime` as keyof typeof activeContract
              ] as string | null;
              const endTime = activeContract[
                `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}EndTime` as keyof typeof activeContract
              ] as string | null;
              const breakStart = activeContract[
                `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}BreakStartTime` as keyof typeof activeContract
              ] as string | null;
              const breakEnd = activeContract[
                `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}BreakEndTime` as keyof typeof activeContract
              ] as string | null;

              return total + calculateHoursFromTimeSlot(startTime, endTime, breakStart, breakEnd);
            }, 0);

            return (
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
                        <span className="font-semibold">{totalIntensiveHours.toFixed(0)}h</span>
                      </div>
                      {activeContract.scheduleType === "FIXED" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Tipo de horario:</span>
                          <Badge variant="outline">
                            {activeContract.hasFixedTimeSlots ? "Horarios fijos" : "Horarios flexibles"}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* FIXED Intensive Schedule Visualization */}
                    {activeContract.scheduleType === "FIXED" && activeContract.hasFixedTimeSlots && (
                      <div className="border-t pt-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <h4 className="font-semibold">Horarios Intensivos por Día</h4>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-orange-200">
                          <table className="w-full">
                            <thead className="bg-orange-50/50 dark:bg-orange-950/30">
                              <tr>
                                <th className="p-3 text-left text-sm font-semibold">Día</th>
                                <th className="p-3 text-left text-sm font-semibold">Entrada</th>
                                <th className="p-3 text-left text-sm font-semibold">Salida</th>
                                <th className="p-3 text-left text-sm font-semibold">Descanso</th>
                                <th className="p-3 text-right text-sm font-semibold">Horas</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100 dark:divide-orange-900">
                              {DAYS.map((day) => {
                                const isWorking =
                                  activeContract[
                                    `work${day.key.charAt(0).toUpperCase() + day.key.slice(1)}` as keyof typeof activeContract
                                  ];
                                if (!isWorking) return null;

                                const startTime = activeContract[
                                  `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}StartTime` as keyof typeof activeContract
                                ] as string | null;
                                const endTime = activeContract[
                                  `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}EndTime` as keyof typeof activeContract
                                ] as string | null;
                                const breakStart = activeContract[
                                  `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}BreakStartTime` as keyof typeof activeContract
                                ] as string | null;
                                const breakEnd = activeContract[
                                  `intensive${day.key.charAt(0).toUpperCase() + day.key.slice(1)}BreakEndTime` as keyof typeof activeContract
                                ] as string | null;
                                const hours = calculateHoursFromTimeSlot(startTime, endTime, breakStart, breakEnd);

                                return (
                                  <tr key={day.key} className="hover:bg-orange-50/30 dark:hover:bg-orange-950/20">
                                    <td className="p-3 font-medium">{day.label}</td>
                                    <td className="p-3 font-mono text-sm">{startTime ?? "--:--"}</td>
                                    <td className="p-3 font-mono text-sm">{endTime ?? "--:--"}</td>
                                    <td className="p-3 font-mono text-sm">
                                      {breakStart && breakEnd ? `${breakStart} - ${breakEnd}` : "Sin descanso"}
                                    </td>
                                    <td className="p-3 text-right font-semibold text-orange-600">
                                      {hours.toFixed(2)}h
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* FLEXIBLE Intensive Schedule Visualization (Legacy) */}
                    {activeContract.scheduleType === "FLEXIBLE" && activeContract.hasCustomWeeklyPattern && (
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
            );
          })()}
      </Tabs>
    </div>
  );
}
