import { NextResponse } from "next/server";

import { HierarchyType } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface EmployeeNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  photoUrl: string | null;
  position: string | null;
  department: string | null;
}

interface DepartmentNode {
  id: string;
  name: string;
  manager: EmployeeNode | null;
  employees: EmployeeNode[];
}

interface OrganizationChartData {
  hierarchyType: HierarchyType;
  ceo?: EmployeeNode | null;
  departments: DepartmentNode[];
  employees: EmployeeNode[];
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;

    // Obtener tipo de jerarquía de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { hierarchyType: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const { hierarchyType } = organization;

    // Obtener departamentos con sus managers y empleados
    const departments = await prisma.department.findMany({
      where: {
        orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
            employmentContracts: {
              where: { active: true },
              select: {
                position: {
                  select: { title: true },
                },
                department: {
                  select: { name: true },
                },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Obtener todos los empleados activos con sus contratos
    const allEmployees = await prisma.employee.findMany({
      where: {
        orgId,
        active: true,
        employmentStatus: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        photoUrl: true,
        employmentContracts: {
          where: { active: true },
          select: {
            departmentId: true,
            managerId: true,
            position: {
              select: { title: true },
            },
            department: {
              select: { name: true },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    // Transformar departamentos
    const transformedDepartments: DepartmentNode[] = await Promise.all(
      departments.map(async (dept) => {
        // Obtener empleados del departamento (excluyendo al manager)
        const deptEmployees = allEmployees.filter((emp) => {
          const contract = emp.employmentContracts[0];
          return contract?.departmentId === dept.id && emp.id !== dept.manager?.id;
        });

        return {
          id: dept.id,
          name: dept.name,
          manager: dept.manager
            ? {
                id: dept.manager.id,
                firstName: dept.manager.firstName,
                lastName: dept.manager.lastName,
                email: dept.manager.email,
                photoUrl: dept.manager.photoUrl,
                position: dept.manager.employmentContracts[0]?.position?.title ?? null,
                department: dept.manager.employmentContracts[0]?.department?.name ?? null,
              }
            : null,
          employees: deptEmployees.map((emp) => ({
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            photoUrl: emp.photoUrl,
            position: emp.employmentContracts[0]?.position?.title ?? null,
            department: emp.employmentContracts[0]?.department?.name ?? null,
          })),
        };
      }),
    );

    // Para jerarquía plana, devolver todos los empleados sin estructura
    const flatEmployees: EmployeeNode[] = allEmployees.map((emp) => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      photoUrl: emp.photoUrl,
      position: emp.employmentContracts[0]?.position?.title ?? null,
      department: emp.employmentContracts[0]?.department?.name ?? null,
    }));

    // Para jerarquía HIERARCHICAL, buscar CEO (empleado sin manager)
    let ceo: EmployeeNode | null = null;
    if (hierarchyType === HierarchyType.HIERARCHICAL) {
      const ceoEmployee = allEmployees.find((emp) => {
        const contract = emp.employmentContracts[0];
        return contract && !contract.managerId;
      });

      if (ceoEmployee) {
        ceo = {
          id: ceoEmployee.id,
          firstName: ceoEmployee.firstName,
          lastName: ceoEmployee.lastName,
          email: ceoEmployee.email,
          photoUrl: ceoEmployee.photoUrl,
          position: ceoEmployee.employmentContracts[0]?.position?.title ?? null,
          department: ceoEmployee.employmentContracts[0]?.department?.name ?? null,
        };
      }
    }

    const response: OrganizationChartData = {
      hierarchyType,
      ...(hierarchyType === HierarchyType.HIERARCHICAL ? { ceo } : {}),
      departments: transformedDepartments,
      employees: flatEmployees,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error al obtener organigrama:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
