import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { generateTemporaryPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { ensureUserOrganization } from "@/lib/user-organizations/ensure-user-organization";
import { normalizeEmail } from "@/lib/validations/email";
import { validateEmailDomain } from "@/lib/validations/email-domain";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations/employee";
import { generateSafeEmployeeNumber } from "@/services/employees";
import { getUserScope } from "@/services/scopes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;

    // 🔒 SEGURIDAD: Aplicar filtrado por scope
    const userScope = await getUserScope(session.user.id, orgId);

    // Construir condición de scope
    const scopeCondition = userScope.isGlobal
      ? {} // Ver todo
      : {
          OR: [
            // 1. Ver empleados de mis equipos asignados
            ...(userScope.teamIds.length > 0 ? [{ teamId: { in: userScope.teamIds } }] : []),
            // 2. Ver empleados de mis departamentos o centros (a través de contrato activo)
            {
              employmentContracts: {
                some: {
                  active: true,
                  OR: [
                    ...(userScope.departmentIds.length > 0 ? [{ departmentId: { in: userScope.departmentIds } }] : []),
                    ...(userScope.costCenterIds.length > 0 ? [{ costCenterId: { in: userScope.costCenterIds } }] : []),
                    // Si no tiene scopes de depto/centro pero la query requiere al menos uno, esto asegura no romper
                    // (aunque si teamIds también está vacío y isGlobal es false, no verá nada por la lógica general)
                  ],
                },
              },
            },
          ],
        };

    // Si no tiene ningún scope asignado y no es global, bloquear acceso
    if (
      !userScope.isGlobal &&
      userScope.teamIds.length === 0 &&
      userScope.departmentIds.length === 0 &&
      userScope.costCenterIds.length === 0
    ) {
      return NextResponse.json([]); // Array vacío
    }

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        ...scopeCondition,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            updatedAt: true,
          },
        },
        employmentContracts: {
          where: {
            active: true,
          },
          include: {
            department: {
              select: {
                name: true,
              },
            },
            position: {
              select: {
                title: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
          take: 1, // Solo el contrato más reciente
        },
      },
      orderBy: {
        employeeNumber: "desc",
      },
    });

    // Transformar los datos para el frontend
    const transformedEmployees = employees.map((employee) => {
      const currentContract = employee.employmentContracts[0];

      return {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        secondLastName: employee.secondLastName,
        email: employee.email,
        active: employee.active,
        department: currentContract?.department ?? null,
        position: currentContract?.position ?? null,
        employmentContracts: employee.employmentContracts.map((contract) => ({
          contractType: contract.contractType,
          startDate: contract.startDate,
          endDate: contract.endDate,
          active: contract.active,
        })),
        user: employee.user,
      };
    });
    return NextResponse.json(transformedEmployees);
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    console.log("🔐 Sesión POST:", session);
    if (!session?.user) {
      console.log("❌ No hay sesión o usuario en POST");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    console.log("✅ Usuario autenticado POST:", session.user.email, "Rol:", session.user.role);

    // Obtener datos del request
    const body = await request.json();

    // Validar datos
    const validation = createEmployeeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.error.issues }, { status: 400 });
    }

    const data: CreateEmployeeInput = validation.data;
    const orgId = session.user.orgId;
    const normalizedEmail = normalizeEmail(data.email);

    // Verificar si existe empleado con este NIF/NIE en la organización
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        orgId,
        nifNie: data.nifNie,
      },
      select: {
        id: true,
        active: true,
        userId: true,
      },
    });

    if (existingEmployee?.active) {
      return NextResponse.json({ error: "Ya existe un empleado activo con este NIF/NIE" }, { status: 409 });
    }

    // Obtener organización para validar email y generar número de empleado
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        employeeNumberPrefix: true,
        employeeNumberCounter: true,
        allowedEmailDomains: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    // Validar dominio de email si está configurado
    if (normalizedEmail) {
      const emailValidation = validateEmailDomain(normalizedEmail, organization.allowedEmailDomains);

      if (!emailValidation.valid) {
        return NextResponse.json({ error: emailValidation.error }, { status: 400 });
      }
    }

    // Encriptar IBAN si se proporciona
    const encryptedIban = data.iban ? encrypt(data.iban) : null;

    // Convertir fecha de nacimiento
    const birthDate = data.birthDate ? new Date(data.birthDate) : null;

    if (!normalizedEmail) {
      throw Object.assign(new Error("EMAIL_REQUIRED"), { code: "EMAIL_REQUIRED" });
    }

    // Si existe un empleado inactivo con el mismo NIF, lo reactivamos
    if (existingEmployee && !existingEmployee.active) {
      // Validar que el email no esté siendo usado por otro usuario distinto
      const conflictingUser = await prisma.user.findFirst({
        where: existingEmployee.userId
          ? {
              email: {
                equals: normalizedEmail,
                mode: "insensitive",
              },
              id: { not: existingEmployee.userId },
            }
          : {
              email: {
                equals: normalizedEmail,
                mode: "insensitive",
              },
            },
      });

      if (conflictingUser) {
        return NextResponse.json({ error: "Ya existe un usuario con este email en TimeNow" }, { status: 409 });
      }

      const reactivatedEmployee = await prisma.$transaction(async (tx) => {
        const updatedEmployee = await tx.employee.update({
          where: { id: existingEmployee.id },
          data: {
            active: true,
            firstName: data.firstName,
            lastName: data.lastName,
            secondLastName: data.secondLastName,
            email: normalizedEmail,
            phone: data.phone,
            mobilePhone: data.mobilePhone,
            address: data.address,
            city: data.city,
            postalCode: data.postalCode,
            province: data.province,
            birthDate,
            nationality: data.nationality,
            gender: data.gender ?? "NOT_SPECIFIED",
            iban: encryptedIban,
            emergencyContactName: data.emergencyContactName,
            emergencyContactPhone: data.emergencyContactPhone,
            emergencyRelationship: data.emergencyRelationship,
            notes: data.notes,
            additionalFields: data.additionalFields ?? [],
            teamId: data.teamId,
          },
          include: {
            employmentContracts: true,
          },
        });

        let temporaryPassword: string | null = null;

        if (existingEmployee.userId) {
          const updatedUser = await tx.user.update({
            where: { id: existingEmployee.userId },
            data: {
              active: true,
              email: normalizedEmail,
              name: `${data.firstName} ${data.lastName}`,
            },
            select: { role: true },
          });

          await ensureUserOrganization({
            db: tx,
            userId: existingEmployee.userId,
            orgId,
            role: updatedUser.role,
          });
        } else {
          temporaryPassword = generateTemporaryPassword();
          const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

          const user = await tx.user.create({
            data: {
              orgId,
              email: normalizedEmail,
              password: hashedPassword,
              name: `${data.firstName} ${data.lastName}`,
              role: "EMPLOYEE",
              active: true,
              mustChangePassword: true,
            },
          });

          await ensureUserOrganization({
            db: tx,
            userId: user.id,
            orgId,
            role: user.role,
          });

          await tx.temporaryPassword.create({
            data: {
              orgId,
              userId: user.id,
              password: temporaryPassword,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              reason: "Reactivación de empleado",
              notes: `Contraseña generada automáticamente para reactivación de ${data.firstName} ${data.lastName}`,
              createdById: session.user.id,
            },
          });

          await tx.employee.update({
            where: { id: updatedEmployee.id },
            data: { userId: user.id },
          });
        }

        return { employee: updatedEmployee, temporaryPassword };
      });

      return NextResponse.json({
        message: "Empleado reactivado correctamente",
        employee: reactivatedEmployee.employee,
        temporaryPassword: reactivatedEmployee.temporaryPassword,
        reactivated: true,
      });
    }

    // Crear empleado en transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener prefijo y generar número de empleado de forma SEGURA
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { employeeNumberPrefix: true },
      });
      const prefix = org?.employeeNumberPrefix ?? "EMP";

      // Usar función segura con sistema de reintentos (4 capas de defensa)
      const numberResult = await generateSafeEmployeeNumber(tx, orgId, prefix);

      // Si no se pudo generar número, continuar sin número (requiere revisión)
      if (!numberResult.success) {
        console.warn(
          `⚠️ No se pudo generar número de empleado único. Empleado creado sin número para revisión manual. Error: ${numberResult.error}`,
        );
      }

      // 2. Crear empleado
      const employee = await tx.employee.create({
        data: {
          orgId,
          employeeNumber: numberResult.employeeNumber,
          requiresEmployeeNumberReview: numberResult.requiresReview,
          firstName: data.firstName,
          lastName: data.lastName,
          secondLastName: data.secondLastName,
          nifNie: data.nifNie,
          email: normalizedEmail,
          phone: data.phone,
          mobilePhone: data.mobilePhone,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          province: data.province,
          birthDate,
          nationality: data.nationality,
          gender: data.gender ?? "NOT_SPECIFIED",
          iban: encryptedIban,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyRelationship: data.emergencyRelationship,
          notes: data.notes,
          additionalFields: data.additionalFields ?? [],
          teamId: data.teamId,
        },
      });

      // Validar que no exista ya un usuario con ese email
      const existingUser = await tx.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
      });
      if (existingUser) {
        throw Object.assign(new Error("EMAIL_EXISTS"), {
          code: "EMAIL_EXISTS",
          message: "Ya existe un usuario con este email en TimeNow",
        });
      }

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const user = await tx.user.create({
        data: {
          orgId,
          email: normalizedEmail,
          password: hashedPassword,
          name: `${data.firstName} ${data.lastName}`,
          role: "EMPLOYEE",
          mustChangePassword: true, // Forzar cambio de contraseña en primer login
        },
      });

      await ensureUserOrganization({
        db: tx,
        userId: user.id,
        orgId,
        role: user.role,
      });

      // Crear registro de contraseña temporal
      await tx.temporaryPassword.create({
        data: {
          orgId,
          userId: user.id,
          password: temporaryPassword, // Guardamos la contraseña en texto plano para mostrar al admin
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expira en 7 días
          reason: "Nuevo empleado",
          notes: `Contraseña generada automáticamente para nuevo empleado: ${data.firstName} ${data.lastName}`,
          createdById: session.user.id, // El admin/HR que creó el empleado
        },
      });

      // Vincular usuario con empleado
      await tx.employee.update({
        where: { id: employee.id },
        data: { userId: user.id },
      });

      await tx.employmentContract.create({
        data: {
          orgId,
          employeeId: employee.id,
          contractType: "TEMPORAL",
          startDate: new Date(),
          weeklyHours: "0",
          active: true,
        },
      });

      return { employee, user, temporaryPassword };
    });

    // Preparar respuesta
    const response = {
      id: result.employee.id,
      employeeNumber: result.employee.employeeNumber,
      firstName: result.employee.firstName,
      lastName: result.employee.lastName,
      email: result.employee.email,
      active: result.employee.active,
      userCreated: !!result.user,
      temporaryPassword: result.temporaryPassword, // Solo para desarrollo - en producción enviar por email
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    // Errores de negocio conocidos
    if (error?.code === "EMAIL_EXISTS") {
      return NextResponse.json(
        { error: error.message ?? "Ya existe un usuario con este email en TimeNow" },
        { status: 409 },
      );
    }
    if (error?.message === "EMAIL_REQUIRED" || error?.code === "EMAIL_REQUIRED") {
      return NextResponse.json({ error: "El email es obligatorio" }, { status: 400 });
    }
    // Errores de unicidad Prisma
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json({ error: "Duplicado: ya existe un registro con ese valor único" }, { status: 409 });
    }
    console.error("Error al crear empleado:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
