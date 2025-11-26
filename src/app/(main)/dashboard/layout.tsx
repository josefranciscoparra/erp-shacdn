import { ReactNode } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { PasswordGuard } from "@/components/auth/password-guard";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { QuickClockWidget } from "@/components/time-tracking/quick-clock-widget";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SidebarVariant, SidebarCollapsible } from "@/types/preferences/layout";

import { ChatStreamProvider } from "./_components/chat-stream-provider";
import { FeaturesInitializer } from "./_components/features-initializer";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { SearchDialog } from "./_components/sidebar/search-dialog";

export const runtime = "nodejs";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  // Verificar autenticación
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Cargar features de la organización en el servidor (cero delay en cliente)
  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: {
      chatEnabled: true,
      shiftsEnabled: true,
      expenseMode: true,
      // Futuros módulos aquí
    },
  });

  const orgFeatures = {
    chatEnabled: org?.chatEnabled ?? false,
    shiftsEnabled: org?.shiftsEnabled ?? false,
    expenseMode: org?.expenseMode ?? "PRIVATE",
    // Futuros módulos aquí
  };

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // Valores fijos para sidebar (no personalizables)
  const sidebarVariant: SidebarVariant = "inset";
  const sidebarCollapsible: SidebarCollapsible = "icon";

  // Crear usuario para AccountSwitcher desde la sesión
  const currentUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image ?? "",
    role: session.user.role,
    orgId: session.user.orgId,
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <FeaturesInitializer initialFeatures={orgFeatures} />
      <ChatStreamProvider enabled={orgFeatures.chatEnabled} />
      <AppSidebar variant={sidebarVariant} collapsible={sidebarCollapsible} user={currentUser} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
              <SearchDialog />
            </div>
            <div className="flex items-center gap-3">
              <QuickClockWidget />
              <Separator orientation="vertical" className="mx-2 hidden data-[orientation=vertical]:h-4 md:block" />
              <div className="flex items-center gap-2">
                <NotificationBell />
                <LayoutControls />
              </div>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <div className="@container/main p-4 md:p-6">
            <PasswordGuard>{children}</PasswordGuard>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
