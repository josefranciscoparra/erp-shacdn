/**
 * Dialog para Solicitar Cambio de Turno
 *
 * Permite a un empleado solicitar:
 * - Cambiar un turno por motivos personales
 * - Sugerir otro empleado para intercambio
 * - Proponer fecha alternativa
 */

"use client";

import { useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, AlertCircle } from "lucide-react";

import { formatShiftTime, doTimesOverlap } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
import type { Shift, Employee } from "@/app/(main)/dashboard/shifts/_lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useMyShiftsStore } from "../_store/my-shifts-store";

interface ShiftChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  dayShifts?: Shift[];
  employee: Employee;
  employees: Employee[];
}

export function ShiftChangeRequestDialog({ open, onOpenChange, shift, dayShifts = [] }: ShiftChangeRequestDialogProps) {
  const { createChangeRequest, isLoadingRequests } = useMyShiftsStore();

  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!shift) return;

    if (!reason.trim()) {
      setError("Por favor, indica el motivo de la solicitud");
      return;
    }

    try {
      await createChangeRequest({
        shiftId: shift.id,
        reason: reason.trim(),
      });

      setReason("");
      setError("");
      onOpenChange(false);
    } catch {
      setError("Error al enviar la solicitud. Inténtalo de nuevo.");
    }
  };

  const handleCancel = () => {
    setReason("");
    setError("");
    onOpenChange(false);
  };

  if (!shift) return null;

  const absences = dayShifts.filter((s) => {
    const role = s.role?.toLowerCase() ?? "";
    return role.includes("vacaciones") || role.includes("ausencia");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Cambio de Turno</DialogTitle>
          <DialogDescription>
            Envía una solicitud a tu supervisor para cambiar este turno. Se te notificará cuando sea revisada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del turno */}
          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <Calendar className="text-muted-foreground h-4 w-4" />
              <span className="font-semibold">
                {format(new Date(shift.date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">{formatShiftTime(shift.startTime, shift.endTime)}</Badge>
              {shift.breakMinutes && shift.breakMinutes > 0 && (
                <Badge variant="outline" className="text-xs">
                  {shift.breakMinutes}min descanso
                </Badge>
              )}
            </div>

            {absences.length > 0 && (
              <div className="border-border mt-3 border-t pt-3">
                <h4 className="text-muted-foreground mb-2 text-xs font-semibold">Ausencias / Vacaciones</h4>
                {absences.map((absence) => {
                  const isOverlap =
                    absence.startTime === "00:00" ||
                    doTimesOverlap(shift.startTime, shift.endTime, absence.startTime, absence.endTime);

                  return (
                    <div key={absence.id} className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {absence.role ?? "Ausencia"}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-900/20 dark:text-orange-300"
                        >
                          {absence.startTime === "00:00"
                            ? "Total"
                            : formatShiftTime(absence.startTime, absence.endTime)}
                        </Badge>
                      </div>
                      {isOverlap && (
                        <div className="flex items-center gap-1 text-xs text-orange-600/80 dark:text-orange-400/80">
                          <AlertCircle className="h-3 w-3" />
                          <span>Coincide con el horario del turno</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo de la solicitud <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ejemplo: Tengo una cita médica ese día a las 10:00..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              rows={4}
              className="resize-none"
            />
            <p className="text-muted-foreground text-xs">
              Explica el motivo del cambio para ayudar a tu supervisor a tomar una decisión
            </p>
          </div>

          {/* Información adicional */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Tu solicitud será enviada a tu supervisor para revisión. Recibirás una notificación cuando sea aprobada o
              rechazada. Mientras tanto, el turno permanecerá asignado.
            </AlertDescription>
          </Alert>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoadingRequests}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoadingRequests}>
            {isLoadingRequests ? "Enviando..." : "Enviar Solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
