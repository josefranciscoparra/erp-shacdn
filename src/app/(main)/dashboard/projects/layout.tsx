import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface ProjectsLayoutProps {
  readonly children: ReactNode;
}

export default async function ProjectsLayout({ children }: ProjectsLayoutProps) {
  const { availability } = await getOrganizationModuleState();

  if (!availability.projects) {
    notFound();
  }

  return <>{children}</>;
}
