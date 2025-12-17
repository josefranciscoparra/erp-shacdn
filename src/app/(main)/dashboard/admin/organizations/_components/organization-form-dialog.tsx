"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { HierarchyType } from "@prisma/client";
import { Building2, Globe, HardDrive, Settings2, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { features } from "@/config/features";
import { generateOrganizationPrefix } from "@/services/employees";
import { createOrganizationSchema, type CreateOrganizationInput } from "@/validators/organization";

export type OrganizationFormValues = CreateOrganizationInput;

// Constantes para límites de storage
const MIN_STORAGE_GB = 0.002; // 2MB en GB (temporal para testing)
const MAX_STORAGE_GB = 100; // 100GB
const GB_TO_BYTES = 1024 * 1024 * 1024;

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
  const [storageLimitGB, setStorageLimitGB] = useState<number>(1);
  const [activeTab, setActiveTab] = useState("general");

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

  const organizationName = form.watch("name");

  useEffect(() => {
    if (mode === "create" && organizationName && !form.getValues("employeeNumberPrefix")) {
      const generatedPrefix = generateOrganizationPrefix(organizationName);
      form.setValue("employeeNumberPrefix", generatedPrefix);
    }
  }, [organizationName, mode, form]);

  useEffect(() => {
    if (open) {
      setActiveTab("general");
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
      const limitBytes = initialValues?.storageLimitBytes ?? GB_TO_BYTES;
      setStorageLimitGB(Number((limitBytes / GB_TO_BYTES).toFixed(2)));
    }
  }, [open, initialValues, form]);

  const handleSubmit = async (values: OrganizationFormValues) => {
    const finalValues = {
      ...values,
      allowedEmailDomains: emailDomains,
      ...(mode === "edit" ? { storageLimitBytes: Math.round(storageLimitGB * GB_TO_BYTES) } : {}),
    };
    await onSubmit(finalValues);
  };

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
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            {mode === "create" ? "Nueva Organización" : "Editar Organización"}
          </DialogTitle>
          <DialogDescription>Configura los detalles principales y parámetros de la organización.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">Información General</TabsTrigger>
                  <TabsTrigger value="settings">Configuración Avanzada</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="general" className="mt-0 space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Legal</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Acme Corp S.L." {...field} className="h-10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NIF/CIF</FormLabel>
                          <FormControl>
                            <Input placeholder="B12345678" value={field.value ?? ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {features.emailDomainEnforcement && (
                      <FormField
                        control={form.control}
                        name="employeeNumberPrefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prefijo Empleados</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ACME"
                                maxLength={4}
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {mode === "create" && (
                    <FormField
                      control={form.control}
                      name="hierarchyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo Organizativo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona estructura" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={HierarchyType.FLAT}>Horizontal (Flat)</SelectItem>
                              <SelectItem value={HierarchyType.DEPARTMENTAL}>Departamental</SelectItem>
                              <SelectItem value={HierarchyType.HIERARCHICAL}>Jerárquica Completa</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Define cómo se estructuran los reportes y permisos.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                <TabsContent value="settings" className="mt-0 space-y-6">
                  {features.emailDomainEnforcement && (
                    <div className="space-y-3 rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                      <div className="mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-indigo-500" />
                        <h4 className="text-sm font-medium">Dominios Corporativos</h4>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="empresa.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="flex-1"
                        />
                        <Button type="button" variant="secondary" onClick={addEmailDomain}>
                          Añadir
                        </Button>
                      </div>

                      <div className="flex min-h-[30px] flex-wrap gap-2">
                        {emailDomains.length === 0 && (
                          <span className="text-muted-foreground text-xs italic">
                            Sin restricciones de dominio configuradas
                          </span>
                        )}
                        {emailDomains.map((domain) => (
                          <Badge key={domain} variant="outline" className="gap-1 bg-white dark:bg-slate-950">
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
                    </div>
                  )}

                  {mode === "edit" && (
                    <div className="space-y-3 rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                      <div className="mb-2 flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-indigo-500" />
                        <h4 className="text-sm font-medium">Almacenamiento y Cuotas</h4>
                      </div>

                      <div className="grid grid-cols-2 items-end gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-500">Límite asignado (GB)</label>
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
                          />
                        </div>
                        <div className="pb-2.5 text-xs text-slate-500">
                          Uso actual:{" "}
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {formatBytes(initialValues?.storageUsedBytes ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">Estado Operativo</FormLabel>
                          <FormDescription>Si se desactiva, los usuarios no podrán acceder.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>

              <div className="flex items-center justify-end gap-2 border-t bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                  {isSubmitting ? <>Guardando...</> : mode === "create" ? "Crear Organización" : "Guardar Cambios"}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
