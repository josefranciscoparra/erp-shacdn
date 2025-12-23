import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { safePermission } from "@/lib/auth-guard";

import { ResponsibilitiesList } from "./_components/responsibilities-list";

export default async function ResponsibilitiesPage() {
  const authResult = await safePermission("view_employees");
  if (!authResult.ok) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Mis Responsabilidades"
          description="Gestiona tus áreas de responsabilidad y configura notificaciones de alertas."
        />
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Acceso denegado"
          description="No tienes permisos para ver esta sección"
        />
      </div>
    );
  }
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis Responsabilidades"
        description="Gestiona tus áreas de responsabilidad y configura notificaciones de alertas."
      />

      <ResponsibilitiesList />
    </div>
  );
}
