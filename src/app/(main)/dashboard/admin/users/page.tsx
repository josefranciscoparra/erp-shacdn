"use client";

import { useEffect, useState } from "react";

import { type Role } from "@prisma/client";
import { Loader2, ShieldAlert, UserCog } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";

import { ChangeRoleDialog } from "./_components/change-role-dialog";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { ResetPasswordDialog } from "./_components/reset-password-dialog";
import { ToggleActiveDialog } from "./_components/toggle-active-dialog";
import { UserDetailsDialog } from "./_components/user-details-dialog";
import { type UserRow } from "./_components/users-columns";
import { UsersDataTable } from "./_components/users-data-table";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);

  // Estados para dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [toggleActiveDialogOpen, setToggleActiveDialogOpen] = useState(false);

  // Usuario seleccionado para acciones
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      setUsers(data.users ?? []);
      setUserRole(data.currentUserRole ?? null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      console.error("Error al cargar usuarios:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
  // Solo ORG_ADMIN y HR_ADMIN (roles administrativos)
  const getAllowedRoles = (): Role[] => {
    if (!userRole) return [];

    switch (userRole) {
      case "SUPER_ADMIN":
        return ["ORG_ADMIN", "HR_ADMIN"];
      case "ORG_ADMIN":
        return ["HR_ADMIN"]; // Solo puede crear HR_ADMIN
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Usuarios y Roles" subtitle="Gestiona los usuarios y sus permisos en el sistema" />
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
        <SectionHeader title="Usuarios y Roles" subtitle="Gestiona los usuarios y sus permisos en el sistema" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar usuarios: {error}</span>
        </div>
      </div>
    );
  }

  const hasUsers = users.length > 0;

  return (
    <PermissionGuard
      permission="manage_users"
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
        <SectionHeader title="Usuarios y Roles" subtitle="Gestiona los usuarios y sus permisos en el sistema" />

        {hasUsers ? (
          <UsersDataTable
            data={users}
            onCreateUser={() => setCreateDialogOpen(true)}
            onViewDetails={handleViewDetails}
            onChangeRole={handleChangeRole}
            onResetPassword={handleResetPassword}
            onToggleActive={handleToggleActive}
          />
        ) : (
          <EmptyState
            icon={<UserCog className="mx-auto h-12 w-12" />}
            title="No hay usuarios registrados"
            description="Comienza agregando tu primer usuario al sistema"
            actionLabel="Crear primer usuario"
            onAction={() => setCreateDialogOpen(true)}
          />
        )}

        {/* Dialogs */}
        <CreateUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onUserCreated={handleUserCreated}
          allowedRoles={getAllowedRoles()}
        />

        <UserDetailsDialog user={selectedUser} open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} />

        <ChangeRoleDialog
          user={selectedUser}
          open={changeRoleDialogOpen}
          onOpenChange={setChangeRoleDialogOpen}
          onSuccess={handleActionSuccess}
          allowedRoles={getAllowedRoles()}
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
