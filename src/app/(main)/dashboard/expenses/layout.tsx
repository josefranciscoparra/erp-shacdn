import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface ExpensesLayoutProps {
  readonly children: ReactNode;
}

export default async function ExpensesLayout({ children }: ExpensesLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.expenses) {
    notFound();
  }

  return <>{children}</>;
}
