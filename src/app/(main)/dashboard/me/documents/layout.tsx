import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface MyDocumentsLayoutProps {
  readonly children: ReactNode;
}

export default async function MyDocumentsLayout({ children }: MyDocumentsLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.documents) {
    notFound();
  }

  return <>{children}</>;
}
