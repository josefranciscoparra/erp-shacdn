import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface SignaturesLayoutProps {
  readonly children: ReactNode;
}

export default async function SignaturesLayout({ children }: SignaturesLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.signatures) {
    notFound();
  }

  return <>{children}</>;
}
