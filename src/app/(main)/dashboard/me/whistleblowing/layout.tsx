import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface MyWhistleblowingLayoutProps {
  readonly children: ReactNode;
}

export default async function MyWhistleblowingLayout({ children }: MyWhistleblowingLayoutProps) {
  const { availability, org } = await getOrganizationModuleState();

  if (!availability.whistleblowing || !org.whistleblowingEnabled) {
    notFound();
  }

  return <>{children}</>;
}
