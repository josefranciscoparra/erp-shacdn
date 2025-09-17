import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations/employee";
import { encrypt } from "@/lib/crypto";
import { generateTemporaryPassword, generateEmployeeNumber } from "@/lib/password";
import bcrypt from "bcryptjs";

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
            email: true,
            role: true,
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
        department: currentContract?.department || null,
        position: currentContract?.position || null,
        employmentContracts: employee.employmentContracts.map(contract => ({
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
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del request
    const body = await request.json();
    
    // Validar datos
    const validation = createEmployeeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.issues },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Ya existe un empleado con este NIF/NIE" },
        { status: 409 }
      );
    }

    // Generar número de empleado si no se proporciona
    const employeeNumber = data.employeeNumber || generateEmployeeNumber();

    // Verificar número de empleado único
    const existingNumber = await prisma.employee.findFirst({
      where: {
        orgId,
        employeeNumber,
      },
    });

    if (existingNumber) {
      return NextResponse.json(
        { error: "El número de empleado ya existe" },
        { status: 409 }
      );
    }

    // Encriptar IBAN si se proporciona
    const encryptedIban = data.iban ? encrypt(data.iban) : null;

    // Convertir fecha de nacimiento
    const birthDate = data.birthDate ? new Date(data.birthDate) : null;

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
          email: data.email || null,
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

      // Crear usuario si se proporciona email
      let user = null;
      let temporaryPassword = null;

      if (data.email) {
        temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        user = await tx.user.create({
          data: {
            orgId,
            email: data.email,
            password: hashedPassword,
            name: `${data.firstName} ${data.lastName}`,
            role: "EMPLOYEE",
          },
        });

        // Vincular usuario con empleado
        await tx.employee.update({
          where: { id: employee.id },
          data: { userId: user.id },
        });
      }

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
  } catch (error) {
    console.error("Error al crear empleado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}