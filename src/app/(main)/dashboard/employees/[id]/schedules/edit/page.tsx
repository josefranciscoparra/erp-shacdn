"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { WizardStep3Schedule } from "@/app/(main)/dashboard/employees/new/_components/wizard-step-3-schedule";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { useContractsStore } from "@/stores/contracts-store";

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  employmentContracts: Array<{
    id: string;
    active: boolean;
  }>;
}

export default function EditSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateContract, isUpdating } = useContractsStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Cargar empleado
        const employeeRes = await fetch(`/api/employees/${params.id}`, {
          cache: "no-store", // Fuerza fetch sin cache
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (!employeeRes.ok) {
          throw new Error("Empleado no encontrado");
        }
        const employeeData = await employeeRes.json();
        setEmployee(employeeData);

        // Encontrar contrato activo
        const activeContract = employeeData.employmentContracts?.find((c: any) => c.active);
        if (!activeContract) {
          throw new Error("No hay contrato activo");
        }

        // Cargar contrato completo
        const contractRes = await fetch(`/api/contracts/${activeContract.id}`, {
          cache: "no-store", // Fuerza fetch sin cache
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (!contractRes.ok) {
          throw new Error("Error al cargar contrato");
        }
        const contractData = await contractRes.json();
        setContract(contractData);
      } catch (error: any) {
        setError(error.message);
        toast.error("Error", { description: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleSubmit = async (data: any) => {
    console.log("🔴 handleSubmit EDIT PAGE - data recibida:", data);
    if (!contract) return;

    try {
      // Preparar payload con TODOS los campos del wizard (incluyendo FIXED)
      const payload = {
        // Mantener campos existentes del contrato
        contractType: contract.contractType,
        startDate: contract.startDate?.split("T")[0] ?? "",
        endDate: contract.endDate ? contract.endDate.split("T")[0] : null,
        grossSalary: contract.grossSalary ? Number(contract.grossSalary) : null,
        positionId: contract.position?.id ?? null,
        departmentId: contract.department?.id ?? null,
        costCenterId: contract.costCenter?.id ?? null,
        managerId: contract.manager?.id ?? null,
        // Actualizar TODOS los campos de horarios del wizard
        ...data,
      };

      console.log("🟠 Payload a enviar al servidor:", payload);
      console.log("🟠 Contract ID:", contract.id);
      await updateContract(contract.id, payload);
      console.log("🟢 updateContract completado");
      toast.success("Horarios actualizados exitosamente");
      router.push(`/dashboard/employees/${params.id}/schedules`);
    } catch (error: any) {
      console.error("❌ Error en handleSubmit:", error);
      toast.error("Error al actualizar horarios", {
        description: error.message ?? "Ocurrió un error inesperado",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Cargando..."
          backButton={{
            href: `/dashboard/employees/${params.id}/schedules`,
            label: "Volver a horarios",
          }}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !employee || !contract) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Error"
          backButton={{
            href: `/dashboard/employees/${params.id}/schedules`,
            label: "Volver a horarios",
          }}
        />
        <EmptyState
          icon={<AlertCircle className="text-destructive mx-auto h-12 w-12" />}
          title="Error al cargar horarios"
          description={error ?? "No se pudieron cargar los horarios"}
        />
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

  // Convertir datos del contrato a formato del formulario
  const toNumber = (value: any): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined;
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  };

  // Preparar TODOS los datos iniciales del contrato (incluye campos FIXED)
  const initialData = {
    // Tipo de horario
    scheduleType: contract.scheduleType ?? "FLEXIBLE",
    // Campos FLEXIBLE
    weeklyHours: toNumber(contract.weeklyHours) ?? 40,
    workingDaysPerWeek: toNumber(contract.workingDaysPerWeek) ?? 5,
    hasCustomWeeklyPattern: contract.hasCustomWeeklyPattern ?? false,
    mondayHours: toNumber(contract.mondayHours),
    tuesdayHours: toNumber(contract.tuesdayHours),
    wednesdayHours: toNumber(contract.wednesdayHours),
    thursdayHours: toNumber(contract.thursdayHours),
    fridayHours: toNumber(contract.fridayHours),
    saturdayHours: toNumber(contract.saturdayHours),
    sundayHours: toNumber(contract.sundayHours),
    // Campos FIXED - Días laborables
    workMonday: contract.workMonday ?? false,
    workTuesday: contract.workTuesday ?? false,
    workWednesday: contract.workWednesday ?? false,
    workThursday: contract.workThursday ?? false,
    workFriday: contract.workFriday ?? false,
    workSaturday: contract.workSaturday ?? false,
    workSunday: contract.workSunday ?? false,
    hasFixedTimeSlots: contract.hasFixedTimeSlots ?? false,
    // Campos FIXED - Franjas horarias normales
    mondayStartTime: contract.mondayStartTime ?? null,
    mondayEndTime: contract.mondayEndTime ?? null,
    tuesdayStartTime: contract.tuesdayStartTime ?? null,
    tuesdayEndTime: contract.tuesdayEndTime ?? null,
    wednesdayStartTime: contract.wednesdayStartTime ?? null,
    wednesdayEndTime: contract.wednesdayEndTime ?? null,
    thursdayStartTime: contract.thursdayStartTime ?? null,
    thursdayEndTime: contract.thursdayEndTime ?? null,
    fridayStartTime: contract.fridayStartTime ?? null,
    fridayEndTime: contract.fridayEndTime ?? null,
    saturdayStartTime: contract.saturdayStartTime ?? null,
    saturdayEndTime: contract.saturdayEndTime ?? null,
    sundayStartTime: contract.sundayStartTime ?? null,
    sundayEndTime: contract.sundayEndTime ?? null,
    // Campos FIXED - Pausas normales
    mondayBreakStartTime: contract.mondayBreakStartTime ?? null,
    mondayBreakEndTime: contract.mondayBreakEndTime ?? null,
    tuesdayBreakStartTime: contract.tuesdayBreakStartTime ?? null,
    tuesdayBreakEndTime: contract.tuesdayBreakEndTime ?? null,
    wednesdayBreakStartTime: contract.wednesdayBreakStartTime ?? null,
    wednesdayBreakEndTime: contract.wednesdayBreakEndTime ?? null,
    thursdayBreakStartTime: contract.thursdayBreakStartTime ?? null,
    thursdayBreakEndTime: contract.thursdayBreakEndTime ?? null,
    fridayBreakStartTime: contract.fridayBreakStartTime ?? null,
    fridayBreakEndTime: contract.fridayBreakEndTime ?? null,
    saturdayBreakStartTime: contract.saturdayBreakStartTime ?? null,
    saturdayBreakEndTime: contract.saturdayBreakEndTime ?? null,
    sundayBreakStartTime: contract.sundayBreakStartTime ?? null,
    sundayBreakEndTime: contract.sundayBreakEndTime ?? null,
    // Jornada intensiva
    hasIntensiveSchedule: contract.hasIntensiveSchedule ?? false,
    intensiveStartDate: contract.intensiveStartDate ?? "",
    intensiveEndDate: contract.intensiveEndDate ?? "",
    intensiveWeeklyHours: toNumber(contract.intensiveWeeklyHours),
    // Campos FLEXIBLE intensiva (legacy)
    intensiveMondayHours: toNumber(contract.intensiveMondayHours),
    intensiveTuesdayHours: toNumber(contract.intensiveTuesdayHours),
    intensiveWednesdayHours: toNumber(contract.intensiveWednesdayHours),
    intensiveThursdayHours: toNumber(contract.intensiveThursdayHours),
    intensiveFridayHours: toNumber(contract.intensiveFridayHours),
    intensiveSaturdayHours: toNumber(contract.intensiveSaturdayHours),
    intensiveSundayHours: toNumber(contract.intensiveSundayHours),
    // Campos FIXED - Franjas horarias intensivas
    intensiveMondayStartTime: contract.intensiveMondayStartTime ?? null,
    intensiveMondayEndTime: contract.intensiveMondayEndTime ?? null,
    intensiveTuesdayStartTime: contract.intensiveTuesdayStartTime ?? null,
    intensiveTuesdayEndTime: contract.intensiveTuesdayEndTime ?? null,
    intensiveWednesdayStartTime: contract.intensiveWednesdayStartTime ?? null,
    intensiveWednesdayEndTime: contract.intensiveWednesdayEndTime ?? null,
    intensiveThursdayStartTime: contract.intensiveThursdayStartTime ?? null,
    intensiveThursdayEndTime: contract.intensiveThursdayEndTime ?? null,
    intensiveFridayStartTime: contract.intensiveFridayStartTime ?? null,
    intensiveFridayEndTime: contract.intensiveFridayEndTime ?? null,
    intensiveSaturdayStartTime: contract.intensiveSaturdayStartTime ?? null,
    intensiveSaturdayEndTime: contract.intensiveSaturdayEndTime ?? null,
    intensiveSundayStartTime: contract.intensiveSundayStartTime ?? null,
    intensiveSundayEndTime: contract.intensiveSundayEndTime ?? null,
    // Campos FIXED - Pausas intensivas
    intensiveMondayBreakStartTime: contract.intensiveMondayBreakStartTime ?? null,
    intensiveMondayBreakEndTime: contract.intensiveMondayBreakEndTime ?? null,
    intensiveTuesdayBreakStartTime: contract.intensiveTuesdayBreakStartTime ?? null,
    intensiveTuesdayBreakEndTime: contract.intensiveTuesdayBreakEndTime ?? null,
    intensiveWednesdayBreakStartTime: contract.intensiveWednesdayBreakStartTime ?? null,
    intensiveWednesdayBreakEndTime: contract.intensiveWednesdayBreakEndTime ?? null,
    intensiveThursdayBreakStartTime: contract.intensiveThursdayBreakStartTime ?? null,
    intensiveThursdayBreakEndTime: contract.intensiveThursdayBreakEndTime ?? null,
    intensiveFridayBreakStartTime: contract.intensiveFridayBreakStartTime ?? null,
    intensiveFridayBreakEndTime: contract.intensiveFridayBreakEndTime ?? null,
    intensiveSaturdayBreakStartTime: contract.intensiveSaturdayBreakStartTime ?? null,
    intensiveSaturdayBreakEndTime: contract.intensiveSaturdayBreakEndTime ?? null,
    intensiveSundayBreakStartTime: contract.intensiveSundayBreakStartTime ?? null,
    intensiveSundayBreakEndTime: contract.intensiveSundayBreakEndTime ?? null,
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Editar Horarios"
        description={`Modificar horarios laborales de ${fullName}`}
        backButton={{
          href: `/dashboard/employees/${params.id}/schedules`,
          label: "Volver a horarios",
        }}
        badge={
          employee.employeeNumber ? (
            <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
          ) : undefined
        }
      />

      <WizardStep3Schedule initialData={initialData} onSubmit={handleSubmit} isLoading={isUpdating} isEditMode={true} />
    </div>
  );
}
