import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface PayslipsLayoutProps {
  readonly children: ReactNode;
}

export default async function PayslipsLayout({ children }: PayslipsLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.payroll) {
    notFound();
  }

  return <>{children}</>;
}
