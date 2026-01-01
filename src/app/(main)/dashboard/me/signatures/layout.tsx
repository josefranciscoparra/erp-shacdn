import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface MySignaturesLayoutProps {
  readonly children: ReactNode;
}

export default async function MySignaturesLayout({ children }: MySignaturesLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.signatures) {
    notFound();
  }

  return <>{children}</>;
}
