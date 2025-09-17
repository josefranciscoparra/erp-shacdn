import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // TODO: En producción, obtener orgId del usuario autenticado
    // Por ahora, usamos la primera organización
    const org = await prisma.organization.findFirst();
    
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }
    
    const employees = await prisma.employee.findMany({
      where: {
        orgId: org.id,
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