"use client";

import { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, X, Briefcase, Calendar, Clock, User, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractsStore, type CreateContractData, type Contract } from "@/stores/contracts-store";

const contractSchema = z.object({
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
  grossSalary: z.number().min(0, "El salario debe ser mayor o igual a 0").optional().nullable(),
  positionId: z.string().optional(),
  departmentId: z.string().optional(),
  costCenterId: z.string().optional(),
  managerId: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

interface Position {
  id: string;
  title: string;
  level: string | null;
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
      grossSalary: undefined,
      positionId: "",
      departmentId: "",
      costCenterId: "",
      managerId: "",
    },
  });

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
          grossSalary: contract.grossSalary ?? undefined,
          positionId: contract.position?.id ?? "",
          departmentId: contract.department?.id ?? "",
          costCenterId: contract.costCenter?.id ?? "",
          managerId: contract.manager?.id ?? "",
        });
      } else {
        form.reset({
          contractType: "INDEFINIDO",
          startDate: "",
          endDate: "",
          weeklyHours: 40,
          grossSalary: undefined,
          positionId: "",
          departmentId: "",
          costCenterId: "",
          managerId: "",
        });
      }
    }
  }, [open, mode, contract, form]);

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
        setPositions(positionsData);
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
      const sharedPayload: CreateContractData = {
        contractType: data.contractType,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        weeklyHours: data.weeklyHours,
        grossSalary: data.grossSalary && data.grossSalary > 0 ? data.grossSalary : null,
        positionId: data.positionId ?? null,
        departmentId: data.departmentId ?? null,
        costCenterId: data.costCenterId ?? null,
        managerId: data.managerId ?? null,
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
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-gray-50">
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
                <div className="space-y-4 rounded-lg border bg-white p-6">
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
                              <SelectTrigger className="bg-white">
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
                                className="bg-white pl-9"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Fechas */}
                <div className="space-y-4 rounded-lg border bg-white p-6">
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
                            <Input type="date" className="bg-white" {...field} />
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
                            <Input type="date" className="bg-white" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Salario */}
                <div className="space-y-4 rounded-lg border bg-white p-6">
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
                              className="bg-white pl-8"
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
                <div className="space-y-4 rounded-lg border bg-white p-6">
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
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecciona puesto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {positions.map((position) => (
                                <SelectItem key={position.id} value={position.id}>
                                  {position.title}
                                  {position.level && (
                                    <span className="text-muted-foreground text-sm"> • {position.level}</span>
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
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecciona departamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecciona centro" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecciona responsable" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                <div className="-mx-6 -mb-6 flex justify-end gap-3 border-t bg-gray-50 px-6 py-4 pt-8">
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
