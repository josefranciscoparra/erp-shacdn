import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
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
import { formatEmployeeNumber } from "@/services/employees";
import { canManageUsers } from "@/services/permissions";
import { createUserSchema, createUserAdminSchema } from "@/validators/user";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos de administrador
    if (!["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos de administrador" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const status = searchParams.get("status"); // active, inactive, with-temp-password, all
    const skip = (page - 1) * limit;

    const orgId = session.user.orgId;

    // Construir filtros
    const where: any = { orgId };

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

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      currentUserRole: session.user.role,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos de administrador
    if (!canManageUsers(session.user.role)) {
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
          temporaryPassword,
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
        temporaryPassword,
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
