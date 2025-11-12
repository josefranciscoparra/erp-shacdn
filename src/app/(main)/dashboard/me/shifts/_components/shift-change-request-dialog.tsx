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
import { Calendar, Users, AlertCircle } from "lucide-react";

import { formatShiftTime } from "@/app/(main)/dashboard/shifts/_lib/shift-utils";
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
  employee: Employee;
  employees: Employee[];
}

export function ShiftChangeRequestDialog({
  open,
  onOpenChange,
  shift,
  employee,
  employees,
}: ShiftChangeRequestDialogProps) {
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
