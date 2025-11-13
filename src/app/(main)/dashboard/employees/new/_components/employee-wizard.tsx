"use client";

import { useState, useRef } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { type ScheduleFormData } from "@/components/schedules/schedule-form";
import { StickyActionBar } from "@/components/wizard/sticky-action-bar";
import { WizardSteps } from "@/components/wizard/wizard-steps";
import { type CreateEmployeeInput } from "@/lib/validations/employee";
import { type CreateContractData } from "@/stores/contracts-store";
import { useEmployeesStore } from "@/stores/employees-store";

import { WizardStep1Employee } from "./wizard-step-1-employee";
import { WizardStep2Contract } from "./wizard-step-2-contract";
import { WizardStep3Schedule } from "./wizard-step-3-schedule";

const WIZARD_STEPS = [
  { label: "Empleado", description: "Datos personales" },
  { label: "Contrato", description: "Información laboral" },
  { label: "Horarios", description: "Jornada y horarios" },
];

export function EmployeeWizard() {
  const router = useRouter();
  const { fetchEmployees } = useEmployeesStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [contractId, setContractId] = useState<string | null>(null);

  // Referencias a las funciones de submit de cada paso
  const step1SubmitRef = useRef<(() => void) | null>(null);
  const step2SubmitRef = useRef<(() => void) | null>(null);
  const step3SubmitRef = useRef<(() => void) | null>(null);

  // Paso 1: Crear empleado
  const handleEmployeeSubmit = async (data: CreateEmployeeInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Error al crear empleado");
      }

      // Guardar ID y nombre del empleado
      setEmployeeId(result.id);
      setEmployeeName(`${data.firstName} ${data.lastName}${data.secondLastName ? ` ${data.secondLastName}` : ""}`);

      // Marcar paso 1 como completado
      setCompletedSteps((prev) => [...prev, 1]);

      // Avanzar a paso 2
      setCurrentStep(2);

      toast.success("Empleado creado", {
        description: result.userCreated
          ? `Usuario creado con contraseña temporal: ${result.temporaryPassword}`
          : "Empleado registrado exitosamente",
      });
    } catch (error) {
      toast.error("Error al crear empleado", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Crear contrato
  const handleContractSubmit = async (data: CreateContractData | null) => {
    if (!employeeId) {
      toast.error("Error", { description: "No se encontró el ID del empleado" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Error al crear contrato");
      }

      // Guardar ID del contrato
      setContractId(result.id);

      // Marcar paso 2 como completado
      setCompletedSteps((prev) => [...prev, 2]);

      // Avanzar a paso 3
      setCurrentStep(3);

      toast.success("Contrato creado exitosamente");
    } catch (error) {
      toast.error("Error al crear contrato", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 3: Actualizar horarios (opcional)
  const handleScheduleSubmit = async (data: ScheduleFormData | null) => {
    if (!contractId) {
      toast.error("Error", { description: "No se encontró el ID del contrato" });
      return;
    }

    // Si data es null, significa que se saltó la configuración de horarios
    // En ese caso, simplemente finalizamos sin actualizar
    if (!data) {
      await finishWizard();
      return;
    }

    setIsLoading(true);
    try {
      // Obtener el contrato actual para mantener sus campos
      const contractResponse = await fetch(`/api/contracts/${contractId}`, {
        credentials: "include",
      });

      if (!contractResponse.ok) {
        throw new Error("Error al cargar contrato");
      }

      const contract = await contractResponse.json();

      // Preparar payload con campos del contrato + horarios actualizados
      const payload = {
        contractType: contract.contractType,
        startDate: contract.startDate?.split("T")[0] ?? "",
        endDate: contract.endDate ? contract.endDate.split("T")[0] : null,
        grossSalary: contract.grossSalary ? Number(contract.grossSalary) : null,
        positionId: contract.position?.id ?? null,
        departmentId: contract.department?.id ?? null,
        costCenterId: contract.costCenter?.id ?? null,
        managerId: contract.manager?.id ?? null,
        // Horarios del formulario
        weeklyHours: data.weeklyHours,
        workingDaysPerWeek: data.workingDaysPerWeek ?? 5,
        hasIntensiveSchedule: data.hasIntensiveSchedule ?? false,
        intensiveStartDate: data.intensiveStartDate ?? null,
        intensiveEndDate: data.intensiveEndDate ?? null,
        intensiveWeeklyHours: data.intensiveWeeklyHours ?? null,
        hasCustomWeeklyPattern: data.hasCustomWeeklyPattern ?? false,
        mondayHours: data.hasCustomWeeklyPattern ? (data.mondayHours ?? 0) : null,
        tuesdayHours: data.hasCustomWeeklyPattern ? (data.tuesdayHours ?? 0) : null,
        wednesdayHours: data.hasCustomWeeklyPattern ? (data.wednesdayHours ?? 0) : null,
        thursdayHours: data.hasCustomWeeklyPattern ? (data.thursdayHours ?? 0) : null,
        fridayHours: data.hasCustomWeeklyPattern ? (data.fridayHours ?? 0) : null,
        saturdayHours: data.hasCustomWeeklyPattern ? (data.saturdayHours ?? 0) : null,
        sundayHours: data.hasCustomWeeklyPattern ? (data.sundayHours ?? 0) : null,
        intensiveMondayHours:
          data.hasCustomWeeklyPattern && data.hasIntensiveSchedule ? (data.intensiveMondayHours ?? 0) : null,
        intensiveTuesdayHours:
          data.hasCustomWeeklyPattern && data.hasIntensiveSchedule ? (data.intensiveTuesdayHours ?? 0) : null,
        intensiveWednesdayHours:
          data.hasCustomWeeklyPattern && data.hasIntensiveSchedule ? (data.intensiveWednesdayHours ?? 0) : null,
        intensiveThursdayHours:
          data.hasCustomWeeklyPattern && data.hasIntensiveSchedule ? (data.intensiveThursdayHours ?? 0) : null,
        intensiveFridayHours:
          data.hasCustomWeeklyPattern && data.hasIntensiveSchedule ? (data.intensiveFridayHours ?? 0) : null,
        intensiveSaturdayHours:
          data.hasCustomWeeklyPattern && data.hasIntensiveSchedule ? (data.intensiveSaturdayHours ?? 0) : null,
        intensiveSundayHours:
          data.hasCustomWeeklyPattern && data.hasIntensiveSchedule ? (data.intensiveSundayHours ?? 0) : null,
      };

      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Error al actualizar horarios");
      }

      toast.success("Horarios configurados exitosamente");

      // Finalizar wizard
      await finishWizard();
    } catch (error) {
      toast.error("Error al configurar horarios", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Finalizar wizard
  const finishWizard = async () => {
    // Marcar paso 3 como completado
    setCompletedSteps((prev) => [...prev, 3]);

    // Refrescar lista de empleados
    await fetchEmployees();

    // Redirigir a la lista con highlight
    router.push(`/dashboard/employees?highlight=${employeeId}`);
  };

  // Manejar navegación: Anterior
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Manejar navegación: Siguiente/Finalizar
  const handleNext = () => {
    // Disparar el submit del formulario del paso actual
    if (currentStep === 1 && step1SubmitRef.current) {
      step1SubmitRef.current();
    } else if (currentStep === 2) {
      // Para paso 2, necesitamos manejar el caso de skip
      // Si hay un form oculto (cuando skip está true), lo submitimos
      const hiddenForm = document.getElementById("wizard-step-2-form") as HTMLFormElement;
      if (hiddenForm) {
        hiddenForm.requestSubmit();
      } else {
        // Si no hay form oculto, significa que el formulario está visible
        // y será submitido por el ContractFormSimplified
      }
    } else if (currentStep === 3) {
      // Similar para paso 3
      const hiddenForm = document.getElementById("wizard-step-3-form") as HTMLFormElement;
      if (hiddenForm) {
        hiddenForm.requestSubmit();
      } else {
        // Si no hay form oculto, será submitido por el ScheduleForm
      }
    }
  };

  // Manejar cancelación
  const handleCancel = () => {
    router.push("/dashboard/employees");
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header con stepper */}
      <div className="space-y-2">
        <WizardSteps steps={WIZARD_STEPS} currentStep={currentStep} completedSteps={completedSteps} />

        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            {currentStep === 1 && "Registra los datos básicos del empleado"}
            {currentStep === 2 && "Configura el contrato laboral"}
            {currentStep === 3 && "Define los horarios de trabajo"}
          </p>
        </div>
      </div>

      {/* Contenido del paso actual */}
      <div className="animate-in fade-in-50 slide-in-from-right-4 duration-300">
        {currentStep === 1 && (
          <WizardStep1Employee
            onSubmit={handleEmployeeSubmit}
            isLoading={isLoading}
            onTriggerSubmit={(submitFn) => {
              step1SubmitRef.current = submitFn;
            }}
          />
        )}

        {currentStep === 2 && employeeId && (
          <WizardStep2Contract
            employeeId={employeeId}
            employeeName={employeeName}
            onSubmit={handleContractSubmit}
            isLoading={isLoading}
          />
        )}

        {currentStep === 3 && contractId && (
          <WizardStep3Schedule contractId={contractId} onSubmit={handleScheduleSubmit} isLoading={isLoading} />
        )}
      </div>

      {/* Barra de acciones sticky */}
      <StickyActionBar
        onCancel={handleCancel}
        onPrevious={currentStep > 1 ? handlePrevious : undefined}
        onNext={handleNext}
        isLoading={isLoading}
        isFirstStep={currentStep === 1}
        isLastStep={currentStep === 3}
      />
    </div>
  );
}
