import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Indicador visual para usuarios multiempresa que muestra en qué organización
 * están realizando operaciones (fichajes, etc).
 *
 * Solo se muestra si el usuario tiene acceso a más de una organización.
 */
export async function OrganizationIndicator() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  // Solo mostrar si el usuario tiene acceso a múltiples organizaciones
  const hasMultipleOrgs = (session.user.accessibleOrgIds?.length ?? 0) > 1;

  if (!hasMultipleOrgs) {
    return null;
  }

  const activeOrgId = session.user.activeOrgId ?? session.user.orgId;

  const organization = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: { name: true },
  });

  if (!organization?.name) {
    return null;
  }

  return (
    <div className="flex items-center justify-center">
      <Badge
        variant="outline"
        className="gap-1.5 border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
      >
        <Building2 className="h-3 w-3" />
        Fichando en: {organization.name}
      </Badge>
    </div>
  );
}
