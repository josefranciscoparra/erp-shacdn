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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  counties: string[] | null;
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

const SPANISH_REGIONS = [
  { code: "ES-AN", name: "Andalucía" },
  { code: "ES-AR", name: "Aragón" },
  { code: "ES-AS", name: "Asturias" },
  { code: "ES-IB", name: "Baleares" },
  { code: "ES-CN", name: "Canarias" },
  { code: "ES-CB", name: "Cantabria" },
  { code: "ES-CM", name: "Castilla-La Mancha" },
  { code: "ES-CL", name: "Castilla y León" },
  { code: "ES-CT", name: "Cataluña" },
  { code: "ES-VC", name: "C. Valenciana" },
  { code: "ES-EX", name: "Extremadura" },
  { code: "ES-GA", name: "Galicia" },
  { code: "ES-MD", name: "Madrid" },
  { code: "ES-MC", name: "Murcia" },
  { code: "ES-NC", name: "Navarra" },
  { code: "ES-PV", name: "País Vasco" },
  { code: "ES-RI", name: "La Rioja" },
];

const getHolidayKey = (holiday: HolidayPreview) => `${holiday.date}::${holiday.name}`;

export function ImportHolidaysDialog({ calendarId, trigger }: ImportHolidaysDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [preview, setPreview] = React.useState<HolidayPreview[]>([]);
  const [selectedHolidays, setSelectedHolidays] = React.useState<Set<string>>(new Set());
  const [filterType, setFilterType] = React.useState<"all" | "national" | "regional">("all");
  const [selectedRegion, setSelectedRegion] = React.useState<string>("");

  const { calendars, fetchCalendars, fetchCalendarById } = useCalendarsStore();
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

  // Filtrar festivos según los filtros seleccionados
  const filteredPreview = React.useMemo(() => {
    if (form.watch("countryCode") !== "ES") {
      return preview; // Sin filtrado para otros países
    }

    if (filterType === "national") {
      return preview.filter((h) => h.global === true);
    }

    if (filterType === "regional" && selectedRegion) {
      return preview.filter((h) => h.global === true || h.counties?.includes(selectedRegion));
    }

    return preview; // "all" - mostrar todos
  }, [preview, filterType, selectedRegion, form]);

  const filteredHolidayKeys = React.useMemo(() => filteredPreview.map(getHolidayKey), [filteredPreview]);

  const selectedFilteredCount = React.useMemo(() => {
    let count = 0;
    for (const key of filteredHolidayKeys) {
      if (selectedHolidays.has(key)) {
        count += 1;
      }
    }
    return count;
  }, [filteredHolidayKeys, selectedHolidays]);

  const allFilteredSelected = filteredHolidayKeys.length > 0 && selectedFilteredCount === filteredHolidayKeys.length;

  React.useEffect(() => {
    if (!requiresCostCenter && form.getValues("costCenterId") !== "__none__") {
      form.setValue("costCenterId", "__none__");
    }
  }, [requiresCostCenter, form]);

  React.useEffect(() => {
    if (filteredHolidayKeys.length === 0) {
      setSelectedHolidays(new Set());
      return;
    }

    setSelectedHolidays((prev) => {
      const next = new Set<string>();
      for (const key of filteredHolidayKeys) {
        if (prev.has(key)) {
          next.add(key);
        }
      }
      return next;
    });
  }, [filteredHolidayKeys]);

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
      const allHolidayKeys = new Set(data.holidays.map((h: HolidayPreview) => getHolidayKey(h)));
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

  const toggleHoliday = (holidayKey: string) => {
    setSelectedHolidays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(holidayKey)) {
        newSet.delete(holidayKey);
      } else {
        newSet.add(holidayKey);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedHolidays(new Set());
    } else {
      setSelectedHolidays(new Set(filteredHolidayKeys));
    }
  };

  // Helper para obtener nombre de región
  const getRegionName = (countyCode: string): string => {
    const region = SPANISH_REGIONS.find((r) => r.code === countyCode);
    return region?.name ?? countyCode;
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

    const normalizeId = (value?: string | null) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      if (!trimmed || trimmed === "__none__") {
        return undefined;
      }
      return trimmed;
    };

    const normalizedCostCenterId = normalizeId(data.costCenterId ?? undefined);

    if (requiresCostCenter && !normalizedCostCenterId) {
      form.setError("costCenterId", {
        type: "manual",
        message: "Selecciona un centro de coste para calendarios locales",
      });
      return;
    }

    setIsImporting(true);
    try {
      const selectedHolidayKeys = Array.from(selectedHolidays);
      const response = await fetch("/api/calendars/import-holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          calendarId: data.calendarId === "__new__" ? undefined : data.calendarId,
          costCenterId: normalizedCostCenterId,
          selectedHolidayKeys,
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

      // Refrescar calendarios y el calendario en detalle (si aplica)
      await fetchCalendars();
      const targetCalendarId =
        (data.calendarId && data.calendarId !== "__new__" ? data.calendarId : result.calendar?.id) ?? null;
      if (targetCalendarId) {
        await fetchCalendarById(targetCalendarId);
      }

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
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Importar festivos automáticamente</DialogTitle>
          <DialogDescription>
            Importa festivos oficiales de diferentes países desde fuentes gubernamentales
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-4">
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

                {/* Controles de filtrado - Solo para España */}
                {preview.length > 0 && form.watch("countryCode") === "ES" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Filtros</CardTitle>
                      <CardDescription className="text-xs">Filtra los festivos que deseas importar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <RadioGroup value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="filter-all" />
                          <Label htmlFor="filter-all">Mostrar todos los festivos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="national" id="filter-national" />
                          <Label htmlFor="filter-national">Solo festivos nacionales</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="regional" id="filter-regional" />
                          <Label htmlFor="filter-regional">Nacionales + Comunidad autónoma</Label>
                        </div>
                      </RadioGroup>

                      {filterType === "regional" && (
                        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Selecciona una comunidad autónoma" />
                          </SelectTrigger>
                          <SelectContent>
                            {SPANISH_REGIONS.map((region) => (
                              <SelectItem key={region.code} value={region.code}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Preview de festivos */}
                {preview.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base">
                            Vista previa ({selectedFilteredCount} de {filteredPreview.length} seleccionados)
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Selecciona los festivos que deseas importar
                            {filterType !== "all" && preview.length !== filteredPreview.length && (
                              <span className="text-muted-foreground ml-1">
                                ({filteredPreview.length} de {preview.length} después de filtrar)
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={toggleAll} className="shrink-0">
                          {allFilteredSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {filteredPreview.map((holiday, index) => {
                            const holidayKey = getHolidayKey(holiday);
                            return (
                              <div
                                key={`${holidayKey}-${index}`}
                                className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-2"
                                onClick={() => toggleHoliday(holidayKey)}
                              >
                                <Checkbox
                                  checked={selectedHolidays.has(holidayKey)}
                                  onCheckedChange={() => toggleHoliday(holidayKey)}
                                />
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium">{holiday.name}</span>
                                    {holiday.global ? (
                                      <Badge variant="secondary" className="text-xs">
                                        Nacional
                                      </Badge>
                                    ) : (
                                      holiday.counties &&
                                      holiday.counties.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          {holiday.counties.length === 1
                                            ? getRegionName(holiday.counties[0])
                                            : `${holiday.counties.length} regiones`}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                  <span className="text-muted-foreground text-xs">
                                    {format(new Date(holiday.date), "PPP", { locale: es })}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
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

                    <FormField
                      control={form.control}
                      name="costCenterId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Centro de Coste</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? "__none__"}
                            disabled={!requiresCostCenter}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white" aria-disabled={!requiresCostCenter}>
                                <SelectValue placeholder="Selecciona un centro" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Sin centro asignado</SelectItem>
                              {costCenters.map((center) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {center.name}
                                  {center.code ? ` (${center.code})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {requiresCostCenter
                              ? "Selecciona el centro que usará este calendario"
                              : "Solo necesario para calendarios locales"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

            <DialogFooter className="bg-background shrink-0 border-t px-6 py-3">
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
