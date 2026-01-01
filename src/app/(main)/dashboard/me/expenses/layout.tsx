import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface MyExpensesLayoutProps {
  readonly children: ReactNode;
}

export default async function MyExpensesLayout({ children }: MyExpensesLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.expenses) {
    notFound();
  }

  return <>{children}</>;
}
