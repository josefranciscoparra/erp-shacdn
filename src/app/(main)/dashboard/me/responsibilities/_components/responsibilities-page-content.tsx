import { redirect } from "next/navigation";

import { Building2, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { SwitchToEmployeeOrgButton } from "@/components/hr/switch-to-employee-org-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { safePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

import { ResponsibilitiesList } from "./responsibilities-list";

export async function ResponsibilitiesPageContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const activeOrgId = session.user.activeOrgId ?? session.user.orgId;
  const employeeId = session.user.employeeId;

  const [activeOrg, employee] = await Promise.all([
    activeOrgId
      ? prisma.organization.findUnique({
          where: { id: activeOrgId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    employeeId
      ? prisma.employee.findUnique({
          where: { id: employeeId },
          select: {
            id: true,
            orgId: true,
            organization: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  const activeOrgName = activeOrg && activeOrg.name ? activeOrg.name : "Empresa activa";
  const employeeOrgName =
    employee && employee.organization && employee.organization.name ? employee.organization.name : null;

  const hasPersonalOrg = Boolean(employee && employee.orgId);
  const hasDifferentPersonalOrg = Boolean(employee && employee.orgId && activeOrgId && employee.orgId !== activeOrgId);
  const hasMultipleOrgs = (session.user.accessibleOrgIds?.length ?? 0) > 1;
  const showContextBanner = hasMultipleOrgs || hasDifferentPersonalOrg;

  const authResult = await safePermission("view_employees");

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis responsabilidades"
        description="Gestiona tus áreas de responsabilidad y las suscripciones de alertas de la empresa activa."
      />

      {showContextBanner ? (
        <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <Building2 className="h-4 w-4 text-blue-700 dark:text-blue-300" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Empresa activa: {activeOrgName}</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <p>
                Las responsabilidades y alertas se gestionan por empresa activa. Cambia de empresa si necesitas ver otra
                organización.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-blue-200 bg-white/70 text-blue-800 dark:border-blue-900">
                  Empresa activa
                </Badge>
                <Badge variant="default">{activeOrgName}</Badge>
                {hasDifferentPersonalOrg && employeeOrgName ? (
                  <>
                    <Badge variant="outline" className="border-blue-200 bg-white/70 text-blue-800 dark:border-blue-900">
                      Empresa personal
                    </Badge>
                    <Badge variant="secondary">{employeeOrgName}</Badge>
                  </>
                ) : null}
              </div>
              {hasDifferentPersonalOrg && employeeOrgName ? (
                <p className="text-sm text-blue-800/90 dark:text-blue-200/90">
                  Tu empresa personal es diferente. Puedes cambiar si necesitas acceder a tu espacio personal.
                </p>
              ) : null}
              {!hasPersonalOrg ? (
                <p className="text-sm text-blue-800/90 dark:text-blue-200/90">
                  No tienes ficha de empleado asociada. Esta vista es administrativa por empresa activa.
                </p>
              ) : null}
              {hasDifferentPersonalOrg && employeeOrgName && employee?.orgId ? (
                <div className="pt-1">
                  <SwitchToEmployeeOrgButton employeeOrgId={employee.orgId} employeeOrgName={employeeOrgName} />
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {!authResult.ok ? (
        <EmptyState
          icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
          title="Sin permisos en la empresa activa"
          description="No tienes permisos para ver responsabilidades en esta empresa. Cambia de empresa activa o solicita acceso a Recursos Humanos."
        />
      ) : (
        <ResponsibilitiesList />
      )}
    </div>
  );
}
