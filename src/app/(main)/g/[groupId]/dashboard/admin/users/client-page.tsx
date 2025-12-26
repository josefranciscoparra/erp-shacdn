"use client";

import { Role } from "@prisma/client";
import { Users, Building2 } from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectoryUserRow, GroupAdminRow } from "@/server/actions/group-users";

import { GroupOrganizationUsersTable } from "./_components/global-directory-table";
import { GroupAdminsTable } from "./_components/group-admins-table";

interface GroupUsersClientPageProps {
  groupId: string;
  currentUserRole: Role;
  initialAdmins: GroupAdminRow[];
  initialDirectory: DirectoryUserRow[];
  organizations: { id: string; name: string }[];
}

export function GroupUsersClientPage({
  groupId,
  currentUserRole,
  initialAdmins,
  initialDirectory,
  organizations,
}: GroupUsersClientPageProps) {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Gestión de Usuarios del Grupo"
        subtitle="Administra los permisos del grupo y los accesos por empresa"
        backButton={{ href: "/dashboard/admin/group-users", label: "Volver a grupos" }}
      />

      <Tabs defaultValue="admins" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Administradores
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Accesos por empresa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="mt-6">
          <GroupAdminsTable data={initialAdmins} groupId={groupId} currentUserRole={currentUserRole} />
        </TabsContent>

        <TabsContent value="organizations" className="mt-6">
          <GroupOrganizationUsersTable
            data={initialDirectory}
            groupId={groupId}
            organizations={organizations}
            currentUserRole={currentUserRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
