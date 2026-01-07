"use client";

import { useCallback, useEffect, useState } from "react";

import { type Role } from "@prisma/client";
import { Loader2, ShieldAlert, UserCog } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { usePermissions } from "@/hooks/use-permissions";

import { ChangeRoleDialog } from "./_components/change-role-dialog";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { ResetPasswordDialog } from "./_components/reset-password-dialog";
import { ToggleActiveDialog } from "./_components/toggle-active-dialog";
import { UserDetailsDialog } from "./_components/user-details-dialog";
import { type UserRow } from "./_components/users-columns";
import { UsersDataTable } from "./_components/users-data-table";

export default function UsersManagementPage({ groupId }: { groupId?: string }) {
  const { hasPermission } = usePermissions();
  const canManageUsers = hasPermission("manage_users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [canManageUserOrganizations, setCanManageUserOrganizations] = useState(false);
  const [availableOrganizations, setAvailableOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Estados para dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [toggleActiveDialogOpen, setToggleActiveDialogOpen] = useState(false);

  // Usuario seleccionado para acciones
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch all users (limit=1000 to get all users, pagination is handled client-side by TanStack Table)
      const params = new URLSearchParams({ limit: "1000" });
      if (groupId) {
        params.set("groupId", groupId);
      }
      if (userRole === "SUPER_ADMIN" && selectedOrgId) {
        params.set("orgId", selectedOrgId);
      }
      const response = await fetch(`/api/admin/users?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      const nextRole = data.currentUserRole ?? null;
      const nextOrganizations = data.availableOrganizations ?? [];

      setUsers(data.users ?? []);
      setUserRole(nextRole);
      setCanManageUserOrganizations(data.canManageUserOrganizations ?? false);
      setAvailableOrganizations(nextOrganizations);

      if (nextRole === "SUPER_ADMIN" && !selectedOrgId) {
        let defaultOrgId = data.activeOrgId ?? null;
        defaultOrgId ??= nextOrganizations[0]?.id ?? null;
        if (defaultOrgId) {
          setSelectedOrgId(defaultOrgId);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      console.error("Error al cargar usuarios:", err);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, selectedOrgId, userRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserCreated = () => {
    setCreateDialogOpen(false);
    fetchUsers();
  };

  // Handlers para acciones
  const handleViewDetails = (user: UserRow) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  const handleChangeRole = (user: UserRow) => {
    setSelectedUser(user);
    setChangeRoleDialogOpen(true);
  };

  const handleResetPassword = (user: UserRow) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleToggleActive = (user: UserRow) => {
    setSelectedUser(user);
    setToggleActiveDialogOpen(true);
  };

  const handleActionSuccess = () => {
    fetchUsers();
  };

  // Determinar roles permitidos basándose en el rol del usuario actual
  // Solo roles administrativos para CREACIÓN
  const getAllowedRoles = (): Role[] => {
    if (!userRole) return [];

    switch (userRole) {
      case "SUPER_ADMIN":
        return ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT"];
      case "ORG_ADMIN":
        return ["HR_ADMIN", "HR_ASSISTANT"]; // Solo puede crear RRHH
      case "HR_ADMIN":
        return ["HR_ADMIN", "HR_ASSISTANT"]; // Puede crear RRHH
      default:
        return [];
    }
  };

  // Determinar roles permitidos para CAMBIO de rol (más permisivo)
  const getAllowedRolesForChange = (): Role[] => {
    if (!userRole) return [];

    switch (userRole) {
      case "SUPER_ADMIN":
        return ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"];
      case "ORG_ADMIN":
        return ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"];
      case "HR_ADMIN":
        return ["HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"]; // Ahora puede ascender a RRHH
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title={groupId ? "Usuarios por grupo" : "Usuarios y Roles"}
          subtitle={
            groupId
              ? "Gestiona los usuarios y permisos dentro del grupo seleccionado"
              : "Gestiona los usuarios y sus permisos en el sistema"
          }
          backButton={groupId ? { href: "/dashboard/admin/group-users", label: "Volver a grupos" } : undefined}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando usuarios...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title={groupId ? "Usuarios por grupo" : "Usuarios y Roles"}
          subtitle={
            groupId
              ? "Gestiona los usuarios y permisos dentro del grupo seleccionado"
              : "Gestiona los usuarios y sus permisos en el sistema"
          }
          backButton={groupId ? { href: "/dashboard/admin/group-users", label: "Volver a grupos" } : undefined}
        />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar usuarios: {error}</span>
        </div>
      </div>
    );
  }

  const hasUsers = users.length > 0;
  const allowedRoles = getAllowedRoles();
  const canCreateUsers = allowedRoles.length > 0;

  return (
    <PermissionGuard
      permissions={["manage_users", "view_all_users"]}
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Usuarios y Roles" subtitle="Gestiona los usuarios y sus permisos en el sistema" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para ver esta sección"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title={groupId ? "Usuarios por grupo" : "Usuarios y Roles"}
          subtitle={
            groupId
              ? "Gestiona los usuarios y permisos dentro del grupo seleccionado"
              : "Gestiona los usuarios y sus permisos en el sistema"
          }
          backButton={groupId ? { href: "/dashboard/admin/group-users", label: "Volver a grupos" } : undefined}
        />

        {hasUsers ? (
          <UsersDataTable
            data={users}
            onCreateUser={() => setCreateDialogOpen(true)}
            onViewDetails={handleViewDetails}
            onChangeRole={handleChangeRole}
            onResetPassword={handleResetPassword}
            onToggleActive={handleToggleActive}
            canCreateUsers={canCreateUsers}
            canManageUsers={canManageUsers}
            canManageUserOrganizations={canManageUserOrganizations}
            currentUserRole={userRole}
            availableOrganizations={availableOrganizations}
            selectedOrgId={selectedOrgId}
            onOrgChange={setSelectedOrgId}
            groupId={groupId}
          />
        ) : (
          <EmptyState
            icon={<UserCog className="mx-auto h-12 w-12" />}
            title="No hay usuarios registrados"
            description={
              canCreateUsers
                ? "Comienza agregando tu primer usuario al sistema"
                : "Solo SUPER_ADMIN y ORG_ADMIN pueden crear usuarios administrativos"
            }
            actionLabel={canCreateUsers ? "Crear primer usuario" : undefined}
            onAction={canCreateUsers ? () => setCreateDialogOpen(true) : undefined}
          />
        )}

        {/* Dialogs */}
        <CreateUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onUserCreated={handleUserCreated}
          allowedRoles={getAllowedRoles()}
        />

        <UserDetailsDialog
          user={selectedUser}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          currentUserRole={userRole}
        />

        <ChangeRoleDialog
          user={selectedUser}
          open={changeRoleDialogOpen}
          onOpenChange={setChangeRoleDialogOpen}
          onSuccess={handleActionSuccess}
          allowedRoles={getAllowedRolesForChange()}
        />

        <ResetPasswordDialog
          user={selectedUser}
          open={resetPasswordDialogOpen}
          onOpenChange={setResetPasswordDialogOpen}
          onSuccess={handleActionSuccess}
        />

        <ToggleActiveDialog
          user={selectedUser}
          open={toggleActiveDialogOpen}
          onOpenChange={setToggleActiveDialogOpen}
          onSuccess={handleActionSuccess}
        />
      </div>
    </PermissionGuard>
  );
}
