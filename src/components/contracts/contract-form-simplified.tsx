"use client";

import { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, X, Briefcase, Calendar, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeCombobox } from "@/components/ui/employee-combobox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type CreateContractData, type Contract } from "@/stores/contracts-store";

const contractSchema = z.object({
  contractType: z.enum(
    ["INDEFINIDO", "TEMPORAL", "PRACTICAS", "FORMACION", "OBRA_SERVICIO", "EVENTUAL", "INTERINIDAD"],
    {
      required_error: "Selecciona un tipo de contrato",
    },
  ),
  startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
  endDate: z.string().optional(),
  grossSalary: z.coerce.number().min(0, "El salario debe ser mayor o igual a 0").optional().nullable(),
  positionId: z.string().optional(),
  departmentId: z.string().optional(),
  costCenterId: z.string().optional(),
  managerId: z.string().optional(),
});

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

const CONTRACT_TYPES = {
  INDEFINIDO: "Indefinido",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas",
  FORMACION: "Formación",
  OBRA_SERVICIO: "Obra o Servicio",
  EVENTUAL: "Eventual",
  INTERINIDAD: "Interinidad",
} as const;

interface ContractFormSimplifiedProps {
  employeeId?: string;
  employeeName?: string;
  contract?: Contract | null;
  onSubmit: (data: CreateContractData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: CreateContractData | null;
}

const toDateInput = (value: string | null | undefined) => (value ? value.split("T")[0] : "");

const toNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export function ContractFormSimplified({
  employeeId,
  employeeName,
  contract,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
}: ContractFormSimplifiedProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const mode = contract ? "edit" : "create";

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractType: "INDEFINIDO",
      startDate: "",
      endDate: "",
      grossSalary: undefined,
      positionId: "__none__",
      departmentId: "__none__",
      costCenterId: "__none__",
      managerId: "__none__",
    },
  });

  useEffect(() => {
    loadSelectData();
    if (mode === "edit" && contract) {
      form.reset({
        contractType: contract.contractType as ContractFormData["contractType"],
        startDate: toDateInput(contract.startDate),
        endDate: toDateInput(contract.endDate) || "",
        grossSalary: toNumber(contract.grossSalary),
        positionId: contract.position?.id ?? "__none__",
        departmentId: contract.department?.id ?? "__none__",
        costCenterId: contract.costCenter?.id ?? "__none__",
        managerId: contract.manager?.id ?? "__none__",
      });
    } else if (initialData) {
      // Cargar datos guardados del wizard
      form.reset({
        contractType: initialData.contractType as ContractFormData["contractType"],
        startDate: initialData.startDate,
        endDate: initialData.endDate ?? "",
        grossSalary: initialData.grossSalary ?? undefined,
        positionId: initialData.positionId ?? "__none__",
        departmentId: initialData.departmentId ?? "__none__",
        costCenterId: initialData.costCenterId ?? "__none__",
        managerId: initialData.managerId ?? "__none__",
      });
    }
  }, [mode, contract, initialData]);

  const loadSelectData = async () => {
    setLoadingData(true);
    try {
      const [positionsRes, departmentsRes, costCentersRes] = await Promise.all([
        fetch("/api/positions", { credentials: "include" }),
        fetch("/api/departments", { credentials: "include" }),
        fetch("/api/cost-centers", { credentials: "include" }),
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
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFormSubmit = async (data: ContractFormData) => {
    const normalizeId = (value?: string | null) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length === 0 || trimmed === "__none__") {
        return null;
      }
      return trimmed;
    };

    const normalizedEndDate = data.endDate && data.endDate.trim().length > 0 ? data.endDate : null;

    const payload: CreateContractData = {
      contractType: data.contractType,
      startDate: data.startDate,
      endDate: normalizedEndDate,
      // Valores por defecto para horarios (se editarán en la página de horarios)
      weeklyHours: 40,
      workingDaysPerWeek: 5,
      grossSalary: data.grossSalary && data.grossSalary > 0 ? data.grossSalary : null,
      hasIntensiveSchedule: false,
      intensiveStartDate: null,
      intensiveEndDate: null,
      intensiveWeeklyHours: null,
      hasCustomWeeklyPattern: false,
      mondayHours: null,
      tuesdayHours: null,
      wednesdayHours: null,
      thursdayHours: null,
      fridayHours: null,
      saturdayHours: null,
      sundayHours: null,
      intensiveMondayHours: null,
      intensiveTuesdayHours: null,
      intensiveWednesdayHours: null,
      intensiveThursdayHours: null,
      intensiveFridayHours: null,
      intensiveSaturdayHours: null,
      intensiveSundayHours: null,
      positionId: normalizeId(data.positionId),
      departmentId: normalizeId(data.departmentId),
      costCenterId: normalizeId(data.costCenterId),
      managerId: normalizeId(data.managerId),
    };

    await onSubmit(payload);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground ml-2">Cargando datos...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Información del Contrato */}
        <Card className="rounded-lg border shadow-xs">
          <CardContent className="space-y-4 p-6">
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
            </div>
          </CardContent>
        </Card>

        {/* Fechas */}
        <Card className="rounded-lg border shadow-xs">
          <CardContent className="space-y-4 p-6">
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
          </CardContent>
        </Card>

        {/* Salario */}
        <Card className="rounded-lg border shadow-xs">
          <CardContent className="space-y-4 p-6">
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
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : Number(value));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Organización */}
        <Card className="rounded-lg border shadow-xs">
          <CardContent className="space-y-4 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="text-primary h-5 w-5" />
              <Label className="text-lg font-semibold">Organización</Label>
            </div>

            <div className="flex flex-col gap-4">
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
                            {center.code && <span className="text-muted-foreground text-sm"> ({center.code})</span>}
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
                    <FormControl>
                      <EmployeeCombobox
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecciona responsable"
                        emptyText="Sin responsable asignado"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="bg-muted/30 flex justify-end gap-3 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === "edit" ? "Guardar cambios" : "Crear Contrato"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
