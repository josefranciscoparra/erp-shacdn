"use client";

import { useState, useEffect, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, X, Briefcase, Calendar, Clock, User, Building2, AlertTriangle, Sun } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractsStore, type CreateContractData, type Contract } from "@/stores/contracts-store";

// Regex para validar formato MM-DD (mes: 01-12, día: 01-31)
const MM_DD_REGEX = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

// Función para validar que el día sea válido para el mes dado
const isValidDayForMonth = (mmdd: string): boolean => {
  if (!mmdd || mmdd.trim().length === 0) return true; // Opcional
  const [month, day] = mmdd.split("-").map(Number);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
};

const contractSchema = z
  .object({
    contractType: z.enum(
      ["INDEFINIDO", "TEMPORAL", "PRACTICAS", "FORMACION", "OBRA_SERVICIO", "EVENTUAL", "INTERINIDAD"],
      {
        required_error: "Selecciona un tipo de contrato",
      },
    ),
    startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
    endDate: z.string().optional(),
    weeklyHours: z
      .number()
      .min(1, "Las horas semanales deben ser mayor a 0")
      .max(60, "Las horas semanales no pueden exceder 60"),
    workingDaysPerWeek: z
      .number()
      .min(0.5, "Los días laborables deben ser al menos 0.5")
      .max(7, "Los días laborables no pueden exceder 7")
      .optional()
      .nullable(),
    grossSalary: z.number().min(0, "El salario debe ser mayor o igual a 0").optional().nullable(),
    hasIntensiveSchedule: z.boolean().optional().nullable(),
    intensiveStartDate: z
      .string()
      .regex(MM_DD_REGEX, "Formato inválido. Usa MM-DD (ej: 06-15)")
      .refine(isValidDayForMonth, "Día inválido para el mes")
      .optional()
      .or(z.literal("")),
    intensiveEndDate: z
      .string()
      .regex(MM_DD_REGEX, "Formato inválido. Usa MM-DD (ej: 09-15)")
      .refine(isValidDayForMonth, "Día inválido para el mes")
      .optional()
      .or(z.literal("")),
    intensiveWeeklyHours: z
      .number()
      .min(1, "Las horas semanales deben ser mayor a 0")
      .max(60, "Las horas semanales no pueden exceder 60")
      .optional()
      .nullable(),
    positionId: z.string().optional(),
    departmentId: z.string().optional(),
    costCenterId: z.string().optional(),
    managerId: z.string().optional(),
  })
  .refine(
    (data) => {
      // Si tiene jornada intensiva, los campos deben estar completos
      if (data.hasIntensiveSchedule) {
        return (
          data.intensiveStartDate &&
          data.intensiveStartDate.trim().length > 0 &&
          data.intensiveEndDate &&
          data.intensiveEndDate.trim().length > 0 &&
          data.intensiveWeeklyHours !== null &&
          data.intensiveWeeklyHours !== undefined
        );
      }
      return true;
    },
    {
      message: "Si activas la jornada intensiva, debes proporcionar fecha de inicio, fecha de fin y horas semanales",
      path: ["hasIntensiveSchedule"],
    },
  );

type ContractFormData = z.infer<typeof contractSchema>;

interface PositionLevelSummary {
  id: string;
  name: string | null;
  order: number | null;
}

interface Position {
  id: string;
  title: string;
  level: PositionLevelSummary | null;
  description: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  costCenter: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

interface CostCenter {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  timezone: string;
}

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  fullName: string;
  employeeNumber: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  role?: string | null;
}

const CONTRACT_TYPES = {
  INDEFINIDO: "Indefinido",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas",
  FORMACION: "Formación",
  OBRA_SERVICIO: "Obra o Servicio",
  EVENTUAL: "Eventual",
  INTERINIDAD: "Interinidad",
} as const;

const MONTHS = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const getDaysInMonth = (month: string): number => {
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthNum = parseInt(month, 10);
  return monthNum >= 1 && monthNum <= 12 ? daysInMonth[monthNum - 1] : 31;
};

interface ContractSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  mode?: "create" | "edit";
  contract?: Contract | null;
  onSuccess?: () => void;
}

const toDateInput = (value: string | null | undefined) => (value ? value.split("T")[0] : "");

