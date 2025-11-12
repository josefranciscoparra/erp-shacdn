"use client";

import { useEffect, useState } from "react";

import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { ShiftSelectionTable } from "@/components/shifts/shift-selection-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateBeforePublish } from "@/server/actions/shift-publishing";
import { useShiftConfigurationStore } from "@/stores/shift-configuration-store";
import { useShiftsStore } from "@/stores/shifts-store";

export function PublishShifts() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<any>(null);

  const { shifts, fetchShifts, publishShifts, isLoading } = useShiftsStore();
  const { config } = useShiftConfigurationStore();

  const weekStartDay = config?.weekStartDay ?? 1;

  useEffect(() => {
    // Cargar turnos de la semana actual
    fetchShifts({
      dateFrom: currentWeekStart,
      dateTo: addDays(currentWeekStart, 6),
      status: "DRAFT", // Solo turnos en borrador
    });
  }, [currentWeekStart, fetchShifts]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    setSelectedIds([]);
    setValidation(null);
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    setSelectedIds([]);
    setValidation(null);
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: weekStartDay }));
    setSelectedIds([]);
    setValidation(null);
  };

  const handleValidate = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un turno");
      return;
    }

    setValidating(true);
    try {
      const result = await validateBeforePublish(selectedIds);
      setValidation(result);

      if (!result.canPublish) {
        toast.error("Algunos turnos tienen errores y no pueden publicarse");
      } else if (result.warnings.length > 0) {
        toast.warning("Hay advertencias en los turnos seleccionados");
      } else {
        toast.success("Todos los turnos son válidos para publicar");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al validar turnos");
    } finally {
      setValidating(false);
    }
  };

  const handlePublish = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un turno");
      return;
    }

    try {
      await publishShifts(selectedIds);

      if (config?.publishRequiresApproval) {
        toast.success(`${selectedIds.length} turno(s) enviado(s) a aprobación`);
      } else {
        toast.success(`${selectedIds.length} turno(s) publicado(s) correctamente`);
      }

      // Resetear selección y recargar
      setSelectedIds([]);
      setValidation(null);
      fetchShifts({
        dateFrom: currentWeekStart,
        dateTo: addDays(currentWeekStart, 6),
        status: "DRAFT",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al publicar turnos");
    }
  };

  const draftShifts = shifts.filter((s) => s.status === "DRAFT");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 @4xl/main:flex-row @4xl/main:items-center @4xl/main:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Publicar Turnos</h1>
          <p className="text-muted-foreground">Selecciona y publica turnos para que sean visibles por los empleados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Semana del {format(currentWeekStart, "d 'de' MMMM yyyy", { locale: es })}
        </h2>
        {config?.publishRequiresApproval && (
          <Alert className="w-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Los turnos requerirán aprobación antes de publicarse
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
            <div>
              <div className="text-muted-foreground text-sm">Turnos en borrador</div>
              <div className="text-2xl font-bold">{draftShifts.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">Seleccionados</div>
              <div className="text-2xl font-bold">{selectedIds.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">Acción</div>
              <div className="text-sm font-medium">
                {config?.publishRequiresApproval ? "Enviar a aprobación" : "Publicar directamente"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation results */}
      {validation && (
        <>
          {validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores encontrados</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {validation.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Advertencias</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {validation.warnings.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation.canPublish && validation.errors.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Listo para publicar</AlertTitle>
              <AlertDescription>Todos los turnos seleccionados son válidos y pueden publicarse</AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Shifts table */}
      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Cargando turnos...</p>
        </div>
      ) : draftShifts.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="mt-4 text-lg font-semibold">No hay turnos pendientes</h3>
              <p className="text-muted-foreground text-sm">Todos los turnos de esta semana están publicados</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ShiftSelectionTable shifts={draftShifts} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      )}

      {/* Actions */}
      {draftShifts.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleValidate} disabled={selectedIds.length === 0 || validating}>
            {validating ? "Validando..." : "Validar Selección"}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={selectedIds.length === 0 || isLoading || (validation && !validation.canPublish)}
          >
            <Send className="mr-2 h-4 w-4" />
            {config?.publishRequiresApproval ? "Enviar a Aprobación" : "Publicar Turnos"}
          </Button>
        </div>
      )}
    </div>
  );
}
