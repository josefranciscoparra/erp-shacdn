import { auth } from "@/lib/auth";
import { getOrganizationPolicy } from "@/server/actions/expense-policies";
import { getExpenseRecipients } from "@/server/actions/expenses";

import { serializeExpensePolicy } from "../_lib/expense-policy";

import ExpenseDetailClient from "./expense-detail-client";

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
  const { policy, expenseMode } = await getOrganizationPolicy();
  const serializedPolicy = serializeExpensePolicy(policy, expenseMode);
  const session = await auth();
  const isHrRole = session?.user?.role === "HR_ADMIN" || session?.user?.role === "HR_ASSISTANT";
  let recipients: Array<{
    id: string;
    name: string | null;
    email: string | null;
    level: number | null;
    decision: "PENDING" | "APPROVED" | "REJECTED" | null;
    source:
      | "DIRECT_MANAGER"
      | "TEAM_RESPONSIBLE"
      | "DEPARTMENT_RESPONSIBLE"
      | "COST_CENTER_RESPONSIBLE"
      | "APPROVER_LIST"
      | "GROUP_HR"
      | "HR_ADMIN"
      | "ORG_ADMIN"
      | null;
  }> | null = null;

  if (isHrRole) {
    const recipientsResult = await getExpenseRecipients(params.id);
    recipients = recipientsResult.success ? recipientsResult.recipients : [];
  }

  return <ExpenseDetailClient policy={serializedPolicy} recipients={recipients} />;
}
