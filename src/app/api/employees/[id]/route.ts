import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateEmployeeSchema = z.object({
  // Datos personales
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  secondLastName: z.string().optional(),
  nifNie: z.string().min(1, "El NIF/NIE es requerido"),
  birthDate: z.string().optional(),
  nationality: z.string().optional(),

  // Estado laboral
  employmentStatus: z.enum([
    "PENDING_CONTRACT",
    "ACTIVE",
    "ON_LEAVE",
    "VACATION",
    "SUSPENDED",
    "TERMINATED",
    "RETIRED",
  ]),
  employeeNumber: z.string().optional(),
  teamId: z.string().optional(),

  // Datos de contacto
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  province: z.string().optional(),
  country: z.string().default("ES"),

  // Contacto de emergencia
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyRelationship: z.string().optional(),

  // Datos bancarios (se cifrarán)
  iban: z.string().optional(),

  // Notas
  notes: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Validar que el ID es válido
    if (!id || typeof id !== "string") {
      return NextResponse.json({ message: "ID de empleado inválido" }, { status: 400 });
    }

    // Buscar el empleado con todas sus relaciones
    const employee = await prisma.employee.findUnique({
      where: {
        id,
        orgId: session.user.orgId, // Solo empleados de la misma organización
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            active: true,
            mustChangePassword: true,
            temporaryPasswords: {
              orderBy: {
                createdAt: "desc",
              },
              take: 10,
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
                notes: true,
                createdBy: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        employmentContracts: {
          include: {
            position: {
              select: {
                title: true,
                level: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
            costCenter: {
              select: {
                name: true,
                code: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ message: "Empleado no encontrado" }, { status: 404 });
    }

    const inviteHistory = employee.user?.id
      ? await prisma.emailLog.findMany({
          where: {
            userId: employee.user.id,
            templateId: "AUTH_INVITE",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          select: {
            id: true,
            createdAt: true,
            status: true,
            errorMessage: true,
            subject: true,
          },
        })
      : [];

    const lastInvite = inviteHistory.length ? inviteHistory[0] : null;
    const inviteStatus = lastInvite ? (lastInvite.status === "SUCCESS" ? "SENT" : "FAILED") : "PENDING";

    // Transformar las fechas para el cliente y descifrar el IBAN
    const employeeData = {
      ...employee,
      iban: employee.iban ? decrypt(employee.iban) : null,
      birthDate: employee.birthDate?.toISOString(),
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      // photoUrl sin timestamp - se cachea por 24h
      // Construir URL de la API sin parámetros de query
      photoUrl: employee.photoUrl ? `/api/users/${employee.user?.id ?? employee.id}/avatar` : null,
      employmentContracts: employee.employmentContracts.map((contract) => ({
        ...contract,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate?.toISOString() ?? null,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
        grossSalary: contract.grossSalary ? Number(contract.grossSalary) : null,
        weeklyHours: Number(contract.weeklyHours),
      })),
      inviteStatus,
      inviteLastAttemptAt: lastInvite ? lastInvite.createdAt.toISOString() : null,
      inviteHistory: inviteHistory.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        status: log.status,
        errorMessage: log.errorMessage ?? null,
        subject: log.subject,
      })),
    };

    return NextResponse.json(employeeData);
  } catch (error) {
    console.error("❌ Error al obtener empleado:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: employeeId } = await params;
    const body = await request.json();

    // Validar datos
    const result = updateEmployeeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos", details: result.error.issues }, { status: 400 });
    }

    const data = result.data;

    // Verificar que el empleado existe y pertenece a la organización
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        orgId: session.user.orgId,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Verificar unicidad del employeeNumber si se proporciona
    if (data.employeeNumber && data.employeeNumber !== existingEmployee.employeeNumber) {
      const existingWithNumber = await prisma.employee.findFirst({
        where: {
          orgId: session.user.orgId,
          employeeNumber: data.employeeNumber,
          id: { not: employeeId },
        },
      });

      if (existingWithNumber) {
        return NextResponse.json({ error: "Ya existe un empleado con ese número" }, { status: 400 });
      }
    }

    // Verificar unicidad del NIF/NIE
    if (data.nifNie !== existingEmployee.nifNie) {
      const existingWithNif = await prisma.employee.findFirst({
        where: {
          orgId: session.user.orgId,
          nifNie: data.nifNie,
          id: { not: employeeId },
        },
      });

      if (existingWithNif) {
        return NextResponse.json({ error: "Ya existe un empleado con ese NIF/NIE" }, { status: 400 });
      }
    }

    // Preparar datos para actualización
    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      secondLastName: data.secondLastName ?? null,
      nifNie: data.nifNie,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      nationality: data.nationality ?? null,
      employmentStatus: data.employmentStatus,
      employeeNumber: data.employeeNumber ?? null,
      teamId: data.teamId ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      mobilePhone: data.mobilePhone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      postalCode: data.postalCode ?? null,
      province: data.province ?? null,
      country: data.country,
      emergencyContactName: data.emergencyContactName ?? null,
      emergencyContactPhone: data.emergencyContactPhone ?? null,
      emergencyRelationship: data.emergencyRelationship ?? null,
      notes: data.notes ?? null,
    };

    // Cifrar IBAN si se proporciona, o null si está vacío
    if (data.iban) {
      updateData.iban = encrypt(data.iban);
    } else {
      updateData.iban = null;
    }

    // Construir el nombre completo para User.name
    const fullName = `${data.firstName} ${data.lastName}${data.secondLastName ? ` ${data.secondLastName}` : ""}`;

    // Actualizar empleado y usuario asociado en una transacción
    const updatedEmployee = await prisma.$transaction(async (tx) => {
      // Actualizar datos del empleado
      const employee = await tx.employee.update({
        where: { id: employeeId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              active: true,
              mustChangePassword: true,
            },
          },
          employmentContracts: {
            where: { active: true },
            include: {
              position: true,
              department: true,
              costCenter: true,
              manager: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
      });

      // Si el empleado tiene usuario asociado, actualizar User.name
      if (existingEmployee.user?.id) {
        await tx.user.update({
          where: { id: existingEmployee.user.id },
          data: { name: fullName },
        });
      }

      return employee;
    });

    // Revalidar rutas para refrescar los datos en el frontend
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/employees/${employeeId}`);

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
