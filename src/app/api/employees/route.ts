import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { resolveAvatarForClient } from "@/lib/avatar";
import { encrypt } from "@/lib/crypto";
import { generateTemporaryPassword, generateEmployeeNumber } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations/employee";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
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
        employeeNumber: "asc",
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

    // Verificar NIF/NIE único en la organización
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        orgId,
        nifNie: data.nifNie,
      },
    });

    if (existingEmployee) {
      return NextResponse.json({ error: "Ya existe un empleado con este NIF/NIE" }, { status: 409 });
    }

    // Generar número de empleado si no se proporciona
    const employeeNumber = data.employeeNumber ?? generateEmployeeNumber();

    // Verificar número de empleado único
    const existingNumber = await prisma.employee.findFirst({
      where: {
        orgId,
        employeeNumber,
      },
    });

    if (existingNumber) {
      return NextResponse.json({ error: "El número de empleado ya existe" }, { status: 409 });
    }

    // Encriptar IBAN si se proporciona
    const encryptedIban = data.iban ? encrypt(data.iban) : null;

    // Convertir fecha de nacimiento
    const birthDate = data.birthDate ? new Date(data.birthDate) : null;

    if (!data.email) {
      throw Object.assign(new Error("EMAIL_REQUIRED"), { code: "EMAIL_REQUIRED" });
    }

    // Crear empleado en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear empleado
      const employee = await tx.employee.create({
        data: {
          orgId,
          employeeNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          secondLastName: data.secondLastName,
          nifNie: data.nifNie,
          email: data.email,
          phone: data.phone,
          mobilePhone: data.mobilePhone,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          province: data.province,
          birthDate,
          nationality: data.nationality,
          iban: encryptedIban,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyRelationship: data.emergencyRelationship,
          notes: data.notes,
        },
      });

      // Validar que no exista ya un usuario con ese email
      const existingUser = await tx.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        throw Object.assign(new Error("EMAIL_EXISTS"), { code: "EMAIL_EXISTS" });
      }

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const user = await tx.user.create({
        data: {
          orgId,
          email: data.email,
          password: hashedPassword,
          name: `${data.firstName} ${data.lastName}`,
          role: "EMPLOYEE",
          mustChangePassword: true, // Forzar cambio de contraseña en primer login
        },
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
      return NextResponse.json({ error: "El email ya está en uso" }, { status: 409 });
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
