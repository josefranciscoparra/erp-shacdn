import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/server/actions/shared/get-authenticated-employee";

export default async function MeLayout({ children }: { readonly children: ReactNode }) {
  const { employee } = await getAuthenticatedUser();

  // Solo los usuarios con empleado asociado pueden acceder a las páginas de "/dashboard/me/*"
  if (!employee) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
