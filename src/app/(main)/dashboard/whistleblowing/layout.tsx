import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface WhistleblowingLayoutProps {
  readonly children: ReactNode;
}

export default async function WhistleblowingLayout({ children }: WhistleblowingLayoutProps) {
  const { availability, org } = await getOrganizationModuleState();

  if (!availability.whistleblowing || !org.whistleblowingEnabled) {
    notFound();
  }

  return <>{children}</>;
}
