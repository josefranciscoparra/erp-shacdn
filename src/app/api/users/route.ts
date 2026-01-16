import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users
 * Obtiene lista de usuarios con filtros
 * Query params:
 * - roles: comma-separated list of roles (MANAGER,HR_ADMIN,ORG_ADMIN)
 * - withEmployee: true/false - filtrar solo usuarios con empleado asociado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rolesParam = searchParams.get("roles");
    const withEmployeeParam = searchParams.get("withEmployee");

    // Construir filtro de roles
    const rawRoleFilter = rolesParam ? rolesParam.split(",") : undefined;
    const roleFilter = rawRoleFilter ? rawRoleFilter.filter((role) => role !== "SUPER_ADMIN") : undefined;
    const requireEmployee = withEmployeeParam === "true";

    // Identificar miembros de grupos que incluyan esta organización (para etiquetar "Grupo")
    const groupMemberships = await prisma.organizationGroupOrganization.findMany({
      where: {
        organizationId: session.user.orgId,
        status: "ACTIVE",
        group: { isActive: true },
      },
      select: {
        groupId: true,
      },
    });

    const groupIds = groupMemberships.map((membership) => membership.groupId);
    const groupOrganizations =
      groupIds.length > 0
        ? await prisma.organizationGroupOrganization.findMany({
            where: {
              groupId: { in: groupIds },
              status: "ACTIVE",
            },
            select: { organizationId: true },
          })
        : [];
    const groupOrgIds = groupOrganizations.map((membership) => membership.organizationId);

    // Priorizar la membresía por organización para soportar usuarios multi-org
    const membershipUsers = await prisma.userOrganization.findMany({
      where: {
        orgId: session.user.orgId,
        isActive: true,
        ...(roleFilter && {
          role: {
            in: roleFilter,
          },
        }),
        user: {
          active: true,
          role: { not: "SUPER_ADMIN" },
          ...(requireEmployee && {
            employee: {
              isNot: null,
            },
          }),
        },
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            orgId: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Fallback para usuarios sin membresía registrada (casos legacy)
    const directUsers = await prisma.user.findMany({
      where: {
        orgId: session.user.orgId,
        active: true,
        role: { not: "SUPER_ADMIN" },
        ...(roleFilter && {
          role: {
            in: roleFilter,
          },
        }),
        ...(requireEmployee && {
          employee: {
            isNot: null,
          },
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        orgId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const candidateUserIds = new Set<string>();
    membershipUsers.forEach((membership) => {
      if (membership.user?.id) {
        candidateUserIds.add(membership.user.id);
      }
    });
    directUsers.forEach((user) => candidateUserIds.add(user.id));

    const groupOrgMemberships =
      groupOrgIds.length > 0 && candidateUserIds.size > 0
        ? await prisma.userOrganization.findMany({
            where: {
              userId: { in: Array.from(candidateUserIds) },
              orgId: { in: groupOrgIds },
              isActive: true,
            },
            select: { userId: true, orgId: true },
          })
        : [];

    const groupOrgIndex = new Map<string, Set<string>>();
    groupOrgMemberships.forEach((membership) => {
      if (!groupOrgIndex.has(membership.userId)) {
        groupOrgIndex.set(membership.userId, new Set());
      }
      groupOrgIndex.get(membership.userId)?.add(membership.orgId);
    });

    const userMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        role: string;
        image: string | null;
        baseOrgId?: string;
        baseOrgName?: string | null;
        source?: "ORG" | "GROUP";
      }
    >();

    membershipUsers.forEach((membership) => {
      const user = membership.user;
      if (!user) return;
      const userGroupOrgs = groupOrgIndex.get(user.id);
      const hasGroupScope = groupOrgIds.length > 0;
      const hasOtherGroupOrg = userGroupOrgs && (userGroupOrgs.size > 1 || !userGroupOrgs.has(session.user.orgId));
      const source = hasGroupScope && hasOtherGroupOrg ? "GROUP" : "ORG";
      userMap.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        image: user.image,
        baseOrgId: user.orgId,
        baseOrgName: user.organization?.name ?? null,
        source,
      });
    });

    directUsers.forEach((user) => {
      if (!userMap.has(user.id)) {
        const userGroupOrgs = groupOrgIndex.get(user.id);
        const hasGroupScope = groupOrgIds.length > 0;
        const hasOtherGroupOrg = userGroupOrgs && (userGroupOrgs.size > 1 || !userGroupOrgs.has(session.user.orgId));
        const source = hasGroupScope && hasOtherGroupOrg ? "GROUP" : "ORG";
        userMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          baseOrgId: user.orgId,
          baseOrgName: user.organization?.name ?? null,
          source,
        });
      }
    });

    const users = Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const hasGroupScope = groupOrgIds.length > 0;

    return NextResponse.json({ users, hasGroupScope });
  } catch (error) {
    console.error("Error en GET /api/users:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}
