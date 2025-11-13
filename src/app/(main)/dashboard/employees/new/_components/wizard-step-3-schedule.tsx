"use client";

import { useState } from "react";

import { Clock, Info } from "lucide-react";

import { ScheduleForm, type ScheduleFormData } from "@/components/schedules/schedule-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WizardStep3ScheduleProps {
  contractId: string;
  onSubmit: (data: ScheduleFormData | null) => Promise<void>;
  isLoading?: boolean;
}

export function WizardStep3Schedule({ contractId, onSubmit, isLoading = false }: WizardStep3ScheduleProps) {
  const [skipSchedule, setSkipSchedule] = useState(false);

  const handleScheduleSubmit = async (data: ScheduleFormData) => {
    if (skipSchedule) {
      // Si está marcado, mantener valores por defecto (40h, 5d)
      await onSubmit(null);
    } else {
      // Si no está marcado, usar los datos del formulario
      await onSubmit(data);
    }
  };

  // Función que será llamada desde el wizard cuando el usuario haga click en "Finalizar"
  const handleWizardFinish = () => {
    if (skipSchedule) {
      // Mantener valores por defecto
      return onSubmit(null);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Checkbox destacado */}
      <Card className="border-primary/30 rounded-lg border-2 border-dashed shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="text-primary h-5 w-5" />
            <CardTitle>Horarios Laborales</CardTitle>
          </div>
          <CardDescription>Configura los horarios del empleado o déjalo para más tarde</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-muted-foreground/40 flex items-start space-x-3 rounded-lg border border-dashed p-4 transition-colors",
              skipSchedule && "bg-muted/50",
            )}
          >
            <Checkbox
              id="skip-schedule"
              checked={skipSchedule}
              onCheckedChange={(checked) => setSkipSchedule(checked === true)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="skip-schedule"
                className="cursor-pointer text-base leading-none font-semibold peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Configurar horarios más tarde
              </Label>
              <p className="text-muted-foreground text-sm">
                Usaremos los horarios por defecto del contrato (40 horas semanales, 5 días laborables). Podrás
                personalizarlos después.
              </p>
            </div>
          </div>

          {skipSchedule && (
            <Alert className="mt-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Se mantendrán los horarios por defecto (40 horas semanales distribuidas en 5 días laborables). Podrás
                modificarlos desde el perfil del empleado.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Formulario de horarios (solo si no está marcado el checkbox) */}
      {!skipSchedule && (
        <div className="animate-in slide-in-from-top-4">
          <ScheduleForm
            initialData={{
              weeklyHours: 40,
              workingDaysPerWeek: 5,
              hasIntensiveSchedule: false,
              hasCustomWeeklyPattern: false,
            }}
            onSubmit={handleScheduleSubmit}
            onCancel={() => {}}
            isSubmitting={isLoading}
          />
        </div>
      )}

      {/* Formulario oculto para manejar el submit cuando skipSchedule está true */}
      {skipSchedule && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleWizardFinish();
          }}
          id="wizard-step-3-form"
          className="hidden"
        />
      )}
    </div>
  );
}
