import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { safePermission } from "@/lib/auth-guard";

import { EmployeeWizard } from "./_components/employee-wizard";

export default async function NewEmployeePage() {
  const authResult = await safePermission("manage_employees");
  if (!authResult.ok) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Nuevo empleado" />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Acceso denegado"
          description="No tienes permisos para ver esta sección"
        />
      </div>
    );
  }
  return <EmployeeWizard />;
}
