"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getCostCenters, type CostCenterListItem } from "@/server/actions/cost-centers";
import { getDepartments, type DepartmentListItem } from "@/server/actions/departments";
import { updateTeam, type TeamDetail } from "@/server/actions/teams";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().optional(),
  description: z.string().optional(),
  costCenterId: z.string().min(1, "El centro de coste es obligatorio"),
  departmentId: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTeamDialogProps {
  team: TeamDetail;
  onTeamUpdated?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditTeamDialog({
  team,
  onTeamUpdated,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EditTeamDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Usar estado controlado si se proporcionan las props, sino estado interno
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenterListItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentListItem[]>([]);
  const [isCostCentersLoading, setIsCostCentersLoading] = useState(true);
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(true);
  const [costCenterComboboxOpen, setCostCenterComboboxOpen] = useState(false);
  const [departmentComboboxOpen, setDepartmentComboboxOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team.name,
      code: team.code ?? "",
      description: team.description ?? "",
      costCenterId: team.costCenterId ?? "",
      departmentId: team.departmentId ?? "",
      isActive: team.isActive,
    },
  });

  // Cargar datos al abrir el dialog
  useEffect(() => {
    if (open) {
      loadCostCenters();
      loadDepartments();
    }
  }, [open]);

  // Filtrar departamentos cuando cambia el centro de coste
  const selectedCostCenterId = form.watch("costCenterId");
  const filteredDepartments = departments.filter((dept) => dept.costCenterId === selectedCostCenterId);

  // Limpiar departamento si no pertenece al centro seleccionado
  useEffect(() => {
    const currentDepartmentId = form.getValues("departmentId");
    if (currentDepartmentId) {
      const deptBelongsToCostCenter = filteredDepartments.some((d) => d.id === currentDepartmentId);
      if (!deptBelongsToCostCenter) {
        form.setValue("departmentId", "");
      }
    }
  }, [selectedCostCenterId, filteredDepartments, form]);

  async function loadCostCenters() {
    setIsCostCentersLoading(true);
    try {
      const { success, costCenters: data } = await getCostCenters();
      if (success && data) {
        setCostCenters(data);
      }
    } finally {
      setIsCostCentersLoading(false);
    }
  }

  async function loadDepartments() {
    setIsDepartmentsLoading(true);
    try {
      const { success, departments: data } = await getDepartments();
      if (success && data) {
        setDepartments(data);
      }
    } finally {
      setIsDepartmentsLoading(false);
    }
  }

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const { success, error } = await updateTeam(team.id, {
        name: data.name,
        code: data.code ?? null,
        description: data.description ?? null,
        costCenterId: data.costCenterId,
        departmentId: data.departmentId ?? null,
        isActive: data.isActive,
      });

      if (success) {
        setOpen(false);
        onTeamUpdated?.();
      } else {
        form.setError("root", {
          message: error ?? "Error al actualizar equipo",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Equipo</DialogTitle>
          <DialogDescription>Modifica la información del equipo &quot;{team.name}&quot;.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Equipo de Ventas A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Código */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: VEN-A" {...field} />
                  </FormControl>
                  <FormDescription>Código único para identificar el equipo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Centro de Coste */}
            <FormField
              control={form.control}
              name="costCenterId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Centro de Coste *</FormLabel>
                  <Popover open={costCenterComboboxOpen} onOpenChange={setCostCenterComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value
                            ? costCenters.find((center) => center.id === field.value)?.name
                            : "Seleccionar centro de coste"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar centro..." />
                        <CommandList>
                          <CommandEmpty>
                            {isCostCentersLoading ? "Cargando..." : "No se encontraron centros"}
                          </CommandEmpty>
                          <CommandGroup>
                            {costCenters.map((center) => (
                              <CommandItem
                                value={center.name}
                                key={center.id}
                                onSelect={() => {
                                  form.setValue("costCenterId", center.id);
                                  setCostCenterComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    center.id === field.value ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{center.name}</span>
                                  {center.code && <span className="text-muted-foreground text-xs">{center.code}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Centro al que pertenece el equipo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Departamento (opcional) */}
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Departamento (opcional)</FormLabel>
                  <Popover open={departmentComboboxOpen} onOpenChange={setDepartmentComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={!selectedCostCenterId || filteredDepartments.length === 0}
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value
                            ? filteredDepartments.find((dept) => dept.id === field.value)?.name
                            : filteredDepartments.length === 0
                              ? "No hay departamentos en este centro"
                              : "Seleccionar departamento"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar departamento..." />
                        <CommandList>
                          <CommandEmpty>
                            {isDepartmentsLoading ? "Cargando..." : "No se encontraron departamentos"}
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__none__"
                              onSelect={() => {
                                form.setValue("departmentId", "");
                                setDepartmentComboboxOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                              <span className="text-muted-foreground">Sin departamento (transversal)</span>
                            </CommandItem>
                            {filteredDepartments.map((dept) => (
                              <CommandItem
                                value={dept.name}
                                key={dept.id}
                                onSelect={() => {
                                  form.setValue("departmentId", dept.id);
                                  setDepartmentComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn("mr-2 h-4 w-4", dept.id === field.value ? "opacity-100" : "opacity-0")}
                                />
                                <span>{dept.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Departamento del centro de coste. Si no seleccionas ninguno, el equipo será transversal.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción del equipo..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Estado activo</FormLabel>
                    <FormDescription>Los equipos inactivos no aparecerán en las listas de selección.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Error general */}
            {form.formState.errors.root && (
              <div className="text-destructive text-sm">{form.formState.errors.root.message}</div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
