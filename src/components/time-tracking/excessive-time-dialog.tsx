"use client";

import { AlertTriangle, Calendar, Clock, TrendingUp, FileEdit, XCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ExcessiveTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excessiveInfo: {
    durationHours: number;
    dailyHours: number;
    percentageOfJourney: number;
    clockInDate: Date;
    clockInTime: Date;
    clockInId: string;
  };
  onConfirmClose: () => void;
  onGoToRegularize: () => void;
}

export function ExcessiveTimeDialog({
  open,
  onOpenChange,
  excessiveInfo,
  onConfirmClose,
  onGoToRegularize,
}: ExcessiveTimeDialogProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Fichaje de Larga Duración Detectado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <p>Este fichaje lleva abierto un tiempo inusualmente largo:</p>

            <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                  Desde: {formatDate(excessiveInfo.clockInDate)} a las {formatTime(excessiveInfo.clockInTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                  Duración: {excessiveInfo.durationHours.toFixed(1)} horas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                  {excessiveInfo.percentageOfJourney.toFixed(0)}% de tu jornada laboral ({excessiveInfo.dailyHours}h)
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">¿Qué deseas hacer?</p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1">
                <li>
                  <strong>Cerrar y cancelar:</strong> El fichaje se cerrará pero se marcará como cancelado (no contará
                  para el cómputo de horas).
                </li>
                <li>
                  <strong>Regularizar:</strong> Podrás crear una solicitud de fichaje manual con los horarios correctos.
                  Las solicitudes deben enviarse dentro de 1 día después del fichaje.
                </li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:space-x-2">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="outline" onClick={onGoToRegularize} className="gap-2">
            <FileEdit className="h-4 w-4" />
            Ir a Regularizar
          </Button>
          <Button variant="destructive" onClick={onConfirmClose} className="gap-2">
            <XCircle className="h-4 w-4" />
            Cerrar y Cancelar Fichaje
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
