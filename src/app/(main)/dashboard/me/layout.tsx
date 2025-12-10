import { ReactNode } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
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

  if (!employeeId) {
    return <NoEmployeeAccess />;
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      orgId: activeOrgId,
    },
    select: { id: true },
  });

  if (!employee) {
    return <NoEmployeeAccess />;
  }

  return <>{children}</>;
}

function NoEmployeeAccess() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
      <div className="space-y-2">
        <p className="text-base font-semibold">No tienes ficha de empleado en esta organización</p>
        <p className="text-muted-foreground text-sm">
          Cambia a tu organización principal para acceder a tus fichajes, vacaciones y gastos personales.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Volver al dashboard</Link>
      </Button>
    </div>
  );
}
