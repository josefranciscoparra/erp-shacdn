"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { ScheduleForm, type ScheduleFormData } from "@/components/schedules/schedule-form";
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
        const employeeRes = await fetch(`/api/employees/${params.id}`);
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
        const contractRes = await fetch(`/api/contracts/${activeContract.id}`);
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

  const handleSubmit = async (data: ScheduleFormData) => {
    if (!contract) return;

    try {
      // Preparar payload con solo los campos de horarios
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
        // Actualizar campos de horarios
        weeklyHours: data.weeklyHours,
        workingDaysPerWeek: data.workingDaysPerWeek ?? 5,
        hasIntensiveSchedule: data.hasIntensiveSchedule ?? false,
        intensiveStartDate:
          data.intensiveStartDate && data.intensiveStartDate.trim().length > 0 ? data.intensiveStartDate.trim() : null,
        intensiveEndDate:
          data.intensiveEndDate && data.intensiveEndDate.trim().length > 0 ? data.intensiveEndDate.trim() : null,
        intensiveWeeklyHours: data.hasIntensiveSchedule ? (data.intensiveWeeklyHours ?? null) : null,
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

      await updateContract(contract.id, payload);
      toast.success("Horarios actualizados exitosamente");
      router.push(`/dashboard/employees/${params.id}/schedules`);
    } catch (error: any) {
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

  const initialData: Partial<ScheduleFormData> = {
    weeklyHours: toNumber(contract.weeklyHours) ?? 40,
    workingDaysPerWeek: toNumber(contract.workingDaysPerWeek) ?? 5,
    hasIntensiveSchedule: contract.hasIntensiveSchedule ?? false,
    intensiveStartDate: contract.intensiveStartDate ?? "",
    intensiveEndDate: contract.intensiveEndDate ?? "",
    intensiveWeeklyHours: toNumber(contract.intensiveWeeklyHours),
    hasCustomWeeklyPattern: contract.hasCustomWeeklyPattern ?? false,
    mondayHours: toNumber(contract.mondayHours),
    tuesdayHours: toNumber(contract.tuesdayHours),
    wednesdayHours: toNumber(contract.wednesdayHours),
    thursdayHours: toNumber(contract.thursdayHours),
    fridayHours: toNumber(contract.fridayHours),
    saturdayHours: toNumber(contract.saturdayHours),
    sundayHours: toNumber(contract.sundayHours),
    intensiveMondayHours: toNumber(contract.intensiveMondayHours),
    intensiveTuesdayHours: toNumber(contract.intensiveTuesdayHours),
    intensiveWednesdayHours: toNumber(contract.intensiveWednesdayHours),
    intensiveThursdayHours: toNumber(contract.intensiveThursdayHours),
    intensiveFridayHours: toNumber(contract.intensiveFridayHours),
    intensiveSaturdayHours: toNumber(contract.intensiveSaturdayHours),
    intensiveSundayHours: toNumber(contract.intensiveSundayHours),
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

      <ScheduleForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isUpdating}
      />
    </div>
  );
}
