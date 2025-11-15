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
      // Si está marcado, crear contrato básico automático (SOLO datos contractuales)
      const defaultContract: CreateContractData = {
        contractType: "INDEFINIDO",
        startDate: new Date().toISOString().split("T")[0],
        endDate: null,
        grossSalary: null,
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
      // Crear contrato básico automático (SOLO datos contractuales)
      const defaultContract: CreateContractData = {
        contractType: "INDEFINIDO",
        startDate: new Date().toISOString().split("T")[0],
        endDate: null,
        grossSalary: null,
        positionId: null,
        departmentId: null,
        costCenterId: null,
        managerId: null,
      };
      return handleContractSubmit(defaultContract);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-6">
      {/* Switch compacto */}
      <div className="from-primary/15 to-card border-muted hover:border-primary/40 flex items-center justify-between rounded-xl border-2 bg-gradient-to-br p-5 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex-1 space-y-1">
          <Label htmlFor="skip-contract" className="text-lg font-semibold">
            Configurar contrato más tarde
          </Label>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Crearemos un contrato indefinido básico. Podrás editarlo después.
          </p>
        </div>
        <Switch id="skip-contract" checked={skipContract} onCheckedChange={setSkipContract} className="wizard-switch" />
      </div>

      {skipContract && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Se creará un contrato indefinido básico. Los horarios se configurarán en el siguiente paso.
          </AlertDescription>
        </Alert>
      )}

      {/* Formulario de contrato (solo si no está marcado el checkbox) */}
      {!skipContract && (
        <div className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <ContractFormSimplified
            onSubmit={handleContractSubmit}
            onCancel={() => {}}
            isSubmitting={isLoading}
            initialData={initialData}
            hideActions={true}
            formId="wizard-step-2-form"
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
