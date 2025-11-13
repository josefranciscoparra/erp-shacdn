"use client";

import { useEffect, useState } from "react";

import { Info } from "lucide-react";

import { ContractFormSimplified } from "@/components/contracts/contract-form-simplified";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type CreateContractData } from "@/stores/contracts-store";

interface WizardStep2ContractProps {
  onSubmit: (data: CreateContractData | null) => Promise<void>;
  isLoading?: boolean;
  initialData?: CreateContractData | null;
}

export function WizardStep2Contract({ onSubmit, isLoading = false, initialData }: WizardStep2ContractProps) {
  const [skipContract, setSkipContract] = useState(false);

  // Cuando cambia skipContract, si es true, llamar onSubmit con null inmediatamente
  // Esto permite que el wizard avance automáticamente al siguiente paso
  useEffect(() => {
    if (skipContract) {
      // No llamamos onSubmit aquí, lo dejamos para cuando el usuario haga click en "Siguiente"
    }
  }, [skipContract]);

  const handleContractSubmit = async (data: CreateContractData) => {
    if (skipContract) {
      // Si está marcado, crear contrato básico automático
      const defaultContract: CreateContractData = {
        contractType: "INDEFINIDO",
        startDate: new Date().toISOString().split("T")[0],
        endDate: null,
        weeklyHours: 40,
        workingDaysPerWeek: 5,
        grossSalary: null,
        hasIntensiveSchedule: false,
        intensiveStartDate: null,
        intensiveEndDate: null,
        intensiveWeeklyHours: null,
        hasCustomWeeklyPattern: false,
        mondayHours: null,
        tuesdayHours: null,
        wednesdayHours: null,
        thursdayHours: null,
        fridayHours: null,
        saturdayHours: null,
        sundayHours: null,
        intensiveMondayHours: null,
        intensiveTuesdayHours: null,
        intensiveWednesdayHours: null,
        intensiveThursdayHours: null,
        intensiveFridayHours: null,
        intensiveSaturdayHours: null,
        intensiveSundayHours: null,
        positionId: null,
        departmentId: null,
        costCenterId: null,
        managerId: null,
      };
      await onSubmit(defaultContract);
    } else {
      // Si no está marcado, usar los datos del formulario
      await onSubmit(data);
    }
  };

  // Función que será llamada desde el wizard cuando el usuario haga click en "Siguiente"
  const handleWizardNext = () => {
    if (skipContract) {
      // Crear contrato básico automático
      const defaultContract: CreateContractData = {
        contractType: "INDEFINIDO",
        startDate: new Date().toISOString().split("T")[0],
        endDate: null,
        weeklyHours: 40,
        workingDaysPerWeek: 5,
        grossSalary: null,
        hasIntensiveSchedule: false,
        intensiveStartDate: null,
        intensiveEndDate: null,
        intensiveWeeklyHours: null,
        hasCustomWeeklyPattern: false,
        mondayHours: null,
        tuesdayHours: null,
        wednesdayHours: null,
        thursdayHours: null,
        fridayHours: null,
        saturdayHours: null,
        sundayHours: null,
        intensiveMondayHours: null,
        intensiveTuesdayHours: null,
        intensiveWednesdayHours: null,
        intensiveThursdayHours: null,
        intensiveFridayHours: null,
        intensiveSaturdayHours: null,
        intensiveSundayHours: null,
        positionId: null,
        departmentId: null,
        costCenterId: null,
        managerId: null,
      };
      return handleContractSubmit(defaultContract);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Switch compacto */}
      <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
        <div className="flex-1 space-y-0.5">
          <Label htmlFor="skip-contract" className="text-base font-semibold">
            Configurar contrato más tarde
          </Label>
          <p className="text-muted-foreground text-sm">
            Crearemos un contrato básico (Indefinido, 40h, 5 días). Podrás editarlo después.
          </p>
        </div>
        <Switch
          id="skip-contract"
          checked={skipContract}
          onCheckedChange={setSkipContract}
          className="data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
        />
      </div>

      {skipContract && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Se creará un contrato indefinido con 40 horas semanales y 5 días laborables.
          </AlertDescription>
        </Alert>
      )}

      {/* Formulario de contrato (solo si no está marcado el checkbox) */}
      {!skipContract && (
        <div className="animate-in slide-in-from-top-4">
          <ContractFormSimplified
            onSubmit={handleContractSubmit}
            onCancel={() => {}}
            isSubmitting={isLoading}
            initialData={initialData}
          />
        </div>
      )}

      {/* Formulario oculto para manejar el submit cuando skipContract está true */}
      {skipContract && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleWizardNext();
          }}
          id="wizard-step-2-form"
          className="hidden"
        />
      )}
    </div>
  );
}
