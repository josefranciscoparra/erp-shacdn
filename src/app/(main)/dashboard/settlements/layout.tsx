import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface SettlementsLayoutProps {
  readonly children: ReactNode;
}

export default async function SettlementsLayout({ children }: SettlementsLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.payroll) {
    notFound();
  }

  return <>{children}</>;
}
