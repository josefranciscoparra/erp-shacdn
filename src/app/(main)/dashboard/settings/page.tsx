import { redirect } from "next/navigation";

import { Role } from "@prisma/client";
import { ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { auth } from "@/lib/auth";
import { getModuleAvailability } from "@/lib/organization-modules";
import { prisma } from "@/lib/prisma";

import { SettingsContainer } from "./_components/settings-container";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.orgId) {
    redirect("/auth/login");
  }

  // Obtener configuración de la organización para feature flags
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
        <SectionHeader title="Configuración" subtitle="Gestiona las preferencias de tu organización" />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Organización no encontrada"
          description="No se pudo cargar la configuración de la organización."
        />
      </div>
    );
  }

  return (
    <PermissionGuard
      permission="manage_organization"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Configuración" subtitle="Gestiona las preferencias de tu organización" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para acceder a la configuración"
          />
        </div>
      }
    >
      <SettingsContainer
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
    </PermissionGuard>
  );
}
