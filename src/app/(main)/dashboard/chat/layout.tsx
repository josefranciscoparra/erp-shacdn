import { ReactNode } from "react";

import { notFound } from "next/navigation";

import { getOrganizationModuleState } from "@/server/guards/module-availability";

interface ChatLayoutProps {
  readonly children: ReactNode;
}

export default async function ChatLayout({ children }: ChatLayoutProps) {
  const { availability, org } = await getOrganizationModuleState();

  if (!availability.chat || !org.chatEnabled) {
    notFound();
  }

  return <>{children}</>;
}
