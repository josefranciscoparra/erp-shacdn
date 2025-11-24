import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedEmployee } from "@/server/actions/shared/get-authenticated-employee";

import ExpensesListClient from "./expenses-list-client";

export default async function ExpensesPage() {
  const { employee, orgId } = await getAuthenticatedEmployee();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { expenseMode: true },
  });

  if (org?.expenseMode === "PUBLIC") {
    redirect("/dashboard/my-procedures");
  }

  return <ExpensesListClient />;
}
