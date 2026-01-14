"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { HierarchyType } from "@prisma/client";
import { Building2, Globe, HardDrive, Loader2, Plus, Settings, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {mode === "create" ? "Nueva Organización" : "Editar Organización"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Configura los detalles principales y parámetros de la organización.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-6">
                <TabsList className="h-auto w-full justify-start gap-6 bg-transparent p-0">
                  <TabsTrigger
                    value="general"
                    className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pt-3 pb-3 font-medium text-slate-500 shadow-none transition-none hover:text-slate-700 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:text-slate-400 dark:data-[state=active]:text-indigo-400"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Información General
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pt-3 pb-3 font-medium text-slate-500 shadow-none transition-none hover:text-slate-700 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:text-slate-400 dark:data-[state=active]:text-indigo-400"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración Avanzada
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="general" className="mt-0 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Nombre Legal</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. Acme Corp S.L." {...field} />
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
                            <FormDescription className="text-xs">
                              Se usará para generar IDs (ej. ACME-001)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {mode === "create" && (
                      <FormField
                        control={form.control}
                        name="hierarchyType"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
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
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="mt-0 space-y-6">
                  {features.emailDomainEnforcement && (
                    <div className="rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                      <div className="mb-4 flex items-center gap-2">
                        <div className="rounded-md bg-white p-1.5 shadow-sm dark:bg-slate-950">
                          <Globe className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            Dominios Corporativos
                          </h4>
                          <p className="text-xs text-slate-500">
                            Restringe el registro de usuarios a estos dominios de correo.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="ej. empresa.com"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-white dark:bg-slate-950"
                          />
                          <Button type="button" size="sm" onClick={addEmailDomain}>
                            <Plus className="mr-2 h-4 w-4" />
                            Añadir
                          </Button>
                        </div>

                        <div className="flex min-h-[40px] flex-wrap items-center gap-2 rounded-md border border-dashed bg-white/50 p-2 dark:bg-slate-950/50">
                          {emailDomains.length === 0 && (
                            <span className="w-full text-center text-xs text-slate-400 italic">
                              Sin restricciones (cualquier dominio permitido)
                            </span>
                          )}
                          {emailDomains.map((domain) => (
                            <Badge
                              key={domain}
                              variant="secondary"
                              className="gap-1 border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                            >
                              @{domain}
                              <button
                                type="button"
                                onClick={() => removeEmailDomain(domain)}
                                className="ml-1 rounded-full p-0.5 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === "edit" && (
                    <div className="rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                      <div className="mb-4 flex items-center gap-2">
                        <div className="rounded-md bg-white p-1.5 shadow-sm dark:bg-slate-950">
                          <HardDrive className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            Almacenamiento y Cuotas
                          </h4>
                          <p className="text-xs text-slate-500">
                            Gestiona el límite de espacio en disco para esta organización.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-500">Límite Asignado (GB)</label>
                          <div className="flex items-center gap-2">
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
                              className="bg-white dark:bg-slate-950"
                            />
                            <span className="text-sm font-medium text-slate-500">GB</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-500">Uso Actual</label>
                          <div className="flex h-10 items-center rounded-md border bg-slate-100 px-3 font-mono text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {formatBytes(initialValues?.storageUsedBytes ?? 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">Estado Operativo</FormLabel>
                          <FormDescription>
                            Si desactivas la organización, ningún usuario podrá acceder a ella.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>

              <div className="flex items-center justify-end gap-3 border-t bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Crear Organización" : "Guardar Cambios"}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
