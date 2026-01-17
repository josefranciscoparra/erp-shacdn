"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarIcon, CheckCircle2, Copy, Loader2, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createAnonymousReport,
  getOrganizationByPublicSlug,
  getPublicWhistleblowingCategories,
  type WhistleblowingCategory,
} from "@/server/actions/whistleblowing";

const formSchema = z.object({
  reporterType: z.enum(["ANONYMOUS", "EXTERNAL"]),
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

export default function NewAnonymousReportPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [orgName, setOrgName] = useState<string>("");
  const [categories, setCategories] = useState<WhistleblowingCategory[]>([]);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reporterType: "ANONYMOUS",
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
    loadOrganization();
    loadCategories();
  }, [orgSlug]);

  async function loadOrganization() {
    setIsLoadingOrg(true);
    try {
      const result = await getOrganizationByPublicSlug(orgSlug);
      if (result.success && result.organization) {
        setOrgName(result.organization.name);
      } else {
        setError("Organización no encontrada o canal no habilitado");
      }
    } finally {
      setIsLoadingOrg(false);
    }
  }

  async function loadCategories() {
    setIsLoadingCategories(true);
    try {
      const result = await getPublicWhistleblowingCategories(orgSlug);
      if (result.success && result.categories) {
        setCategories(result.categories);
      }
    } finally {
      setIsLoadingCategories(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const reporterMetadata: Record<string, string> = {};
      if (values.contactEmail) reporterMetadata.email = values.contactEmail;
      if (values.contactPhone) reporterMetadata.phone = values.contactPhone;

      const involvedParties = values.involvedParties
        ? values.involvedParties.split("\n").filter((p) => p.trim())
        : undefined;

      const result = await createAnonymousReport(orgSlug, {
        reporterType: values.reporterType,
        title: values.title,
        categoryId: values.categoryId,
        description: values.description,
        incidentDate: values.incidentDate,
        incidentLocation: values.incidentLocation ?? undefined,
        involvedParties,
        reporterMetadata: Object.keys(reporterMetadata).length > 0 ? reporterMetadata : undefined,
      });

      if (result.success && result.trackingCode && result.accessCode) {
        setTrackingCode(result.trackingCode);
        setAccessCode(result.accessCode);
        setIsSuccess(true);
      } else {
        setError(result.error ?? "Error al crear la denuncia");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyToClipboard() {
    if (trackingCode && accessCode) {
      const text = `Código de seguimiento: ${trackingCode}\nCódigo de acceso: ${accessCode}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (isLoadingOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !orgName) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Shield className="text-muted-foreground h-12 w-12" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  if (isSuccess && trackingCode && accessCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-950">
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Denuncia enviada correctamente</CardTitle>
            <CardDescription>Tu denuncia ha sido registrada y será revisada por el equipo de gestión.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Código de seguimiento</p>
                <p className="font-mono text-2xl font-bold">{trackingCode}</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Código de acceso</p>
                <p className="font-mono text-2xl font-bold">{accessCode}</p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Guarda estos códigos en un lugar seguro
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Los necesitarás para consultar el estado de tu denuncia. El código de acceso no se puede recuperar.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={copyToClipboard}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copiado" : "Copiar códigos"}
            </Button>

            <div className="flex flex-col gap-2 pt-4">
              <Button asChild>
                <Link href={`/whistleblowing/${orgSlug}/track`}>Consultar estado de denuncia</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href={`/whistleblowing/${orgSlug}`}>Volver al portal</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={`/whistleblowing/${orgSlug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al portal
          </Link>
        </Button>

        <div className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Shield className="text-primary h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Nueva denuncia</h1>
          <p className="text-muted-foreground text-sm">{orgName}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Formulario de denuncia</CardTitle>
            <CardDescription>
              Completa el formulario con la mayor información posible para facilitar la investigación. Tus datos están
              protegidos conforme a la Ley 2/2023.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950">{error}</div>}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Tipo de informante */}
                <FormField
                  control={form.control}
                  name="reporterType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de denuncia</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex items-center space-x-3 rounded-lg border p-3">
                            <RadioGroupItem value="ANONYMOUS" id="anonymous" />
                            <div className="flex-1">
                              <label htmlFor="anonymous" className="cursor-pointer text-sm font-medium">
                                Anónima
                              </label>
                              <p className="text-muted-foreground text-xs">
                                Tu identidad permanecerá completamente oculta
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 rounded-lg border p-3">
                            <RadioGroupItem value="EXTERNAL" id="external" />
                            <div className="flex-1">
                              <label htmlFor="external" className="cursor-pointer text-sm font-medium">
                                Externa (proveedor/cliente)
                              </label>
                              <p className="text-muted-foreground text-xs">
                                Puedes proporcionar datos de contacto voluntariamente
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="grid gap-4 sm:grid-cols-2">
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
                {form.watch("reporterType") === "EXTERNAL" && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-medium">Datos de contacto (opcional)</h3>
                    <p className="text-muted-foreground mb-4 text-xs">
                      Si deseas que los gestores puedan contactarte para solicitar más información.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                )}

                <div className="flex justify-end gap-2 pt-4">
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
    </div>
  );
}
