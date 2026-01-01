import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface ShiftsLayoutProps {
  readonly children: ReactNode;
}

export default async function ShiftsLayout({ children }: ShiftsLayoutProps) {
  const { availability, org } = await getOrganizationModuleState();

  if (!availability.shifts || !org.shiftsEnabled) {
    notFound();
  }

  return <>{children}</>;
}
