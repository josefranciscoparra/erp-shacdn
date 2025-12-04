import { Suspense } from "react";

import Link from "next/link";

import { AlertCircle, ArrowLeft, Shield, ShieldCheck, ShieldQuestion } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAlertStats, getActiveAlerts } from "@/server/actions/alert-detection";
import { getMySubscriptions } from "@/server/actions/alerts";
import {
  getUserAccessibleCostCenters,
  getUserAccessibleDepartments,
  getUserAccessibleTeams,
} from "@/services/permissions/scope-helpers";

import { AlertsExplorer } from "./_components/alerts-explorer";

export const metadata = {
  title: "Explorador de Alertas",
};

export default async function AlertsExplorerPage() {
  const session = await auth();
  if (!session?.user?.orgId || !session?.user?.id) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Explorador de Alertas" />
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <Shield className="text-muted-foreground h-6 w-6" />
            <div>
              <p className="font-medium">No hay sesión</p>
              <p className="text-muted-foreground text-sm">Inicia sesión para ver el explorador de alertas.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { id: true, name: true },
  });

  const responsibilities = await prisma.areaResponsible.findMany({
    where: { userId: session.user.id, orgId: session.user.orgId, isActive: true },
    select: { scope: true },
  });

  const isAdmin =
    session.user.role === "HR_ADMIN" || session.user.role === "ORG_ADMIN" || session.user.role === "SUPER_ADMIN";
  const hasOrgAccess = isAdmin || responsibilities.some((r) => r.scope === "ORGANIZATION");

  const [departments, costCenters, teams, subscriptions, orgStats, latestAlerts] = await Promise.all([
    getUserAccessibleDepartments(session.user.id, session.user.orgId),
    getUserAccessibleCostCenters(session.user.id, session.user.orgId),
    getUserAccessibleTeams(session.user.id, session.user.orgId),
    getMySubscriptions(),
    hasOrgAccess ? getAlertStats() : null,
    // Últimas alertas recientes de la organización (se filtran en el cliente por nodo)
    getActiveAlerts({ dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }),
  ]);

  // Calcular stats por nodo (departamentos, centros, equipos)
  const departmentStats = await Promise.all(
    departments.map(async (dept) => ({
      ...dept,
      stats: await getAlertStats({ departmentId: dept.id }),
    })),
  );

  const costCenterStats = await Promise.all(
    costCenters.map(async (cc) => ({
      ...cc,
      stats: await getAlertStats({ costCenterId: cc.id }),
    })),
  );

  const teamStats = await Promise.all(
    teams.map(async (team) => ({
      ...team,
      stats: await getAlertStats({ teamId: team.id }),
    })),
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Explorador de Alertas"
          description="Vista jerárquica de alertas por organización, departamentos, centros y equipos."
        />
        <div className="flex items-center gap-2">
          <Link href="/dashboard/time-tracking/alerts" className="text-primary text-sm hover:underline">
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Volver al Panel de Alertas
          </Link>
        </div>
      </div>

      {org ? (
        <Suspense fallback={<LoadingState />}>
          <AlertsExplorer
            org={hasOrgAccess ? { ...org, stats: orgStats } : null}
            departments={departmentStats}
            costCenters={costCenterStats}
            teams={teamStats}
            subscriptions={subscriptions}
            latestAlerts={latestAlerts}
          />
        </Suspense>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <ShieldQuestion className="text-muted-foreground h-6 w-6" />
            <div>
              <p className="font-medium">Organización no encontrada</p>
              <p className="text-muted-foreground text-sm">No pudimos obtener los datos de la organización.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Jerarquía</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-5/6" />
          <Skeleton className="h-10 w-4/6" />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Detalle</CardTitle>
          <Badge variant="outline">Cargando…</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
