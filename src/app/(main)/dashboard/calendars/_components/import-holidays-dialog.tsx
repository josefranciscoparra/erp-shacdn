"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Loader2, Calendar as CalendarIcon, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalendarsStore } from "@/stores/calendars-store";
import { useCostCentersStore } from "@/stores/cost-centers-store";

const importFormSchema = z.object({
  year: z.coerce.number().min(2000).max(2100),
  countryCode: z.string().min(2),
  calendarId: z.string().optional(),
  calendarName: z.string().optional(),
  calendarType: z.enum(["NATIONAL_HOLIDAY", "LOCAL_HOLIDAY", "CORPORATE_EVENT", "CUSTOM"]).optional(),
  costCenterId: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  isRecurring: z.boolean().default(false),
});

type ImportFormData = z.infer<typeof importFormSchema>;

interface HolidayPreview {
  date: string;
  name: string;
  nameEn: string;
  global: boolean;
  type: string;
}

interface ImportHolidaysDialogProps {
  calendarId?: string; // Si se proporciona, importar a este calendario
  trigger?: React.ReactNode;
}

const COUNTRIES = [
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "FR", name: "Francia", flag: "🇫🇷" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "DE", name: "Alemania", flag: "🇩🇪" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "NL", name: "Países Bajos", flag: "🇳🇱" },
  { code: "BE", name: "Bélgica", flag: "🇧🇪" },
  { code: "CH", name: "Suiza", flag: "🇨🇭" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
];

const COLOR_PRESETS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#22c55e" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Amarillo", value: "#eab308" },
  { name: "Púrpura", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
];

