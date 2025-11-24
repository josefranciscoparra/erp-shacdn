import { getOrganizationPolicy } from "@/server/actions/expense-policies";

import EditExpenseClient from "./edit-expense-client";

export default async function EditExpensePage() {
  const { policy } = await getOrganizationPolicy();

  // Serializar para cliente
  const serializedPolicy = policy
    ? {
        mileageRate: Number(policy.mileageRateEurPerKm),
      }
    : undefined;

  return <EditExpenseClient policy={serializedPolicy} />;
}
