import { redirect } from "next/navigation";

import { Role } from "@prisma/client";
import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { auth } from "@/lib/auth";
import { getModuleAvailability } from "@/lib/organization-modules";
import { prisma } from "@/lib/prisma";

import { SettingsContainer } from "../_components/settings-container";

export default async function SuperadminSettingsPage() {
  const session = await auth();

  if (!session?.user?.orgId) {
    redirect("/auth/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Configuracion" subtitle="Configuracion avanzada del sistema" />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Acceso denegado"
          description="No tienes permisos para acceder a esta seccion"
        />
      </div>
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: {
      geolocationEnabled: true,
      chatEnabled: true,
      shiftsEnabled: true,
      whistleblowingEnabled: true,
      expenseMode: true,
      features: true,
    },
  });

  if (!organization) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Configuracion" subtitle="Configuracion avanzada del sistema" />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Organizacion no encontrada"
          description="No se pudo cargar la configuracion de la organizacion."
        />
      </div>
    );
  }

  return (
    <SettingsContainer
      variant="superadmin"
      userRole={session.user.role as Role}
      orgSettings={{
        geolocationEnabled: organization.geolocationEnabled,
        chatEnabled: organization.chatEnabled,
        shiftsEnabled: organization.shiftsEnabled,
        whistleblowingEnabled: organization.whistleblowingEnabled,
        expenseMode: organization.expenseMode,
      }}
      moduleAvailability={getModuleAvailability(organization.features)}
    />
  );
}
