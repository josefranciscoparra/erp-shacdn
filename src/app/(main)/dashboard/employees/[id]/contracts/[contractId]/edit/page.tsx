"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { ContractFormSimplified } from "@/components/contracts/contract-form-simplified";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { type CreateContractData, type Contract, useContractsStore } from "@/stores/contracts-store";

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
}

export default function EditContractPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
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

        // Cargar contrato
        const contractRes = await fetch(`/api/contracts/${params.contractId}`);
        if (!contractRes.ok) {
          throw new Error("Contrato no encontrado");
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

    if (params.id && params.contractId) {
      fetchData();
    }
  }, [params.id, params.contractId]);

  const handleSubmit = async (data: CreateContractData) => {
    if (!contract) return;

    try {
      await updateContract(contract.id, data);
      toast.success("Contrato actualizado exitosamente");
      router.push(`/dashboard/employees/${params.id}/contracts`);
    } catch (error: any) {
      toast.error("Error al actualizar contrato", {
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

  if (error || !employee || !contract) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Error"
          backButton={{
            href: `/dashboard/employees/${params.id}/contracts`,
            label: "Volver a contratos",
          }}
        />
        <EmptyState
          icon={<AlertCircle className="text-destructive mx-auto h-12 w-12" />}
          title="Error al cargar contrato"
          description={error ?? "No se pudo cargar el contrato"}
        />
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Editar Contrato"
        description={`Modificar contrato laboral de ${fullName}`}
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
        contract={contract}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isUpdating}
      />
    </div>
  );
}
