import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface DocumentsLayoutProps {
  readonly children: ReactNode;
}

export default async function DocumentsLayout({ children }: DocumentsLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.documents) {
    notFound();
  }

  return <>{children}</>;
}
