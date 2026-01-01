import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface MyProceduresLayoutProps {
  readonly children: ReactNode;
}

export default async function MyProceduresLayout({ children }: MyProceduresLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.expenses) {
    notFound();
  }

  return <>{children}</>;
}
