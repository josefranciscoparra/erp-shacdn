import { ReactNode } from "react";

import { redirect } from "next/navigation";

import { PersonalSpaceNoEmployeeNotice, PersonalSpaceWrongOrgNotice } from "@/components/hr/personal-space-access";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface MeLayoutProps {
  readonly children: ReactNode;
}

export default async function MeLayout({ children }: MeLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const activeOrgId = session.user.activeOrgId ?? session.user.orgId;
  const employeeId = session.user.employeeId;

  if (!activeOrgId) {
    redirect("/dashboard");
  }

  // Caso 1: Usuario sin empleado (solo tiene rol administrativo)
  if (!employeeId) {
    return <PersonalSpaceNoEmployeeNotice userRole={session.user.role} />;
  }

  // Obtener el empleado con su organización real
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      orgId: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!employee) {
    return <PersonalSpaceNoEmployeeNotice userRole={session.user.role} />;
  }

  // Caso 2: Usuario viendo una organización diferente a la de su empleado
  if (employee.orgId !== activeOrgId) {
    // Obtener el nombre de la organización que está viendo actualmente
    const viewingOrg = await prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { name: true },
    });

    return (
      <PersonalSpaceWrongOrgNotice
        employeeOrgId={employee.orgId}
        employeeOrgName={employee.organization.name ?? "Tu empresa"}
        viewingOrgName={viewingOrg?.name ?? "otra empresa"}
      />
    );
  }

  // Caso 3: Todo correcto - mostrar contenido
  return <>{children}</>;
}
