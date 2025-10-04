"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCalendarsStore } from "@/stores/calendars-store";
import { useCostCentersStore } from "@/stores/cost-centers-store";

const calendarFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  year: z.coerce.number().min(2000, "Año debe ser >= 2000").max(2100, "Año debe ser <= 2100"),
  calendarType: z.enum(["NATIONAL_HOLIDAY", "LOCAL_HOLIDAY", "CORPORATE_EVENT", "CUSTOM"]),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color debe ser formato hex (#RRGGBB)"),
  costCenterId: z.string().optional(),
  active: z.boolean().default(true),
});

type CalendarFormData = z.infer<typeof calendarFormSchema>;

const calendarTypeOptions = [
  { value: "NATIONAL_HOLIDAY", label: "Festivos Nacionales" },
  { value: "LOCAL_HOLIDAY", label: "Festivos Locales (por centro)" },
  { value: "CORPORATE_EVENT", label: "Eventos Corporativos" },
  { value: "CUSTOM", label: "Personalizado" },
];

const colorPresets = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#22c55e" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Amarillo", value: "#eab308" },
  { name: "Púrpura", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
];

export default function EditCalendarPage() {
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { selectedCalendar, updateCalendar, fetchCalendarById, fetchCalendars } = useCalendarsStore();
  const { costCenters, fetchCostCenters } = useCostCentersStore();

  const form = useForm<CalendarFormData>({
    resolver: zodResolver(calendarFormSchema),
    defaultValues: {
      name: "",
      description: "",
      year: new Date().getFullYear(),
      calendarType: "NATIONAL_HOLIDAY",
      color: "#3b82f6",
      costCenterId: "",
      active: true,
    },
  });

  useEffect(() => {
    fetchCostCenters();
    if (id) {
      fetchCalendarById(id);
    }
  }, [id, fetchCostCenters, fetchCalendarById]);

  // Prellenar el formulario cuando se carga el calendario
  useEffect(() => {
    if (selectedCalendar) {
      form.reset({
        name: selectedCalendar.name,
        description: selectedCalendar.description || "",
        year: selectedCalendar.year,
        calendarType: selectedCalendar.calendarType as any,
        color: selectedCalendar.color,
        costCenterId: selectedCalendar.costCenter?.id || "",
        active: selectedCalendar.active,
      });
    }
  }, [selectedCalendar, form]);

  const selectedCalendarType = form.watch("calendarType");
  const requiresCostCenter = selectedCalendarType === "LOCAL_HOLIDAY";

  const onSubmit = async (data: CalendarFormData) => {
    setIsLoading(true);
    try {
      await updateCalendar(id, {
        ...data,
        costCenterId: data.costCenterId || null,
      });

      toast.success("Calendario actualizado exitosamente", {
        description: `${data.name} ha sido actualizado`,
      });

      await fetchCalendars();
      router.push(`/dashboard/calendars/${id}`);
    } catch (error) {
      toast.error("Error al actualizar calendario", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedCalendar) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando calendario...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/calendars/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Editar calendario</h1>
          <p className="text-muted-foreground text-sm">Modifica los datos del calendario</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
              <CardDescription>Datos principales del calendario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Festivos Nacionales 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción del calendario" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 @xl/main:grid-cols-2">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Año</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="calendarType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de calendario</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {calendarTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {requiresCostCenter && (
                <FormField
                  control={form.control}
                  name="costCenterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Centro de Coste</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un centro" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {costCenters.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Requerido para calendarios locales
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color de identificación</FormLabel>
                    <div className="flex items-center gap-2">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          className="h-8 w-8 rounded-full ring-offset-background transition-all hover:scale-110"
                          style={{
                            backgroundColor: preset.value,
                            outline: field.value === preset.value ? "2px solid currentColor" : "none",
                            outlineOffset: "2px",
                          }}
                          onClick={() => field.onChange(preset.value)}
                          title={preset.name}
                        />
                      ))}
                      <FormControl>
                        <Input
                          type="color"
                          className="h-8 w-16 cursor-pointer"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" asChild>
              <Link href={`/dashboard/calendars/${id}`}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
