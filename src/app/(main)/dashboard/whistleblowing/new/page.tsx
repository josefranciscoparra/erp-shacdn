"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarIcon, CheckCircle2, Loader2, Shield, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createWhistleblowingReport,
  getWhistleblowingCategories,
  type WhistleblowingCategory,
} from "@/server/actions/whistleblowing";

const formSchema = z.object({
  title: z.string().min(10, "El título debe tener al menos 10 caracteres").max(200, "Máximo 200 caracteres"),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  description: z.string().min(50, "La descripción debe tener al menos 50 caracteres"),
  incidentDate: z.date().optional(),
  incidentLocation: z.string().optional(),
  involvedParties: z.string().optional(),
  contactEmail: z.string().email("Email no válido").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewWhistleblowingReportPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Registrar incidencia" />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );
  const router = useRouter();
  const [categories, setCategories] = useState<WhistleblowingCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      categoryId: "",
      description: "",
      incidentLocation: "",
      involvedParties: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setIsLoadingCategories(true);
    try {
      const result = await getWhistleblowingCategories();
      if (result.success && result.categories) {
        setCategories(result.categories);
      }
    } finally {
      setIsLoadingCategories(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      // Preparar datos de contacto opcionales
      const reporterMetadata: Record<string, string> = {};
      if (values.contactEmail) reporterMetadata.email = values.contactEmail;
      if (values.contactPhone) reporterMetadata.phone = values.contactPhone;

      // Preparar personas implicadas
      const involvedParties = values.involvedParties
        ? values.involvedParties.split("\n").filter((p) => p.trim())
        : undefined;

      const result = await createWhistleblowingReport({
        title: values.title,
        categoryId: values.categoryId,
        description: values.description,
        incidentDate: values.incidentDate,
        incidentLocation: values.incidentLocation ?? undefined,
        involvedParties,
        reporterMetadata: Object.keys(reporterMetadata).length > 0 ? reporterMetadata : undefined,
      });

      if (result.success && result.trackingCode) {
        setTrackingCode(result.trackingCode);
        setIsSuccess(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess && trackingCode) {
    return (
      <PermissionGuard permission="manage_organization" fallback={permissionFallback}>
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <Card className="mx-auto max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Denuncia enviada correctamente</CardTitle>
              <CardDescription>
                Tu denuncia ha sido registrada y será revisada por el equipo de gestión.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Código de seguimiento</p>
                <p className="font-mono text-2xl font-bold">{trackingCode}</p>
              </div>
              <p className="text-muted-foreground text-sm">
                Guarda este código para consultar el estado de tu denuncia en cualquier momento.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href="/dashboard/whistleblowing">Ver mis denuncias</Link>
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard/whistleblowing")}>
                  Volver al listado
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="manage_organization" fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/dashboard/whistleblowing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al listado
          </Link>
        </Button>

        <SectionHeader
          title="Nueva denuncia"
          description="Envía una denuncia de forma confidencial. Tu identidad como empleado quedará registrada pero protegida."
          icon={<Shield className="h-5 w-5" />}
        />

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Información de la denuncia</CardTitle>
            <CardDescription>
              Completa el formulario con la mayor información posible para facilitar la investigación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Categoría */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCategories}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex flex-col">
                                <span>{category.name}</span>
                                {category.description && (
                                  <span className="text-muted-foreground text-xs">{category.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Título */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título de la denuncia *</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe brevemente el motivo de la denuncia" {...field} />
                      </FormControl>
                      <FormDescription>Mínimo 10 caracteres</FormDescription>
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
                      <FormLabel>Descripción detallada *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe los hechos con el mayor detalle posible: qué ocurrió, cuándo, cómo, quiénes estuvieron involucrados..."
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Mínimo 50 caracteres. Sé lo más específico posible.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 @lg/main:grid-cols-2">
                  {/* Fecha del incidente */}
                  <FormField
                    control={form.control}
                    name="incidentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha del incidente</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Fecha aproximada de los hechos</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Lugar del incidente */}
                  <FormField
                    control={form.control}
                    name="incidentLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lugar del incidente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Oficina central, planta 3" {...field} />
                        </FormControl>
                        <FormDescription>Ubicación donde ocurrieron los hechos</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Personas implicadas */}
                <FormField
                  control={form.control}
                  name="involvedParties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personas implicadas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Indica los nombres de las personas involucradas (una por línea)"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Esta información es confidencial y solo será visible para los gestores.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Datos de contacto opcionales */}
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 text-sm font-medium">Datos de contacto (opcional)</h3>
                  <p className="text-muted-foreground mb-4 text-xs">
                    Si deseas que los gestores puedan contactarte para solicitar más información.
                  </p>
                  <div className="grid gap-4 @lg/main:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email de contacto</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="tu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono de contacto</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+34 600 000 000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar denuncia
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
