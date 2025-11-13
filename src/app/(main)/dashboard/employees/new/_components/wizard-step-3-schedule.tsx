"use client";

import { useState } from "react";

import { Info } from "lucide-react";

import { ScheduleForm, type ScheduleFormData } from "@/components/schedules/schedule-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface WizardStep3ScheduleProps {
  onSubmit: (data: ScheduleFormData | null) => Promise<void>;
  isLoading?: boolean;
  initialData?: ScheduleFormData | null;
}

export function WizardStep3Schedule({ onSubmit, isLoading = false, initialData }: WizardStep3ScheduleProps) {
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
    <div className="mx-auto max-w-4xl space-y-6 pb-6">
      {/* Switch compacto */}
      <div className="border-muted bg-muted/30 hover:border-primary/40 flex items-center justify-between rounded-xl border-2 p-5 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex-1 space-y-1">
          <Label htmlFor="skip-schedule" className="text-lg font-semibold">
            Configurar horarios más tarde
          </Label>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Usaremos los horarios por defecto (40h semanales, 5 días). Podrás personalizarlos después.
          </p>
        </div>
        <Switch
          id="skip-schedule"
          checked={skipSchedule}
          onCheckedChange={setSkipSchedule}
          className="data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
        />
      </div>

      {skipSchedule && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Se mantendrán los horarios por defecto (40h semanales distribuidas en 5 días).
          </AlertDescription>
        </Alert>
      )}

      {/* Formulario de horarios (solo si no está marcado el checkbox) */}
      {!skipSchedule && (
        <div className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <ScheduleForm
            initialData={
              initialData ?? {
                weeklyHours: 40,
                workingDaysPerWeek: 5,
                hasIntensiveSchedule: false,
                hasCustomWeeklyPattern: false,
              }
            }
            onSubmit={handleScheduleSubmit}
            onCancel={() => {}}
            isSubmitting={isLoading}
            hideActions={true}
            formId="wizard-step-3-form"
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
