import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface ProceduresLayoutProps {
  readonly children: ReactNode;
}

export default async function ProceduresLayout({ children }: ProceduresLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.expenses) {
    notFound();
  }

  return <>{children}</>;
}