export function ImportHolidaysDialog({ calendarId, trigger }: ImportHolidaysDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [preview, setPreview] = React.useState<HolidayPreview[]>([]);
  const [selectedHolidays, setSelectedHolidays] = React.useState<Set<string>>(new Set());

  const { calendars, fetchCalendars } = useCalendarsStore();
  const { costCenters, fetchCostCenters } = useCostCentersStore();

  const currentYear = new Date().getFullYear();

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      year: currentYear,
      countryCode: "ES",
      calendarId: calendarId ?? "__new__",
      calendarName: "",
      calendarType: "NATIONAL_HOLIDAY",
      costCenterId: "",
      color: "#3b82f6",
      isRecurring: false,
    },
  });

  React.useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const isNewCalendar = !form.watch("calendarId") || form.watch("calendarId") === "__new__";
  const selectedCalendarType = form.watch("calendarType");
  const requiresCostCenter = selectedCalendarType === "LOCAL_HOLIDAY";

  const handlePreview = async () => {
    const year = form.getValues("year");
    const countryCode = form.getValues("countryCode");

    if (!year || !countryCode) {
      toast.error("Selecciona un país y año");
      return;
    }

    setIsLoadingPreview(true);
    try {
      const response = await fetch(`/api/calendars/import-holidays?year=${year}&countryCode=${countryCode}`);

      if (!response.ok) {
        throw new Error("Error al cargar vista previa");
      }

      const data = await response.json();
      setPreview(data.holidays ?? []);

      // Seleccionar todos por defecto
      const allHolidayKeys = new Set(data.holidays.map((h: HolidayPreview) => h.date));
      setSelectedHolidays(allHolidayKeys);

      toast.success(`${data.count} festivos encontrados`);
    } catch (error) {
      console.error("Error loading preview:", error);
      toast.error("Error al cargar vista previa");
      setPreview([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const toggleHoliday = (date: string) => {
    setSelectedHolidays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedHolidays.size === preview.length) {
      setSelectedHolidays(new Set());
    } else {
      setSelectedHolidays(new Set(preview.map((h) => h.date)));
    }
  };

  const onSubmit = async (data: ImportFormData) => {
    if (preview.length === 0) {
      toast.error("Primero carga la vista previa");
      return;
    }

    if (selectedHolidays.size === 0) {
      toast.error("Selecciona al menos un festivo");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch("/api/calendars/import-holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          calendarId: data.calendarId === "__new__" ? undefined : data.calendarId,
          costCenterId: data.costCenterId ?? undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Error al importar festivos");
      }

      const result = await response.json();

      toast.success("Festivos importados exitosamente", {
        description: `${result.imported} eventos importados${result.skipped > 0 ? ` (${result.skipped} ya existían)` : ""}`,
      });

      // Refrescar calendarios
      await fetchCalendars();

      // Cerrar dialog y resetear
      setOpen(false);
      form.reset();
      setPreview([]);
      setSelectedHolidays(new Set());
    } catch (error) {
      console.error("Error importing holidays:", error);
      toast.error("Error al importar festivos", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Importar festivos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 bg-gray-100 p-0 dark:bg-gray-900">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Importar festivos automáticamente</DialogTitle>
          <DialogDescription>
            Importa festivos oficiales de diferentes países desde fuentes gubernamentales
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-4 pb-4">
                {/* País y año */}
                <div className="grid gap-4 @xl/main:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>País</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Selecciona un país" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.flag} {country.name}
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
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Año</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2025"
                            className="placeholder:text-muted-foreground/50 bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Botón de preview */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePreview}
                  disabled={isLoadingPreview}
                  className="w-full"
                >
                  {isLoadingPreview ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Cargar vista previa
                    </>
                  )}
                </Button>

                {/* Preview de festivos */}
                {preview.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            Vista previa ({selectedHolidays.size} de {preview.length} seleccionados)
                          </CardTitle>
                          <CardDescription>Selecciona los festivos que deseas importar</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
                          {selectedHolidays.size === preview.length ? "Deseleccionar todos" : "Seleccionar todos"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {preview.map((holiday, index) => (
                            <div
                              key={`${holiday.date}-${index}`}
                              className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-2"
                              onClick={() => toggleHoliday(holiday.date)}
                            >
                              <Checkbox
                                checked={selectedHolidays.has(holiday.date)}
                                onCheckedChange={() => toggleHoliday(holiday.date)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{holiday.name}</span>
                                  {holiday.global && (
                                    <Badge variant="secondary" className="text-xs">
                                      Nacional
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-muted-foreground text-xs">
                                  {format(new Date(holiday.date), "PPP", { locale: es })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Calendario destino */}
                <FormField
                  control={form.control}
                  name="calendarId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendario destino</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? "__new__"}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Crear nuevo calendario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__new__">Crear nuevo calendario</SelectItem>
                          {calendars.map((cal) => (
                            <SelectItem key={cal.id} value={cal.id}>
                              {cal.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Elige si añadir a un calendario existente o crear uno nuevo</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Opciones para nuevo calendario */}
                {isNewCalendar && (
                  <>
                    <FormField
                      control={form.control}
                      name="calendarName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del calendario (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Festivos España 2025"
                              className="placeholder:text-muted-foreground/50 bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Si no especificas, se generará automáticamente</FormDescription>
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
                              <SelectTrigger className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NATIONAL_HOLIDAY">Festivos Nacionales</SelectItem>
                              <SelectItem value="LOCAL_HOLIDAY">Festivos Locales (por centro)</SelectItem>
                              <SelectItem value="CORPORATE_EVENT">Eventos Corporativos</SelectItem>
                              <SelectItem value="CUSTOM">Personalizado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {requiresCostCenter && (
                      <FormField
                        control={form.control}
                        name="costCenterId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centro de Coste</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white">
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
                            <FormDescription>Requerido para calendarios locales</FormDescription>
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
                            {COLOR_PRESETS.map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                className="ring-offset-background h-8 w-8 rounded-full transition-all hover:scale-110"
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
                              <Input type="color" className="h-8 w-16 cursor-pointer bg-white" {...field} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Opciones adicionales */}
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Marcar como recurrentes</FormLabel>
                        <FormDescription>
                          Los eventos se repetirán automáticamente cada año en la misma fecha
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="bg-background border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isImporting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isImporting || preview.length === 0 || selectedHolidays.size === 0}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Importar {selectedHolidays.size} festivos
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
