import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getOrganizationPolicy } from "@/server/actions/expense-policies";
import { getAuthenticatedEmployee } from "@/server/actions/shared/get-authenticated-employee";

import { serializeExpensePolicy } from "./_lib/expense-policy";
import ExpensesListClient from "./expenses-list-client";

export default async function ExpensesPage() {
  const { orgId } = await getAuthenticatedEmployee();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { expenseMode: true },
  });

  if (org?.expenseMode === "PUBLIC") {
    redirect("/dashboard/my-procedures");
  }

  const { policy, expenseMode } = await getOrganizationPolicy();
  const serializedPolicy = serializeExpensePolicy(policy, expenseMode);

  return <ExpensesListClient policy={serializedPolicy} />;
}
