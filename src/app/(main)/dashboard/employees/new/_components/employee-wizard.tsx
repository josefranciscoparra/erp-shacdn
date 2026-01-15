"use client";

import { useState, useRef, useEffect } from "react";

import { useRouter } from "next/navigation";

import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { StickyActionBar } from "@/components/wizard/sticky-action-bar";
import { WizardSteps } from "@/components/wizard/wizard-steps";
import { cn } from "@/lib/utils";
import { type CreateEmployeeInput } from "@/lib/validations/employee";
import { type CreateContractData } from "@/stores/contracts-store";
import { useEmployeesStore } from "@/stores/employees-store";

import { WizardStep1Employee } from "./wizard-step-1-employee";
import { WizardStep2Contract } from "./wizard-step-2-contract";
import { type ScheduleAssignmentData, WizardStep3ScheduleV2 } from "./wizard-step-3-schedule-v2";

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
  const [isExiting, setIsExiting] = useState(false);

  // Estado local para datos de cada paso (no se crean en BD hasta el final)
  const [employeeData, setEmployeeData] = useState<CreateEmployeeInput | null>(null);
  const [contractData, setContractData] = useState<CreateContractData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleAssignmentData | null>(null);

  // Referencias a las funciones de submit de cada paso
  const step1SubmitRef = useRef<(() => void) | null>(null);
  const step2SubmitRef = useRef<(() => void) | null>(null);
  const step3SubmitRef = useRef<(() => void) | null>(null);

  // Limpiar estado al desmontar el componente (evitar datos residuales)
  useEffect(() => {
    return () => {
      setEmployeeData(null);
      setContractData(null);
      setScheduleData(null);
      setCompletedSteps([]);
      setCurrentStep(1);
    };
  }, []);

  // Paso 1: Guardar datos del empleado
  const handleEmployeeSubmit = async (data: CreateEmployeeInput) => {
    // Guardar datos en el estado (no crear en BD todavía)
    setEmployeeData(data);

    // Marcar paso 1 como completado
    setCompletedSteps((prev) => [...prev, 1]);

    // Avanzar a paso 2
    setCurrentStep(2);
  };

  // Paso 2: Guardar datos del contrato
  const handleContractSubmit = async (data: CreateContractData | null) => {
    // Guardar datos en el estado (no crear en BD todavía)
    setContractData(data);

    // Marcar paso 2 como completado
    setCompletedSteps((prev) => [...prev, 2]);

    // Avanzar a paso 3
    setCurrentStep(3);
  };

  // Paso 3: Guardar horarios y CREAR TODO en la base de datos
  const handleScheduleSubmit = async (data: ScheduleAssignmentData | null) => {
    if (!employeeData) {
      toast.error("Error", { description: "No se encontraron los datos del empleado" });
      return;
    }

    if (!contractData) {
      toast.error("Error", { description: "No se encontraron los datos del contrato" });
      return;
    }

    setIsLoading(true);
    try {
      // Combinar todos los datos en un unico payload
      const wizardPayload = {
        employee: employeeData,
        contract: {
          ...contractData,
          // Sobreescribir scheduleType si se seleccionó en el paso 3
          scheduleType: data?.scheduleType ?? contractData.scheduleType,
        },
        // Asignacion de horario V2 (si se selecciono una plantilla FIXED)
        schedule: data?.scheduleTemplateId
          ? {
              scheduleTemplateId: data.scheduleTemplateId,
              validFrom: data.validFrom?.toISOString() ?? new Date().toISOString(),
              assignmentType: data.scheduleType ?? "FIXED",
            }
          : null,
      };

      // CREAR TODO EN UNA TRANSACCIÓN ATÓMICA
      const response = await fetch("/api/employees/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(wizardPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        // Si hay detalles de validación (Zod), mostrarlos
        if (result.details && Array.isArray(result.details)) {
          const detailsMsg = result.details.map((d: any) => `• ${d.path.join(".")}: ${d.message}`).join("\n");
          throw new Error(`Datos inválidos:\n${detailsMsg}`);
        }
        throw new Error(result.error ?? "Error al crear empleado");
      }

      const createdEmployeeId = result.employeeId;
      const temporaryPassword = result.temporaryPassword;
      const userWasCreated = result.userWasCreated;
      const inviteEmailQueued = result.inviteEmailQueued ?? false;

      // Marcar paso 3 como completado
      setCompletedSteps((prev) => [...prev, 3]);

      // Refrescar lista de empleados
      await fetchEmployees();

      // TOAST FINAL - Premium con icono animado
      toast.success("Empleado creado correctamente", {
        description: "Se ha añadido a la plantilla.",
        duration: 2500,
        icon: <CheckCircle2 className="toast-check-icon h-5 w-5 text-emerald-500" />,
        classNames: {
          toast: "animate-in slide-in-from-top-2 fade-in duration-180",
        },
      });

      if (inviteEmailQueued) {
        toast.info("Invitación en cola", {
          description: "El correo se enviará en unos minutos.",
          duration: 3500,
        });
      }

      // Limpiar estado del wizard
      setEmployeeData(null);
      setContractData(null);
      setScheduleData(null);
      setCompletedSteps([]);
      setCurrentStep(1);

      // Activar animación de salida
      setIsExiting(true);

      // Esperar a que termine la animación (150ms)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Redirigir a la lista con highlight
      router.push(`/dashboard/employees?highlight=${createdEmployeeId}`);
    } catch (error) {
      toast.error("Error al crear empleado", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
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
    // Limpiar estado del wizard
    setEmployeeData(null);
    setContractData(null);
    setScheduleData(null);
    setCompletedSteps([]);
    setCurrentStep(1);

    // Redirigir
    router.push("/dashboard/employees");
  };

  return (
    <div className={cn("@container/main flex min-h-screen flex-col gap-4 md:gap-6", isExiting && "page-exit")}>
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
      <div className="animate-in fade-in-50 slide-in-from-right-4 flex-1 duration-300">
        {currentStep === 1 && (
          <WizardStep1Employee
            onSubmit={handleEmployeeSubmit}
            isLoading={isLoading}
            onTriggerSubmit={(submitFn) => {
              step1SubmitRef.current = submitFn;
            }}
            initialData={employeeData ?? undefined}
          />
        )}

        {currentStep === 2 && (
          <WizardStep2Contract
            onSubmit={handleContractSubmit}
            isLoading={isLoading}
            initialData={contractData ?? undefined}
          />
        )}

        {currentStep === 3 && (
          <WizardStep3ScheduleV2
            onSubmit={handleScheduleSubmit}
            isLoading={isLoading}
            initialData={scheduleData ?? undefined}
          />
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
