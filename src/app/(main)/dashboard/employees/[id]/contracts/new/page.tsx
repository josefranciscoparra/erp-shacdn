"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, Briefcase, Calendar, Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { ContractFormSimplified } from "@/components/contracts/contract-form-simplified";
import { SectionHeader } from "@/components/hr/section-header";
import { type CreateContractData, useContractsStore } from "@/stores/contracts-store";

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
}

export default function NewContractPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { createContract, isCreating } = useContractsStore();

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`/api/employees/${params.id}`);
        if (!response.ok) {
          throw new Error("Empleado no encontrado");
        }
        const data = await response.json();
        setEmployee(data);
      } catch (error: any) {
        toast.error("Error", { description: error.message });
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchEmployee();
    }
  }, [params.id, router]);

  const handleSubmit = async (data: CreateContractData) => {
    try {
      await createContract(params.id as string, data);
      toast.success("Contrato creado exitosamente");
      router.push(`/dashboard/employees/${params.id}/contracts`);
    } catch (error: any) {
      toast.error("Error al crear contrato", {
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
            href: `/dashboard/employees/${params.id}/contracts`,
            label: "Volver a contratos",
          }}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Nuevo Contrato"
        description={`Crear contrato laboral para ${fullName}`}
        backButton={{
          href: `/dashboard/employees/${params.id}/contracts`,
          label: "Volver a contratos",
        }}
        badge={
          employee.employeeNumber ? (
            <span className="text-muted-foreground font-mono text-sm">{employee.employeeNumber}</span>
          ) : undefined
        }
      />

      <ContractFormSimplified
        employeeId={params.id as string}
        employeeName={fullName}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isCreating}
      />
    </div>
  );
}
