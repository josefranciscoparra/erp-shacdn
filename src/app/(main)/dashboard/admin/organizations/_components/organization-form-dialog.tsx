"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { HierarchyType } from "@prisma/client";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { features } from "@/config/features";
import { generateOrganizationPrefix } from "@/services/employees";
import { createOrganizationSchema, type CreateOrganizationInput } from "@/validators/organization";

export type OrganizationFormValues = CreateOrganizationInput;

// Constantes para límites de storage
const MIN_STORAGE_GB = 0.002; // 2MB en GB (temporal para testing)
const MAX_STORAGE_GB = 100; // 100GB
const GB_TO_BYTES = 1024 * 1024 * 1024;

/**
 * Formatea bytes a formato legible
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < GB_TO_BYTES) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / GB_TO_BYTES).toFixed(2)} GB`;
}

interface OrganizationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrganizationFormValues & { storageLimitBytes?: number }) => Promise<void>;
  isSubmitting: boolean;
  initialValues?: {
    name: string;
    vat: string | null;
    active: boolean;
    hierarchyType?: HierarchyType;
    employeeNumberPrefix?: string | null;
    allowedEmailDomains?: string[];
    storageLimitBytes?: number;
    storageUsedBytes?: number;
    storageReservedBytes?: number;
  } | null;
  mode: "create" | "edit";
}

export function OrganizationFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialValues,
  mode,
}: OrganizationFormDialogProps) {
  const [emailDomains, setEmailDomains] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [storageLimitGB, setStorageLimitGB] = useState<number>(1); // Default 1GB

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      vat: "",
      active: true,
      hierarchyType: HierarchyType.DEPARTMENTAL,
      employeeNumberPrefix: "",
      allowedEmailDomains: [],
    },
  });

  // Generar prefijo automático cuando cambia el nombre
  const organizationName = form.watch("name");

  useEffect(() => {
    if (mode === "create" && organizationName && !form.getValues("employeeNumberPrefix")) {
      const generatedPrefix = generateOrganizationPrefix(organizationName);
      form.setValue("employeeNumberPrefix", generatedPrefix);
    }
  }, [organizationName, mode, form]);

  useEffect(() => {
    if (open) {
      form.reset({
        name: initialValues?.name ?? "",
        vat: initialValues?.vat ?? "",
        active: initialValues?.active ?? true,
        hierarchyType: initialValues?.hierarchyType ?? HierarchyType.DEPARTMENTAL,
        employeeNumberPrefix: initialValues?.employeeNumberPrefix ?? "",
        allowedEmailDomains: initialValues?.allowedEmailDomains ?? [],
      });
      setEmailDomains(initialValues?.allowedEmailDomains ?? []);
      setEmailInput("");
      // Convertir bytes a GB para el input
      const limitBytes = initialValues?.storageLimitBytes ?? GB_TO_BYTES; // Default 1GB
      setStorageLimitGB(Number((limitBytes / GB_TO_BYTES).toFixed(2)));
    }
  }, [open, initialValues, form]);

  const handleSubmit = async (values: OrganizationFormValues) => {
    // Asegurar que los dominios de email estén sincronizados
    const finalValues = {
      ...values,
      allowedEmailDomains: emailDomains,
      // Solo incluir el límite de storage en modo edit
      ...(mode === "edit" ? { storageLimitBytes: Math.round(storageLimitGB * GB_TO_BYTES) } : {}),
    };
    await onSubmit(finalValues);
  };

  // Calcular uso actual para mostrar al usuario
  const currentUsageBytes = (initialValues?.storageUsedBytes ?? 0) + (initialValues?.storageReservedBytes ?? 0);
  const minAllowedGB = Math.max(MIN_STORAGE_GB, currentUsageBytes / GB_TO_BYTES);

  const addEmailDomain = () => {
    const domain = emailInput.trim().toLowerCase().replace(/^@/, "");
    if (domain && !emailDomains.includes(domain)) {
      const newDomains = [...emailDomains, domain];
      setEmailDomains(newDomains);
      form.setValue("allowedEmailDomains", newDomains);
      setEmailInput("");
    }
  };

  const removeEmailDomain = (domain: string) => {
    const newDomains = emailDomains.filter((d) => d !== domain);
    setEmailDomains(newDomains);
    form.setValue("allowedEmailDomains", newDomains);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmailDomain();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nueva organización" : "Editar organización"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Crea una nueva organización para gestionar sus empleados y configuraciones."
              : "Actualiza la información de la organización seleccionada."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Introduce el nombre legal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIF/CIF</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. B12345678" value={field.value ?? ""} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {features.emailDomainEnforcement && (
              <>
                <FormField
                  control={form.control}
                  name="employeeNumberPrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefijo de empleados</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. TMNW, ACME"
                          maxLength={4}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Prefijo para números de empleado (ej: TMNW00001). Se genera automáticamente desde el nombre.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Dominios de email permitidos</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej. empresa.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <Button type="button" variant="outline" onClick={addEmailDomain}>
                      Añadir
                    </Button>
                  </div>
                  {emailDomains.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {emailDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="gap-1">
                          {domain}
                          <button
                            type="button"
                            onClick={() => removeEmailDomain(domain)}
                            className="hover:text-destructive ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm">
                    Los empleados solo podrán registrarse con emails de estos dominios.
                  </p>
                </div>
              </>
            )}

            {mode === "create" && (
              <FormField
                control={form.control}
                name="hierarchyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de jerarquía</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo de estructura" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={HierarchyType.FLAT}>
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium">Plana</span>
                            <span className="text-muted-foreground text-xs">Sin jerarquía, equipos horizontales</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={HierarchyType.DEPARTMENTAL}>
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium">Por Departamentos</span>
                            <span className="text-muted-foreground text-xs">Managers por departamento + empleados</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={HierarchyType.HIERARCHICAL}>
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium">Jerárquica Completa</span>
                            <span className="text-muted-foreground text-xs">
                              CEO → Directores → Managers → Empleados
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Define la estructura organizacional (inmutable después de crear).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode === "edit" && (
              <div className="space-y-2">
                <FormLabel>Límite de almacenamiento</FormLabel>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={minAllowedGB}
                    max={MAX_STORAGE_GB}
                    step={0.1}
                    value={storageLimitGB}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setStorageLimitGB(Math.max(minAllowedGB, Math.min(MAX_STORAGE_GB, value)));
                      }
                    }}
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm">GB</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Uso actual: {formatBytes(initialValues?.storageUsedBytes ?? 0)}
                  {(initialValues?.storageReservedBytes ?? 0) > 0 && (
                    <span className="text-amber-600">
                      {" "}
                      (+{formatBytes(initialValues?.storageReservedBytes ?? 0)} reservado)
                    </span>
                  )}
                  {" / "}Límite: {formatBytes(storageLimitGB * GB_TO_BYTES)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Rango permitido: 100MB - 100GB. No puede ser menor al uso actual.
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <FormLabel className="text-base">Organización activa</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Determina si esta organización puede ser utilizada en el sistema.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : mode === "create" ? "Crear" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