export function ContractSheet({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  mode = "create",
  contract,
  onSuccess,
}: ContractSheetProps) {
  const { createContract, updateContract, isCreating, isUpdating } = useContractsStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractType: "INDEFINIDO",
      startDate: "",
      endDate: "",
      weeklyHours: 40,
      workingDaysPerWeek: 5,
      grossSalary: undefined,
      hasIntensiveSchedule: false,
      intensiveStartDate: "",
      intensiveEndDate: "",
      intensiveWeeklyHours: undefined,
      positionId: "__none__",
      departmentId: "__none__",
      costCenterId: "__none__",
      managerId: "__none__",
    },
  });

  // Estados para selectores de fecha intensiva
  const [intensiveStartMonth, setIntensiveStartMonth] = useState("");
  const [intensiveStartDay, setIntensiveStartDay] = useState("");
  const [intensiveEndMonth, setIntensiveEndMonth] = useState("");
  const [intensiveEndDay, setIntensiveEndDay] = useState("");

  // Calcular horas diarias y nivel de alerta
  const weeklyHours = form.watch("weeklyHours");
  const workingDaysPerWeek = form.watch("workingDaysPerWeek");
  const hasIntensiveSchedule = form.watch("hasIntensiveSchedule");
  const intensiveWeeklyHours = form.watch("intensiveWeeklyHours");

  const dailyHoursInfo = useMemo(() => {
    if (!weeklyHours || !workingDaysPerWeek || workingDaysPerWeek === 0) {
      return { dailyHours: 0, alertLevel: "none" as const };
    }

    const dailyHours = weeklyHours / workingDaysPerWeek;

    if (dailyHours > 12) {
      return { dailyHours, alertLevel: "danger" as const };
    } else if (dailyHours > 10) {
      return { dailyHours, alertLevel: "warning" as const };
    } else {
      return { dailyHours, alertLevel: "none" as const };
    }
  }, [weeklyHours, workingDaysPerWeek]);

  const intensiveDailyHoursInfo = useMemo(() => {
    if (!hasIntensiveSchedule || !intensiveWeeklyHours || !workingDaysPerWeek || workingDaysPerWeek === 0) {
      return { dailyHours: 0, alertLevel: "none" as const };
    }

    const dailyHours = intensiveWeeklyHours / workingDaysPerWeek;

    if (dailyHours > 12) {
      return { dailyHours, alertLevel: "danger" as const };
    } else if (dailyHours > 10) {
      return { dailyHours, alertLevel: "warning" as const };
    } else {
      return { dailyHours, alertLevel: "none" as const };
    }
  }, [hasIntensiveSchedule, intensiveWeeklyHours, workingDaysPerWeek]);

  // Cargar datos de los selects
  useEffect(() => {
    if (open) {
      loadSelectData();
      if (mode === "edit" && contract) {
        form.reset({
          contractType: contract.contractType as ContractFormData["contractType"],
          startDate: toDateInput(contract.startDate),
          endDate: toDateInput(contract.endDate) || "",
          weeklyHours: contract.weeklyHours,
          workingDaysPerWeek: contract.workingDaysPerWeek ?? 5,
          grossSalary: contract.grossSalary ?? undefined,
          hasIntensiveSchedule: contract.hasIntensiveSchedule ?? false,
          // Las fechas intensivas ya están en formato MM-DD
          intensiveStartDate: contract.intensiveStartDate ?? "",
          intensiveEndDate: contract.intensiveEndDate ?? "",
          intensiveWeeklyHours: contract.intensiveWeeklyHours ?? undefined,
          positionId: contract.position?.id ?? "__none__",
          departmentId: contract.department?.id ?? "__none__",
          costCenterId: contract.costCenter?.id ?? "__none__",
          managerId: contract.manager?.id ?? "__none__",
        });

        // Parsear fechas intensivas para los selectores
        if (contract.intensiveStartDate) {
          const [month, day] = contract.intensiveStartDate.split("-");
          setIntensiveStartMonth(month);
          setIntensiveStartDay(day);
        } else {
          setIntensiveStartMonth("");
          setIntensiveStartDay("");
        }

        if (contract.intensiveEndDate) {
          const [month, day] = contract.intensiveEndDate.split("-");
          setIntensiveEndMonth(month);
          setIntensiveEndDay(day);
        } else {
          setIntensiveEndMonth("");
          setIntensiveEndDay("");
        }
      } else {
        form.reset({
          contractType: "INDEFINIDO",
          startDate: "",
          endDate: "",
          weeklyHours: 40,
          workingDaysPerWeek: 5,
          grossSalary: undefined,
          hasIntensiveSchedule: false,
          intensiveStartDate: "",
          intensiveEndDate: "",
          intensiveWeeklyHours: undefined,
          positionId: "__none__",
          departmentId: "__none__",
          costCenterId: "__none__",
          managerId: "__none__",
        });

        setIntensiveStartMonth("");
        setIntensiveStartDay("");
        setIntensiveEndMonth("");
        setIntensiveEndDay("");
      }
    }
  }, [open, mode, contract, form]);

  // Sincronizar selectores de fecha de inicio con el campo del formulario
  useEffect(() => {
    if (intensiveStartMonth && intensiveStartDay) {
      const mmdd = `${intensiveStartMonth}-${intensiveStartDay}`;
      form.setValue("intensiveStartDate", mmdd, { shouldValidate: true });
    } else if (!intensiveStartMonth && !intensiveStartDay) {
      form.setValue("intensiveStartDate", "", { shouldValidate: false });
    }
  }, [intensiveStartMonth, intensiveStartDay, form]);

  // Sincronizar selectores de fecha de fin con el campo del formulario
  useEffect(() => {
    if (intensiveEndMonth && intensiveEndDay) {
      const mmdd = `${intensiveEndMonth}-${intensiveEndDay}`;
      form.setValue("intensiveEndDate", mmdd, { shouldValidate: true });
    } else if (!intensiveEndMonth && !intensiveEndDay) {
      form.setValue("intensiveEndDate", "", { shouldValidate: false });
    }
  }, [intensiveEndMonth, intensiveEndDay, form]);

  const loadSelectData = async () => {
    setLoadingData(true);
    try {
      const [positionsRes, departmentsRes, costCentersRes, managersRes] = await Promise.all([
        fetch("/api/positions", { credentials: "include" }),
        fetch("/api/departments", { credentials: "include" }),
        fetch("/api/cost-centers", { credentials: "include" }),
        fetch("/api/employees/managers", { credentials: "include" }),
      ]);

      if (positionsRes.ok) {
        const positionsData = await positionsRes.json();
        setPositions(
          positionsData.map((position: any) => ({
            id: position.id,
            title: position.title,
            description: position.description ?? null,
            level: position.level
              ? {
                  id: position.level.id,
                  name: position.level.name ?? null,
                  order: position.level.order ?? null,
                }
              : null,
          })),
        );
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        setDepartments(departmentsData);
      }

      if (costCentersRes.ok) {
        const costCentersData = await costCentersRes.json();
        setCostCenters(costCentersData);
      }

      if (managersRes.ok) {
        const managersData = await managersRes.json();
        setManagers(managersData);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar datos del formulario");
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: ContractFormData) => {
    try {
      const normalizeId = (value?: string | null) => {
        if (!value) return null;
        const trimmed = value.trim();
        if (trimmed.length === 0 || trimmed === "__none__") {
          return null;
        }
        return trimmed;
      };
      const normalizedEndDate = data.endDate && data.endDate.trim().length > 0 ? data.endDate : null;
      // Las fechas intensivas ya están en formato MM-DD, solo las normalizamos
      const normalizedIntensiveStartDate =
        data.intensiveStartDate && data.intensiveStartDate.trim().length > 0 ? data.intensiveStartDate.trim() : null;
      const normalizedIntensiveEndDate =
        data.intensiveEndDate && data.intensiveEndDate.trim().length > 0 ? data.intensiveEndDate.trim() : null;

      const sharedPayload: CreateContractData = {
        contractType: data.contractType,
        startDate: data.startDate,
        endDate: normalizedEndDate,
        weeklyHours: data.weeklyHours,
        workingDaysPerWeek: data.workingDaysPerWeek ?? 5,
        grossSalary: data.grossSalary && data.grossSalary > 0 ? data.grossSalary : null,
        hasIntensiveSchedule: data.hasIntensiveSchedule ?? false,
        intensiveStartDate: normalizedIntensiveStartDate,
        intensiveEndDate: normalizedIntensiveEndDate,
        intensiveWeeklyHours: data.intensiveWeeklyHours,
        positionId: normalizeId(data.positionId),
        departmentId: normalizeId(data.departmentId),
        costCenterId: normalizeId(data.costCenterId),
        managerId: normalizeId(data.managerId),
      };

      if (mode === "edit" && contract) {
        await updateContract(contract.id, sharedPayload);
        toast.success("Contrato actualizado", {
          description: `Se guardaron los cambios del contrato de ${employeeName}`,
        });
      } else {
        await createContract(employeeId, sharedPayload);
        toast.success("Contrato creado exitosamente", {
          description: `Se ha creado el contrato ${CONTRACT_TYPES[data.contractType]} para ${employeeName}`,
        });
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Error al guardar contrato", {
        description: error.message ?? "Ocurrió un error inesperado",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-3">
            <div className="from-primary/10 to-primary/5 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-t shadow-sm">
              <Briefcase className="text-primary h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-semibold">
                {mode === "edit" ? "Editar contrato" : "Nuevo Contrato"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-base">
                {mode === "edit" ? (
                  "Actualiza los datos del contrato seleccionado"
                ) : (
                  <>
                    Crear contrato laboral para <span className="text-foreground font-medium">{employeeName}</span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              <span className="text-muted-foreground ml-2">Cargando datos...</span>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Información del Contrato */}
                <div className="bg-card space-y-4 rounded-lg border p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Briefcase className="text-primary h-5 w-5" />
                    <Label className="text-lg font-semibold">Información del Contrato</Label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Contrato *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(CONTRACT_TYPES).map(([key, label]) => (
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
                      name="weeklyHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horas Semanales *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Clock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                              <Input
                                type="number"
                                min="1"
                                max="60"
                                step="0.5"
                                placeholder="40"
                                className="pl-9"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    field.onChange(undefined);
                                  } else {
                                    field.onChange(Number(value));
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="workingDaysPerWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Días laborables por semana *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                              <Input
                                type="number"
                                min="0.5"
                                max="7"
                                step="0.5"
                                placeholder="5"
                                className="pl-9"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    field.onChange(undefined);
                                  } else {
                                    field.onChange(Number(value));
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Cálculo y avisos de horas diarias */}
                  {dailyHoursInfo.dailyHours > 0 && (
                    <div className="space-y-3">
                      <div className="bg-muted/30 rounded-md border p-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="text-muted-foreground h-4 w-4" />
                            <span className="text-muted-foreground">Jornada diaria:</span>
                          </div>
                          <span className="text-primary text-base font-semibold">
                            {dailyHoursInfo.dailyHours.toFixed(2)} horas
                          </span>
                        </div>
                      </div>

                      {dailyHoursInfo.alertLevel === "warning" && (
                        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800 dark:text-orange-200">
                            ⚠️ La jornada diaria de {dailyHoursInfo.dailyHours.toFixed(2)} horas supera las 10 horas
                            recomendadas.
                          </AlertDescription>
                        </Alert>
                      )}

                      {dailyHoursInfo.alertLevel === "danger" && (
                        <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800 dark:text-red-200">
                            🚨 La jornada diaria de {dailyHoursInfo.dailyHours.toFixed(2)} horas supera las 12 horas.
                            Verifica que esto sea correcto.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Jornada Intensiva */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Sun className="text-primary h-5 w-5" />
                      <Label className="text-base font-semibold">Jornada Intensiva (ej: horario de verano)</Label>
                    </div>

                    <FormField
                      control={form.control}
                      name="hasIntensiveSchedule"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Tiene jornada intensiva</FormLabel>
                            <p className="text-muted-foreground text-sm">
                              Activa si el trabajador tiene un horario especial durante ciertos períodos (ej: verano)
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    {hasIntensiveSchedule && (
                      <div className="bg-muted/20 space-y-4 rounded-md border p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Fecha de Inicio */}
                          <div className="space-y-2">
                            <FormLabel>Fecha de Inicio *</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={intensiveStartMonth} onValueChange={setIntensiveStartMonth}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MONTHS.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={intensiveStartDay}
                                onValueChange={setIntensiveStartDay}
                                disabled={!intensiveStartMonth}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Día" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: getDaysInMonth(intensiveStartMonth) }, (_, i) => {
                                    const day = String(i + 1).padStart(2, "0");
                                    return (
                                      <SelectItem key={day} value={day}>
                                        {day}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-muted-foreground text-xs">Selecciona mes y día. Ejemplo: Junio - 15</p>
                            {form.formState.errors.intensiveStartDate && (
                              <p className="text-destructive text-sm font-medium">
                                {form.formState.errors.intensiveStartDate.message}
                              </p>
                            )}
                          </div>

                          {/* Fecha de Fin */}
                          <div className="space-y-2">
                            <FormLabel>Fecha de Fin *</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={intensiveEndMonth} onValueChange={setIntensiveEndMonth}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MONTHS.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={intensiveEndDay}
                                onValueChange={setIntensiveEndDay}
                                disabled={!intensiveEndMonth}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Día" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: getDaysInMonth(intensiveEndMonth) }, (_, i) => {
                                    const day = String(i + 1).padStart(2, "0");
                                    return (
                                      <SelectItem key={day} value={day}>
                                        {day}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-muted-foreground text-xs">
                              Selecciona mes y día. Ejemplo: Septiembre - 15
                            </p>
                            {form.formState.errors.intensiveEndDate && (
                              <p className="text-destructive text-sm font-medium">
                                {form.formState.errors.intensiveEndDate.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="intensiveWeeklyHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horas Semanales *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Clock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                                  <Input
                                    type="number"
                                    min="1"
                                    max="60"
                                    step="0.5"
                                    placeholder="35"
                                    className="pl-9"
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === "") {
                                        field.onChange(undefined);
                                      } else {
                                        field.onChange(Number(value));
                                      }
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Cálculo y avisos de horas diarias intensivas */}
                        {intensiveDailyHoursInfo.dailyHours > 0 && (
                          <div className="space-y-3">
                            <div className="bg-muted/30 rounded-md border p-3">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Sun className="text-muted-foreground h-4 w-4" />
                                  <span className="text-muted-foreground">Jornada diaria intensiva:</span>
                                </div>
                                <span className="text-primary text-base font-semibold">
                                  {intensiveDailyHoursInfo.dailyHours.toFixed(2)} horas
                                </span>
                              </div>
                            </div>

                            {intensiveDailyHoursInfo.alertLevel === "warning" && (
                              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-800 dark:text-orange-200">
                                  ⚠️ La jornada diaria intensiva de {intensiveDailyHoursInfo.dailyHours.toFixed(2)}{" "}
                                  horas supera las 10 horas recomendadas.
                                </AlertDescription>
                              </Alert>
                            )}

                            {intensiveDailyHoursInfo.alertLevel === "danger" && (
                              <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800 dark:text-red-200">
                                  🚨 La jornada diaria intensiva de {intensiveDailyHoursInfo.dailyHours.toFixed(2)}{" "}
                                  horas supera las 12 horas. Verifica que esto sea correcto.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fechas */}
                <div className="bg-card space-y-4 rounded-lg border p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Calendar className="text-primary h-5 w-5" />
                    <Label className="text-lg font-semibold">Período del Contrato</Label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Inicio *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Fin (opcional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Salario */}
                <div className="bg-card space-y-4 rounded-lg border p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-primary text-lg font-bold">€</span>
                    <Label className="text-lg font-semibold">Información Salarial</Label>
                  </div>

                  <FormField
                    control={form.control}
                    name="grossSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salario Bruto Anual (€)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="text-muted-foreground absolute top-3 left-3 text-sm font-medium">€</span>
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              placeholder="30000"
                              className="pl-8"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? undefined : Number(value));
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Organización */}
                <div className="bg-card space-y-4 rounded-lg border p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Building2 className="text-primary h-5 w-5" />
                    <Label className="text-lg font-semibold">Organización</Label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="positionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puesto</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona puesto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Sin puesto asignado</SelectItem>
                              {positions.map((position) => (
                                <SelectItem key={position.id} value={position.id}>
                                  {position.title}
                                  {position.level?.name && (
                                    <span className="text-muted-foreground text-sm"> • {position.level.name}</span>
                                  )}
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
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona departamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Sin departamento asignado</SelectItem>
                              {departments.map((department) => (
                                <SelectItem key={department.id} value={department.id}>
                                  {department.name}
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
                      name="costCenterId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Centro de Coste</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona centro" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Sin centro asignado</SelectItem>
                              {costCenters.map((center) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {center.name}
                                  {center.code && (
                                    <span className="text-muted-foreground text-sm"> ({center.code})</span>
                                  )}
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
                      name="managerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsable</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona responsable" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Sin responsable asignado</SelectItem>
                              {managers.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.fullName}
                                  {manager.position && (
                                    <span className="text-muted-foreground text-sm"> • {manager.position}</span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="bg-muted/30 -mx-6 -mb-6 flex justify-end gap-3 border-t px-6 py-4 pt-8">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={mode === "edit" ? isUpdating : isCreating}>
                    {mode === "edit" ? (
                      isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar cambios
                        </>
                      )
                    ) : isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Crear Contrato
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
