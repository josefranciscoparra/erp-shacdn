"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getCostCenters, type CostCenterListItem } from "@/server/actions/cost-centers";
import { createTeam } from "@/server/actions/teams";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().optional(),
  description: z.string().optional(),
  costCenterId: z.string().min(1, "El centro de coste es obligatorio"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTeamDialogProps {
  onTeamCreated?: () => void;
}

export function CreateTeamDialog({ onTeamCreated }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenterListItem[]>([]);
  const [isCostCentersLoading, setIsCostCentersLoading] = useState(true);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      costCenterId: "",
    },
  });

  // Cargar centros de coste al abrir el dialog
  useEffect(() => {
    if (open) {
      loadCostCenters();
    }
  }, [open]);

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

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const { success, error } = await createTeam({
        name: data.name,
        code: data.code ?? null,
        description: data.description ?? null,
        costCenterId: data.costCenterId,
      });

      if (success) {
        form.reset();
        setOpen(false);
        onTeamCreated?.();
      } else {
        form.setError("root", {
          message: error ?? "Error al crear equipo",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Equipo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Equipo</DialogTitle>
          <DialogDescription>Crea un equipo para organizar empleados dentro de un centro de coste.</DialogDescription>
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
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
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
                                  setComboboxOpen(false);
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
                  <FormDescription>Centro al que pertenecerá el equipo</FormDescription>
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

            {/* Error general */}
            {form.formState.errors.root && (
              <div className="text-destructive text-sm">{form.formState.errors.root.message}</div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creando..." : "Crear Equipo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
