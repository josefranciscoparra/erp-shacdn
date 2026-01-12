import { NextRequest, NextResponse } from "next/server";

import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { encrypt } from "@/lib/crypto";
import { sendAuthInviteEmail } from "@/lib/email/email-service";
import {
  canManageGroupUsers,
  getGroupManagedOrganizationIds,
  getGroupOrganizationIds,
  listAccessibleGroupsForUser,
  getOrganizationGroupScope,
} from "@/lib/organization-groups";
import { generateTemporaryPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  validateUserCreation,
  validateRoleChange,
  validateTemporaryPasswordGeneration,
  validateEmail,
  validateName,
} from "@/lib/user-validation";
import { validateEmailDomain } from "@/lib/validations/email-domain";
import { createInviteToken, getAppUrl } from "@/server/actions/auth-tokens";
import { formatEmployeeNumber } from "@/services/employees";
import { createUserSchema, createUserAdminSchema } from "@/validators/user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos de administrador
    const effectivePermissions = await computeEffectivePermissions({
      role: session.user.role as Role,
      orgId: session.user.orgId,
      userId: session.user.id,
    });

    if (!effectivePermissions.has("manage_users")) {
      return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const status = searchParams.get("status"); // active, inactive, with-temp-password, all
    const groupId = searchParams.get("groupId");
    const rawRequestedOrgId = searchParams.get("orgId");
    const requestedOrgId = rawRequestedOrgId?.trim() ?? null;
    const primaryOnly = searchParams.get("primaryOnly") === "true";
    const skip = (page - 1) * limit;

    const orgId = session.user.orgId;
    const role = session.user.role as Role;
    const activeOrgId = session.user.activeOrgId ?? orgId;

    if (requestedOrgId === "all" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos para ver todas las organizaciones" }, { status: 403 });
    }

    let canManageUserOrganizations = effectivePermissions.has("manage_user_organizations");

    if (!canManageUserOrganizations) {
      // Sin permiso efectivo, ocultar gestión multi-org
      canManageUserOrganizations = false;
    } else if (session.user.role === "SUPER_ADMIN") {
      canManageUserOrganizations = true;
    } else {
      const membership = await prisma.userOrganization.findFirst({
        where: {
          userId: session.user.id,
          orgId: activeOrgId,
          isActive: true,
        },
        select: {
          canManageUserOrganizations: true,
        },
      });

      if (session.user.role === "ORG_ADMIN") {
        canManageUserOrganizations = !!membership;
      } else {
        canManageUserOrganizations = membership?.canManageUserOrganizations ?? false;
      }
    }

    const managedOrgIds = new Set<string>();
    let availableOrganizations: Array<{ id: string; name: string }> = [];

    if (role === "SUPER_ADMIN") {
      const orgs = await prisma.organization.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      orgs.forEach((org) => managedOrgIds.add(org.id));
      availableOrganizations = orgs.map((org) => ({
        id: org.id,
        name: org.name ?? "Organización",
      }));
    } else if (role === "ORG_ADMIN") {
      const memberships = await prisma.userOrganization.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          organization: { active: true },
        },
        select: { orgId: true },
      });

      memberships.forEach((membership) => managedOrgIds.add(membership.orgId));
    } else if (role === "HR_ADMIN") {
      const memberships = await prisma.userOrganization.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          canManageUserOrganizations: true,
          organization: { active: true },
        },
        select: { orgId: true },
      });

      memberships.forEach((membership) => managedOrgIds.add(membership.orgId));
    }

    if (managedOrgIds.size === 0 && orgId) {
      managedOrgIds.add(orgId);
    }

    const groupManagedOrgIds = await getGroupManagedOrganizationIds(session.user.id);
    groupManagedOrgIds.forEach((managedOrgId) => managedOrgIds.add(managedOrgId));

    let filteredOrgIds = Array.from(managedOrgIds);

    if (role !== "SUPER_ADMIN" && activeOrgId) {
      const groupScope = await getOrganizationGroupScope(activeOrgId);
      const groupOrgIds = groupScope?.organizationIds ?? [activeOrgId];

      if (role === "HR_ADMIN" && !canManageUserOrganizations) {
        filteredOrgIds = filteredOrgIds.filter((id) => id === activeOrgId);
      } else if (role === "ORG_ADMIN" || role === "HR_ADMIN") {
        filteredOrgIds = filteredOrgIds.filter((id) => groupOrgIds.includes(id));
      }
    }

    if (requestedOrgId && requestedOrgId !== "all" && !managedOrgIds.has(requestedOrgId)) {
      return NextResponse.json({ error: "Sin acceso a la organización seleccionada" }, { status: 403 });
    }

    if (role === "SUPER_ADMIN") {
      if (requestedOrgId !== "all") {
        const targetOrgId = requestedOrgId ?? activeOrgId ?? orgId;
        filteredOrgIds = targetOrgId ? [targetOrgId] : [];
      }
    } else if (requestedOrgId && requestedOrgId !== "all") {
      filteredOrgIds = [requestedOrgId];
    }

    let groupOrgIds: string[] | null = null;

    if (groupId) {
      const hasAccessToGroup = role === "SUPER_ADMIN" ? true : await canManageGroupUsers(session.user.id, groupId);

      if (!hasAccessToGroup) {
        return NextResponse.json({ error: "Sin acceso al grupo seleccionado" }, { status: 403 });
      }

      groupOrgIds = await getGroupOrganizationIds(groupId);
      filteredOrgIds = filteredOrgIds.filter((id) => groupOrgIds.includes(id));
    }

    if (availableOrganizations.length === 0) {
      const availableOrgIds = groupOrgIds
        ? Array.from(managedOrgIds).filter((id) => groupOrgIds.includes(id))
        : Array.from(managedOrgIds);

      if (availableOrgIds.length > 0) {
        const orgs = await prisma.organization.findMany({
          where: { id: { in: availableOrgIds }, active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        availableOrganizations = orgs.map((org) => ({
          id: org.id,
          name: org.name ?? "Organización",
        }));
      }
    } else if (groupOrgIds) {
      availableOrganizations = availableOrganizations.filter((org) => groupOrgIds.includes(org.id));
    }

    if (filteredOrgIds.length === 0) {
      return NextResponse.json({
        users: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        currentUserRole: role,
        canManageUserOrganizations,
        activeOrgId,
        availableOrganizations,
        groups: await listAccessibleGroupsForUser(session.user.id, role),
      });
    }

    const primaryOrgIdFilter =
      role === "SUPER_ADMIN" && requestedOrgId !== "all" && requestedOrgId ? requestedOrgId : activeOrgId;

    if (primaryOnly && groupId && groupOrgIds && primaryOrgIdFilter && !groupOrgIds.includes(primaryOrgIdFilter)) {
      return NextResponse.json({ error: "Sin acceso a la organización seleccionada" }, { status: 403 });
    }

    // Construir filtros
    const where: any = {
      role: {
        not: "SUPER_ADMIN",
      },
    };

    if (primaryOnly && primaryOrgIdFilter) {
      where.orgId = primaryOrgIdFilter;
    } else {
      where.OR = [
        {
          userOrganizations: {
            some: {
              orgId: { in: filteredOrgIds },
              isActive: true,
            },
          },
        },
        {
          orgId: { in: filteredOrgIds },
        },
      ];
    }

    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    } else if (status === "with-temp-password") {
      where.temporaryPasswords = {
        some: {
          active: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      };
    }

    // Obtener usuarios con paginación
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              secondLastName: true,
              employeeNumber: true,
              employmentStatus: true,
            },
          },
          temporaryPasswords: {
            where: {
              active: true,
              expiresAt: {
                gt: new Date(),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              password: true,
              createdAt: true,
              expiresAt: true,
              reason: true,
              usedAt: true,
              active: true,
              invalidatedAt: true,
              invalidatedReason: true,
              createdBy: {
                select: {
                  name: true,
                },
              },
            },
          },
          sessions: {
            where: {
              expires: {
                gt: new Date(),
              },
            },
            orderBy: {
              expires: "desc",
            },
            take: 1,
            select: {
              expires: true,
            },
          },
          _count: {
            select: {
              userOrganizations: true,
              temporaryPasswords: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const groups = await listAccessibleGroupsForUser(session.user.id, role);

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      currentUserRole: role,
      canManageUserOrganizations,
      activeOrgId,
      availableOrganizations,
      groups,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos de administrador
    const effectivePermissions = await computeEffectivePermissions({
      role: session.user.role as Role,
      orgId: session.user.orgId,
      userId: session.user.id,
    });

    if (!effectivePermissions.has("manage_users")) {
      return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, ...data } = body;

    const orgId = session.user.orgId;

    switch (action) {
      case "create":
        return await createUser(
          {
            id: session.user.id,
            role: session.user.role,
            orgId: session.user.orgId,
            email: session.user.email,
            name: session.user.name,
          },
          data,
        );

      case "reset-password":
        return await resetUserPassword(userId, orgId, session.user.id, data.reason, {
          id: session.user.id,
          role: session.user.role,
          orgId: session.user.orgId,
          email: session.user.email,
          name: session.user.name,
        });

      case "change-role":
        return await changeUserRole(userId, orgId, data.role, {
          id: session.user.id,
          role: session.user.role,
          orgId: session.user.orgId,
          email: session.user.email,
          name: session.user.name,
        });

      case "toggle-active":
        return await toggleUserActive(userId, orgId);

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error en acción de usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Funciones auxiliares

async function createUser(session: any, data: any) {
  try {
    // Validar con Zod (schema nuevo que soporta ambos modos)
    const validatedData = createUserAdminSchema.parse(data);

    // Validar jerarquía
    const validation = validateUserCreation(session, validatedData.role, validatedData.email, session.orgId);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 403 });
    }

    // Obtener organización para validar dominio de email
    const organization = await prisma.organization.findUnique({
      where: { id: session.orgId },
      select: {
        allowedEmailDomains: true,
        employeeNumberPrefix: true,
        employeeNumberCounter: true,
        name: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    // Validar dominio de email
    const emailValidation = validateEmailDomain(validatedData.email, organization.allowedEmailDomains);

    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error, code: "INVALID_EMAIL_DOMAIN" }, { status: 400 });
    }

    // Verificar que el email no exista
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validatedData.email,
        orgId: session.orgId,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email en esta organización", code: "EMAIL_EXISTS" },
        { status: 409 },
      );
    }

    const companyName = organization.name ?? undefined;
    const inviterName = session.name ?? session.email ?? undefined;

    const sendInviteIfRequested = async (user: { id: string; email: string; name: string; orgId: string }) => {
      if (!validatedData.sendInvite) {
        return false;
      }

      try {
        const tokenResult = await createInviteToken(user.id);
        if (!tokenResult.success || !tokenResult.data) {
          return false;
        }

        const inviteLink = `${await getAppUrl()}/auth/accept-invite?token=${tokenResult.data.token}`;
        const emailResult = await sendAuthInviteEmail({
          to: {
            email: user.email,
            name: user.name,
          },
          inviteLink,
          orgId: user.orgId,
          userId: user.id,
          companyName,
          inviterName,
          expiresAt: tokenResult.data.expiresAt,
        });

        return emailResult.success;
      } catch (error) {
        console.error("Error al enviar invitación de usuario:", error);
        return false;
      }
    };

    // Generar contraseña temporal
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Modo 1: Sin empleado (solo crear User)
    if (!validatedData.isEmployee) {
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: validatedData.email,
            name: validatedData.name!,
            role: validatedData.role,
            password: hashedPassword,
            orgId: session.orgId,
            active: true,
            mustChangePassword: true,
          },
        });

        // Crear registro de contraseña temporal
        await tx.temporaryPassword.create({
          data: {
            orgId: session.orgId,
            userId: newUser.id,
            password: temporaryPassword,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
            reason: "Usuario administrativo creado",
            notes: `Usuario ${validatedData.role} creado por ${session.name}`,
            createdById: session.id,
          },
        });

        return newUser;
      });

      const inviteEmailSent = await sendInviteIfRequested(user);

      return NextResponse.json(
        {
          message: "Usuario administrativo creado exitosamente",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            active: user.active,
          },
          inviteEmailRequested: validatedData.sendInvite,
          inviteEmailSent,
          temporaryPassword: inviteEmailSent ? undefined : temporaryPassword,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        { status: 201 },
      );
    }

    // Modo 2: Con empleado (crear User + Employee)
    // Verificar NIF único
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        orgId: session.orgId,
        nifNie: validatedData.nifNie!,
      },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: "Ya existe un empleado con este NIF/NIE", code: "NIF_EXISTS" },
        { status: 409 },
      );
    }

    // Encriptar IBAN si se proporciona
    const encryptedIban = validatedData.iban ? encrypt(validatedData.iban) : null;

    // Convertir fecha de nacimiento
    const birthDate = validatedData.birthDate ? new Date(validatedData.birthDate) : null;

    // Crear empleado + usuario en transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generar número de empleado - Método SELECT MAX (igual que wizard)
      const org = await tx.organization.findUnique({
        where: { id: session.orgId },
        select: { employeeNumberPrefix: true },
      });
      const prefix = org?.employeeNumberPrefix ?? "EMP";

      // Buscar último número de empleado con ese prefijo
      const lastEmployee = await tx.employee.findFirst({
        where: {
          orgId: session.orgId,
          employeeNumber: { startsWith: prefix },
        },
        orderBy: { employeeNumber: "desc" },
        select: { employeeNumber: true },
      });

      // Calcular siguiente número
      let nextNumber = 1;
      if (lastEmployee?.employeeNumber) {
        const numericPart = lastEmployee.employeeNumber.replace(/[A-Z]/g, "");
        nextNumber = parseInt(numericPart, 10) + 1;
      }

      const employeeNumber = formatEmployeeNumber(prefix, nextNumber);

      // 2. Crear empleado
      const employee = await tx.employee.create({
        data: {
          orgId: session.orgId,
          employeeNumber,
          firstName: validatedData.firstName!,
          lastName: validatedData.lastName!,
          secondLastName: validatedData.secondLastName,
          nifNie: validatedData.nifNie!,
          email: validatedData.email,
          phone: validatedData.phone,
          mobilePhone: validatedData.mobilePhone,
          address: validatedData.address,
          city: validatedData.city,
          postalCode: validatedData.postalCode,
          province: validatedData.province,
          birthDate,
          nationality: validatedData.nationality,
          iban: encryptedIban,
          emergencyContactName: validatedData.emergencyContactName,
          emergencyContactPhone: validatedData.emergencyContactPhone,
          emergencyRelationship: validatedData.emergencyRelationship,
          notes: validatedData.notes,
        },
      });

      // 2. Crear usuario
      const user = await tx.user.create({
        data: {
          orgId: session.orgId,
          email: validatedData.email,
          password: hashedPassword,
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          role: validatedData.role,
          mustChangePassword: true,
        },
      });

      // 3. Crear registro de contraseña temporal
      await tx.temporaryPassword.create({
        data: {
          orgId: session.orgId,
          userId: user.id,
          password: temporaryPassword,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          reason: "Usuario administrativo con empleado creado",
          notes: `Usuario ${validatedData.role} con perfil de empleado creado por ${session.name}`,
          createdById: session.id,
        },
      });

      // 4. Vincular usuario con empleado
      await tx.employee.update({
        where: { id: employee.id },
        data: { userId: user.id },
      });

      // 5. Crear contrato básico (como en /api/employees)
      await tx.employmentContract.create({
        data: {
          orgId: session.orgId,
          employeeId: employee.id,
          contractType: "TEMPORAL",
          startDate: new Date(),
          weeklyHours: "0",
          active: true,
        },
      });

      return { employee, user };
    });

    const inviteEmailSent = await sendInviteIfRequested(result.user);

    return NextResponse.json(
      {
        message: "Usuario administrativo con empleado creado exitosamente",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          active: result.user.active,
        },
        employee: {
          id: result.employee.id,
          employeeNumber: result.employee.employeeNumber,
          firstName: result.employee.firstName,
          lastName: result.employee.lastName,
        },
        inviteEmailRequested: validatedData.sendInvite,
        inviteEmailSent,
        temporaryPassword: inviteEmailSent ? undefined : temporaryPassword,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error al crear usuario:", error);

    // Errores de validación Zod
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Datos de entrada inválidos",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}

async function resetUserPassword(userId: string, orgId: string, createdById: string, reason?: string, session?: any) {
  // Validar permisos para generar contraseña temporal
  if (session) {
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, orgId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const validation = validateTemporaryPasswordGeneration(session, userId, targetUser.role, targetUser.orgId);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 403 });
    }
  }
  const user = await prisma.user.findFirst({
    where: { id: userId, orgId },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          secondLastName: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  await prisma.$transaction(async (tx) => {
    // Desactivar contraseñas temporales anteriores
    await tx.temporaryPassword.updateMany({
      where: {
        userId,
        active: true,
      },
      data: {
        active: false,
        invalidatedAt: new Date(),
        invalidatedReason: reason
          ? `Contraseña reemplazada manualmente (${reason})`
          : "Contraseña temporal reemplazada por un administrador",
      },
    });

    // Actualizar contraseña del usuario
    await tx.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    // Crear nueva contraseña temporal
    await tx.temporaryPassword.create({
      data: {
        orgId,
        userId,
        password: temporaryPassword,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        reason: reason ?? "Reset por administrador",
        notes: `Contraseña reseteada por administrador para ${user.employee?.firstName ?? user.name}`,
        createdById,
      },
    });
  });

  return NextResponse.json({
    message: "Contraseña reseteada exitosamente",
    temporaryPassword,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

async function changeUserRole(userId: string, orgId: string, newRole: string, session: any) {
  // Buscar el usuario objetivo
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, orgId },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Validar jerarquía
  const validation = validateRoleChange(session, userId, targetUser.role, newRole as any, targetUser.orgId);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error, code: validation.code }, { status: 403 });
  }

  // Actualizar rol
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Si el nuevo rol es HR_ASSISTANT, crear AreaResponsible con scope ORGANIZATION
  // para que tenga visibilidad global por defecto (puede restringirse después)
  if (newRole === "HR_ASSISTANT") {
    const existingOrgScope = await prisma.areaResponsible.findFirst({
      where: {
        userId,
        orgId,
        scope: "ORGANIZATION",
        isActive: true,
      },
    });

    if (!existingOrgScope) {
      await prisma.areaResponsible.create({
        data: {
          userId,
          orgId,
          scope: "ORGANIZATION",
          permissions: [
            "VIEW_ALERTS",
            "RESOLVE_ALERTS",
            "APPROVE_PTO_REQUESTS",
            "APPROVE_EXPENSES",
            "MANAGE_TIME_ENTRIES",
            "VIEW_TIME_ENTRIES",
          ],
          isActive: true,
        },
      });
    }
  }

  return NextResponse.json({
    message: "Rol actualizado exitosamente",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      employee: updatedUser.employee,
    },
    previousRole: targetUser.role,
    newRole: updatedUser.role,
  });
}

async function toggleUserActive(userId: string, orgId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, orgId },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const newActiveStatus = !user.active;

  await prisma.user.update({
    where: { id: userId },
    data: { active: newActiveStatus },
  });

  return NextResponse.json({
    message: `Usuario ${newActiveStatus ? "activado" : "desactivado"} exitosamente`,
    active: newActiveStatus,
  });
}
