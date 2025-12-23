import { Suspense } from "react";

import { ShieldAlert } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  getUserAccessibleCostCenters,
  getUserAccessibleDepartments,
  getUserAccessibleTeams,
} from "@/services/permissions/scope-helpers";

import { ResponsiblesManager } from "./_components/responsibles-manager";

export const metadata = {
  title: "Matriz de Responsabilidades",
};

export default async function AlertResponsiblesPage() {
  // Verificar permiso usando el sistema de permisos efectivos (con overrides)
  // Al moverlo a Organización, requerimos permiso de gestión organizativa
  const authResult = await safePermission("manage_organization");

  if (!authResult.ok) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Matriz de Responsabilidades"
          description="Gestiona la estructura de mando y visibilidad."
        />
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <ShieldAlert className="text-destructive h-6 w-6" />
            <div>
              <p className="font-medium">Acceso restringido</p>
              <p className="text-muted-foreground text-sm">{authResult.error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = authResult.session;

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { id: true, name: true },
  });

  if (!org) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Matriz de Responsabilidades" />
        <Card>
          <CardContent className="py-6">Organización no encontrada.</CardContent>
        </Card>
      </div>
    );
  }

  const [departments, costCenters, teams] = await Promise.all([
    getUserAccessibleDepartments(session.user.id, session.user.orgId),
    getUserAccessibleCostCenters(session.user.id, session.user.orgId),
    getUserAccessibleTeams(session.user.id, session.user.orgId),
  ]);

  // Obtener responsables actuales de toda la organización y agrupar por scope
  const [allResponsibles, subscriptions] = await Promise.all([
    prisma.areaResponsible.findMany({
      where: { orgId: session.user.orgId, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        costCenter: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.alertSubscription.findMany({
      where: { orgId: session.user.orgId, isActive: true },
      select: {
        id: true,
        userId: true,
        scope: true,
        departmentId: true,
        costCenterId: true,
        teamId: true,
        severityLevels: true,
        alertTypes: true,
        notifyByEmail: true,
      },
    }),
  ]);

  const groupedResponsibles = {
    organization: allResponsibles
      .filter((r) => r.scope === "ORGANIZATION")
      .map((r) => ({ ...r, responsibilityId: r.id })),
    departments: allResponsibles.filter((r) => r.scope === "DEPARTMENT").map((r) => ({ ...r, responsibilityId: r.id })),
    costCenters: allResponsibles
      .filter((r) => r.scope === "COST_CENTER")
      .map((r) => ({ ...r, responsibilityId: r.id })),
    teams: allResponsibles.filter((r) => r.scope === "TEAM").map((r) => ({ ...r, responsibilityId: r.id })),
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Matriz de Responsabilidades"
          description="Define quién gestiona cada área de la organización. Esto afecta a la visibilidad de datos, aprobación de vacaciones y recepción de alertas."
        />
      </div>

      <Suspense fallback={<LoadingState />}>
        <ResponsiblesManager
          org={org}
          departments={departments}
          costCenters={costCenters}
          teams={teams}
          responsibles={groupedResponsibles}
          subscriptions={subscriptions}
        />
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Ámbitos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-5/6" />
          <Skeleton className="h-10 w-4/6" />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Responsables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
