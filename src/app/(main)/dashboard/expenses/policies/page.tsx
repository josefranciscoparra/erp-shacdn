import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { safePermission } from "@/lib/auth-guard";
import { getOrganizationPolicy } from "@/server/actions/expense-policies";

import { PolicySettingsForm } from "./_components/policy-settings-form";

export default async function PoliciesPage() {
  const authResult = await safePermission("manage_organization");
  if (!authResult.ok) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Políticas de Gastos"
          description="Configura los limites y requisitos para los gastos de tu organizacion."
        />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Acceso denegado"
          description="No tienes permisos para ver esta sección"
        />
      </div>
    );
  }

  const { policy, expenseMode } = await getOrganizationPolicy();

  // Transformar Decimal a number para evitar error de serialización
  const formattedPolicy = policy
    ? {
        ...policy,
        mileageRateEurPerKm: Number(policy.mileageRateEurPerKm),
        mealDailyLimit: policy.mealDailyLimit ? Number(policy.mealDailyLimit) : null,
        lodgingDailyLimit: policy.lodgingDailyLimit ? Number(policy.lodgingDailyLimit) : null,
        expenseMode: expenseMode ?? "PRIVATE", // Añadir modo
      }
    : null;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Políticas de Gastos"
        description="Configura los limites y requisitos para los gastos de tu organizacion."
      />

      {formattedPolicy ? (
        <PolicySettingsForm initialData={formattedPolicy} />
      ) : (
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      )}
    </div>
  );
}
