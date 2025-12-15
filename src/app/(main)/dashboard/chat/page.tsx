import { Suspense } from "react";

import { PersonalSpaceNoEmployeeNotice, PersonalSpaceWrongOrgNotice } from "@/components/hr/personal-space-access";
import { getEmployeeOrgAccessState } from "@/server/actions/shared/get-employee-org-access";

import { ChatContainer } from "./_components/chat-container";

export default async function ChatPage() {
  const access = await getEmployeeOrgAccessState();

  if (!access.canAccess) {
    if (access.reason === "WRONG_ORG" && access.employeeOrg) {
      return (
        <PersonalSpaceWrongOrgNotice
          employeeOrgId={access.employeeOrg.id}
          employeeOrgName={access.employeeOrg.name}
          viewingOrgName={access.activeOrg?.name ?? "otra empresa"}
        />
      );
    }

    return <PersonalSpaceNoEmployeeNotice userRole={access.userRole ?? undefined} />;
  }

  return (
    <div
      className="@container/main flex min-h-0 flex-col md:h-[calc(100dvh-7rem)]"
      style={{
        // En móvil: altura completa menos header del dashboard (7rem)
        // svh = small viewport height (no incluye barras del navegador en iOS)
        height: "calc(100svh - 7rem)",
        // En desktop: altura dinámica normal
        maxHeight: "calc(100vh - 7rem)",
      }}
    >
      <Suspense fallback={<ChatSkeleton />}>
        <ChatContainer />
      </Suspense>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">Cargando mensajes...</p>
      </div>
    </div>
  );
}
