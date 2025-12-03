import { SectionHeader } from "@/components/hr/section-header";
import { getOrganizationPolicy } from "@/server/actions/expense-policies";

import { PolicySettingsForm } from "./_components/policy-settings-form";

export default async function PoliciesPage() {
  const { policy, expenseMode } = await getOrganizationPolicy();

  // Transformar Decimal a number para evitar error de serialización
  const formattedPolicy = policy
    ? {
        ...policy,
        mileageRateEurPerKm: Number(policy.mileageRateEurPerKm),
        mealDailyLimit: policy.mealDailyLimit ? Number(policy.mealDailyLimit) : null,
        lodgingDailyLimit: policy.lodgingDailyLimit ? Number(policy.lodgingDailyLimit) : null,
        expenseMode: expenseMode ?? "PRIVATE", // Añadir modo
        approvalFlow:
          ((policy as Record<string, unknown>).approvalFlow as string) ??
          ((policy.categoryRequirements as Record<string, unknown>)?.approvalFlowConfig as string) ??
          "DEFAULT",
      }
    : null;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Políticas de Gastos"
        description="Configura los límites, reglas de aprobación y requisitos para los gastos de tu organización."
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
