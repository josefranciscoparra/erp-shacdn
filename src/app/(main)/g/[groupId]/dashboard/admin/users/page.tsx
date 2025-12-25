import { redirect } from "next/navigation";

import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getGroupAdmins, getGroupDirectoryUsers } from "@/server/actions/group-users";

import { GroupUsersClientPage } from "./client-page";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupUsersPage({ params }: PageProps) {
  const { groupId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Cargar datos en paralelo
  const [adminsData, directoryData] = await Promise.all([getGroupAdmins(groupId), getGroupDirectoryUsers(groupId)]);

  if (!adminsData.success || !directoryData.success) {
    // Si falla la carga (ej: permisos), mostramos error o 404
    console.error("Error loading group users data", {
      adminsError: adminsData.error,
      directoryError: directoryData.error,
    });
    // Si el error es de permisos, idealmente redirigir o mostrar UI de error
    // Por simplicidad, si falla mucho asumimos no autorizado o grupo no existe
    if (adminsData.error?.includes("FORBIDDEN")) {
      redirect("/dashboard");
    }
  }

  // Obtener rol actual del usuario en la sesión para pasar a la UI
  // Nota: getGroupAdmins ya valida permisos, así que aquí sabemos que tiene acceso.
  // Pero necesitamos el rol específico (SUPER_ADMIN o el rol de grupo) para la UI.
  const currentUserRole = (adminsData.viewerRole ?? session.user.role) as Role;

  return (
    <GroupUsersClientPage
      groupId={groupId}
      currentUserRole={currentUserRole}
      initialAdmins={adminsData.admins ?? []}
      initialDirectory={directoryData.users ?? []}
      organizations={directoryData.organizations ?? []}
    />
  );
}
