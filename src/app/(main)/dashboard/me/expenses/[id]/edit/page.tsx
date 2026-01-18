import { getOrganizationPolicy } from "@/server/actions/expense-policies";

import { serializeExpensePolicy } from "../../_lib/expense-policy";

import EditExpenseClient from "./edit-expense-client";

export default async function EditExpensePage() {
  const { policy, expenseMode } = await getOrganizationPolicy();
  const serializedPolicy = serializeExpensePolicy(policy, expenseMode);

  return <EditExpenseClient policy={serializedPolicy} />;
}
