"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CalendarIcon, CheckCircle2, ClipboardList, Loader2, Shield, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

export default function NewEmployeeWhistleblowingReportPage() {
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

  const descriptionLength = form.watch("description")?.length ?? 0;
  const involvedPeople = form.watch("involvedParties") ?? "";
  const involvedCount = useMemo(() => {
    if (!involvedPeople) {
      return 0;
    }
    return involvedPeople.split("\n").filter((value) => value.trim()).length;
  }, [involvedPeople]);

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
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center space-y-8 py-10">
        <Card className="border-green-200 bg-green-50/50 shadow-lg dark:border-green-900 dark:bg-green-950/20">
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-sm dark:bg-green-900 dark:text-green-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl text-green-900 dark:text-green-50">Denuncia Enviada</CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Tu reporte ha sido registrado correctamente en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4 text-center">
            <div className="rounded-xl border border-green-200 bg-white p-6 shadow-sm dark:border-green-800 dark:bg-green-950/50">
              <p className="text-muted-foreground mb-2 text-sm font-medium">Tu código de seguimiento</p>
              <p className="text-foreground font-mono text-3xl font-bold tracking-wider select-all">{trackingCode}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                Conserva este código. Lo necesitarás para consultar el estado de tu denuncia.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/dashboard/me/whistleblowing">Ir a mis denuncias</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/dashboard/me/whistleblowing")}
                className="w-full sm:w-auto"
              >
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      <SectionHeader
        backButton={{ href: "/dashboard/me/whistleblowing", label: "Volver" }}
        title="Nueva Denuncia"
        description="Envía un reporte de forma confidencial. Tu identidad está protegida en todo momento."
      />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Detalles de la incidencia</CardTitle>
                <CardDescription>Comparte la información clave para iniciar la investigación</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                <div className="space-y-6">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Paso 1/3</p>
                    <h3 className="text-lg font-semibold">Contexto del incidente</h3>
                    <p className="text-muted-foreground text-sm">
                      Selecciona la categoría adecuada y resume brevemente los hechos.
                    </p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isLoadingCategories}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecciona el tipo de incidente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex flex-col py-1">
                                    <span className="font-medium">{category.name}</span>
                                    {category.description && (
                                      <span className="text-muted-foreground mt-0.5 text-xs">
                                        {category.description}
                                      </span>
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
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título *</FormLabel>
                          <FormControl>
                            <Input placeholder="Resumen breve del hecho" className="h-10" {...field} />
                          </FormControl>
                          <FormDescription>Mínimo 10 caracteres</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-6">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Paso 2/3</p>
                    <h3 className="text-lg font-semibold">Descripción y evidencia</h3>
                    <p className="text-muted-foreground text-sm">
                      Explica qué ocurrió, cuándo sucedió y quiénes estaban presentes.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Descripción detallada *</FormLabel>
                          <span className="text-muted-foreground text-xs">{descriptionLength}/1000</span>
                        </div>
                        <FormDescription>
                          Incluye fechas, personas implicadas y cualquier prueba relevante (mínimo 50 caracteres).
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="Explica qué ocurrió, cómo, cuándo y quiénes intervinieron. Cuantos más detalles aportes, mejor podremos investigar el caso."
                            rows={12}
                            className="min-h-[200px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="incidentDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha aproximada</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "h-10 w-full pl-3 text-left font-normal",
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="incidentLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lugar del incidente</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Sala de reuniones, Planta 2" className="h-10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-6">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Paso 3/3</p>
                    <h3 className="text-lg font-semibold">Personas implicadas y contacto</h3>
                    <p className="text-muted-foreground text-sm">
                      Añade los nombres de personas involucradas y deja un medio de contacto si deseas seguimiento
                      directo.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="involvedParties"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Personas implicadas</FormLabel>
                          <span className="text-muted-foreground text-xs">{involvedCount} personas</span>
                        </div>
                        <FormDescription>
                          Opcional. Escribe una persona por línea para mantener el formato.
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="Nombre Apellido - Cargo&#10;Nombre Apellido - Departamento"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-xl border border-dashed bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                    <h3 className="text-sm font-semibold">Información de contacto (opcional)</h3>
                    <p className="text-muted-foreground mb-4 text-xs">
                      Si compartes tus datos podremos mantenerte informado ante cualquier avance.
                    </p>
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="ejemplo@email.com" className="h-10" {...field} />
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
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+34 600 000 000" className="h-10" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-xs">
                    El envío se cifra y llega directamente al equipo de cumplimiento.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Registrar denuncia
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Confidencialidad garantizada
              </CardTitle>
              <CardDescription>Solo el equipo de cumplimiento autorizado accede a esta información.</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3 text-sm">
              <div className="rounded-lg border border-dashed p-3">
                <p>• Canal cifrado y auditado</p>
                <p>• Acceso restringido según Ley 2/2023</p>
                <p>• Seguimiento mediante código único</p>
              </div>
              <div className="bg-muted/60 rounded-lg p-3 text-xs">
                <p className="text-foreground font-medium">Consejo</p>
                <p>Cuanta más información aportes, más ágil será la resolución.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="text-primary h-4 w-4" />
                Flujo del expediente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-3">
                <div className="bg-background rounded-full border px-3 py-1 text-xs font-semibold">1</div>
                <div>
                  <p className="font-medium">Alta y validación</p>
                  <p className="text-muted-foreground text-xs">
                    Obtendrás un código único para identificar el expediente.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="bg-background rounded-full border px-3 py-1 text-xs font-semibold">2</div>
                <div>
                  <p className="font-medium">Investigación</p>
                  <p className="text-muted-foreground text-xs">
                    Un gestor especializado analizará la denuncia y puede contactarte si compartiste datos.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="bg-background rounded-full border px-3 py-1 text-xs font-semibold">3</div>
                <div>
                  <p className="font-medium">Resolución y seguimiento</p>
                  <p className="text-muted-foreground text-xs">
                    Podrás consultar el estado desde este panel o con tu código.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="to-card bg-gradient-to-br from-amber-50 dark:from-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Qué incluir en tu denuncia
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p>• Fecha exacta o aproximada y ubicación.</p>
              <p>• Personas involucradas, testigos o áreas afectadas.</p>
              <p>• Evidencias disponibles o dónde encontrarlas.</p>
              <p>• Impacto potencial para la organización.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
