"use client";

import * as React from "react";

import type { Role } from "@prisma/client";
import { Building2, Check, Loader2, Plus, Shield, Star, StarOff, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type UserOrganizationItem,
  type AvailableOrganization,
  listUserOrganizations,
  getAvailableOrganizations,
  addUserOrganization,
  setDefaultOrganization,
  toggleUserOrganization,
  removeUserOrganization,
  updateUserOrganizationRole,
  updateUserOrganizationManageFlag,
} from "@/server/actions/user-organizations";
import { getCreatableRoles, getEditableRoles } from "@/services/permissions/role-hierarchy";

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Org",
  HR_ADMIN: "Admin RRHH",
  HR_ASSISTANT: "Asistente RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  ORG_ADMIN: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HR_ADMIN: "bg-green-500/10 text-green-700 dark:text-green-300",
  HR_ASSISTANT: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  MANAGER: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  EMPLOYEE: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

// Roles disponibles para asignar (no incluye SUPER_ADMIN)
const ASSIGNABLE_ROLES: Role[] = ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"];

interface UserOrganizationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  currentUserRole?: Role | null;
  groupId?: string;
  readOnly?: boolean;
}

export function UserOrganizationsDialog({
  open,
  onOpenChange,
  user,
  currentUserRole,
  groupId,
  readOnly = false,
}: UserOrganizationsDialogProps) {
  const [memberships, setMemberships] = React.useState<UserOrganizationItem[]>([]);
  const [availableOrgs, setAvailableOrgs] = React.useState<AvailableOrganization[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);
  const [employeeOrgId, setEmployeeOrgId] = React.useState<string | null>(null);
  const [employeeOrgName, setEmployeeOrgName] = React.useState<string | null>(null);

  // Estado para el formulario de añadir
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [selectedOrgIds, setSelectedOrgIds] = React.useState<string[]>([]);
  const [selectedRole, setSelectedRole] = React.useState<Role>("EMPLOYEE");
  const [isDefault, setIsDefault] = React.useState(false);
  const [canManageUserOrganizations, setCanManageUserOrganizations] = React.useState(false);

  const assignableRoles = React.useMemo(() => {
    if (!currentUserRole) return ASSIGNABLE_ROLES;
    return getCreatableRoles(currentUserRole);
  }, [currentUserRole]);

  const canGrantManageFlag = currentUserRole === "SUPER_ADMIN" || currentUserRole === "ORG_ADMIN";
  const activeMemberships = React.useMemo(() => memberships.filter((membership) => membership.isActive), [memberships]);
  const bulkManageTargets = React.useMemo(
    () => activeMemberships.filter((membership) => membership.role === "HR_ADMIN"),
    [activeMemberships],
  );
  const bulkManageEnabled =
    bulkManageTargets.length > 0 && bulkManageTargets.every((membership) => membership.canManageUserOrganizations);
  const hasEmployeeOrg = Boolean(employeeOrgId);
  const canSetDefaultForSelectedOrg = React.useMemo(() => {
    if (selectedOrgIds.length !== 1) return false;
    if (!employeeOrgId) return true;
    return selectedOrgIds[0] === employeeOrgId;
  }, [employeeOrgId, selectedOrgIds]);

  // Cargar datos al abrir el dialog
  React.useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user, groupId]);

  React.useEffect(() => {
    if (!showAddForm) return;
    if (assignableRoles.length === 0) return;
    if (assignableRoles.includes(selectedRole)) return;
    setSelectedRole(assignableRoles[0]);
  }, [assignableRoles, selectedRole, showAddForm]);

  React.useEffect(() => {
    if (selectedRole !== "HR_ADMIN" && canManageUserOrganizations) {
      setCanManageUserOrganizations(false);
    }
  }, [selectedRole, canManageUserOrganizations]);

  React.useEffect(() => {
    if (selectedOrgIds.length !== 1 && isDefault) {
      setIsDefault(false);
    }
  }, [selectedOrgIds, isDefault]);

  React.useEffect(() => {
    if (isDefault && !canSetDefaultForSelectedOrg) {
      setIsDefault(false);
    }
  }, [isDefault, canSetDefaultForSelectedOrg]);

  React.useEffect(() => {
    if (availableOrgs.length === 0) return;
    setSelectedOrgIds((prev) => prev.filter((id) => availableOrgs.some((org) => org.id === id)));
  }, [availableOrgs]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [membershipsResult, availableResult] = await Promise.all([
        listUserOrganizations(user.id, groupId),
        getAvailableOrganizations(user.id, groupId),
      ]);

      if (membershipsResult.success && membershipsResult.memberships) {
        setMemberships(membershipsResult.memberships);
        setEmployeeOrgId(membershipsResult.employeeOrgId ?? null);
        setEmployeeOrgName(membershipsResult.employeeOrgName ?? null);
      }

      if (availableResult.success && availableResult.organizations) {
        setAvailableOrgs(availableResult.organizations);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOrganization = async () => {
    if (!user || selectedOrgIds.length === 0) return;

    setIsAdding(true);
    try {
      const shouldSetDefault = isDefault && selectedOrgIds.length === 1;
      const results = await Promise.all(
        selectedOrgIds.map((orgId) =>
          addUserOrganization({
            userId: user.id,
            orgId,
            role: selectedRole,
            isDefault: shouldSetDefault,
            canManageUserOrganizations,
            groupId,
          }),
        ),
      );

      const hasErrors = results.some((result) => !result.success);

      if (hasErrors) {
        toast.error("Algunas organizaciones no se pudieron añadir");
      } else {
        toast.success(
          selectedOrgIds.length > 1 ? "Organizaciones añadidas correctamente" : "Organización añadida correctamente",
        );
      }

      resetAddForm();
      await loadData();
    } catch {
      toast.error("Error al añadir organización");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSetDefault = async (orgId: string) => {
    if (!user) return;

    setPendingAction(`default-${orgId}`);
    try {
      const result = await setDefaultOrganization(user.id, orgId, groupId);

      if (result.success) {
        toast.success("Organización por defecto actualizada");
        await loadData();
      } else {
        toast.error(result.error ?? "Error al cambiar organización por defecto");
      }
    } catch {
      toast.error("Error al cambiar organización por defecto");
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleActive = async (membership: UserOrganizationItem) => {
    setPendingAction(`toggle-${membership.id}`);
    try {
      const result = await toggleUserOrganization(membership.id, !membership.isActive, groupId);

      if (result.success) {
        toast.success(membership.isActive ? "Membresía desactivada" : "Membresía activada");
        await loadData();
      } else {
        toast.error(result.error ?? "Error al cambiar estado de membresía");
      }
    } catch {
      toast.error("Error al cambiar estado de membresía");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemove = async (membership: UserOrganizationItem) => {
    setPendingAction(`remove-${membership.id}`);
    try {
      const result = await removeUserOrganization(membership.id, groupId);

      if (result.success) {
        toast.success("Membresía eliminada");
        await loadData();
      } else {
        toast.error(result.error ?? "Error al eliminar membresía");
      }
    } catch {
      toast.error("Error al eliminar membresía");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRoleChange = async (membership: UserOrganizationItem, newRole: Role) => {
    setPendingAction(`role-${membership.id}`);
    try {
      const result = await updateUserOrganizationRole(membership.id, newRole, groupId);

      if (result.success) {
        toast.success("Rol actualizado");
        await loadData();
      } else {
        toast.error(result.error ?? "Error al actualizar rol");
      }
    } catch {
      toast.error("Error al actualizar rol");
    } finally {
      setPendingAction(null);
    }
  };

  const handleManageFlagChange = async (membership: UserOrganizationItem, value: boolean) => {
    setPendingAction(`manage-${membership.id}`);
    try {
      const result = await updateUserOrganizationManageFlag(membership.id, value, groupId);

      if (result.success) {
        toast.success("Permiso actualizado");
        await loadData();
      } else {
        toast.error(result.error ?? "Error al actualizar permiso");
      }
    } catch {
      toast.error("Error al actualizar permiso");
    } finally {
      setPendingAction(null);
    }
  };

  const handleBulkManageFlagChange = async (value: boolean) => {
    if (bulkManageTargets.length === 0) return;

    setIsBulkUpdating(true);
    try {
      const results = await Promise.all(
        bulkManageTargets.map((membership) => updateUserOrganizationManageFlag(membership.id, value, groupId)),
      );

      const hasErrors = results.some((result) => !result.success);

      if (hasErrors) {
        toast.error("Algunas organizaciones no se pudieron actualizar");
      } else {
        toast.success(value ? "Permiso aplicado a todas" : "Permiso retirado de todas");
      }

      await loadData();
    } catch {
      toast.error("Error al actualizar permisos");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const resetAddForm = () => {
    setShowAddForm(false);
    setSelectedOrgIds([]);
    const defaultRole = assignableRoles[0] ?? "EMPLOYEE";
    setSelectedRole(defaultRole);
    setIsDefault(false);
    setCanManageUserOrganizations(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizaciones de {user.name}
          </DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : readOnly ? (
            <>
              {memberships.length > 0 ? (
                <div className="space-y-3">
                  {employeeOrgName ? (
                    <div className="text-muted-foreground rounded-lg border px-3 py-2 text-xs">
                      Empleado de <span className="text-foreground font-medium">{employeeOrgName}</span>.
                    </div>
                  ) : null}
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px] whitespace-nowrap">Organización</TableHead>
                          <TableHead className="w-[180px] whitespace-nowrap">Rol</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap">Principal</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap">Activa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberships.map((membership) => (
                          <TableRow key={membership.id} className={!membership.isActive ? "opacity-50" : ""}>
                            <TableCell className="font-medium whitespace-nowrap">
                              <div className="flex max-w-[250px] items-center gap-2 sm:max-w-[350px]">
                                <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                                <span className="block truncate" title={membership.orgName}>
                                  {membership.orgName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className={ROLE_COLORS[membership.role]}>
                                <Shield className="mr-1 h-3 w-3" />
                                {ROLE_DISPLAY_NAMES[membership.role]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                              {membership.isDefault ? (
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              ) : (
                                <StarOff className="text-muted-foreground h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                              {membership.isActive ? (
                                <ToggleRight className="h-5 w-5 text-green-500" />
                              ) : (
                                <ToggleLeft className="text-muted-foreground h-5 w-5" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    La gestión multiempresa se realiza desde la pantalla de Grupos.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="text-muted-foreground/30 mb-4 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">Este usuario no tiene organizaciones asignadas</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Tabla de membresías */}
              {memberships.length > 0 ? (
                <div className="space-y-3">
                  {employeeOrgName ? (
                    <div className="text-muted-foreground rounded-lg border px-3 py-2 text-xs">
                      Empleado de <span className="text-foreground font-medium">{employeeOrgName}</span>. La
                      organización principal debe coincidir con la organización del empleado.
                    </div>
                  ) : null}
                  {canGrantManageFlag && bulkManageTargets.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium break-words">Permiso multi-org en organizaciones donde es HR Admin</p>
                        <p className="text-muted-foreground text-xs break-words">
                          Concede o revoca el permiso de gestión multi-org en {bulkManageTargets.length} organizaciones
                          donde este usuario tiene rol HR Admin.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isBulkUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Switch
                            checked={bulkManageEnabled}
                            onCheckedChange={handleBulkManageFlagChange}
                            aria-label="Aplicar permiso de gestión multi-org en todas las organizaciones HR Admin"
                          />
                        )}
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px] whitespace-nowrap">Organización</TableHead>
                          <TableHead className="w-[180px] whitespace-nowrap">Rol</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap">Principal</TableHead>
                          <TableHead className="w-[100px] text-center whitespace-nowrap">Multi-org</TableHead>
                          <TableHead className="w-[80px] text-center whitespace-nowrap">Activa</TableHead>
                          <TableHead className="w-[80px] text-right whitespace-nowrap">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberships.map((membership) => {
                          const editableRoles = currentUserRole
                            ? getEditableRoles(currentUserRole, membership.role)
                            : ASSIGNABLE_ROLES;
                          const canEditMembershipRole = editableRoles.length > 0;
                          const canToggleManageFlag =
                            canGrantManageFlag && membership.role === "HR_ADMIN" && membership.isActive;
                          const isDefaultLocked = hasEmployeeOrg && membership.orgId !== employeeOrgId;
                          const canSetDefault =
                            !isDefaultLocked && membership.isActive && pendingAction !== `default-${membership.orgId}`;

                          return (
                            <TableRow key={membership.id} className={!membership.isActive ? "opacity-50" : ""}>
                              <TableCell className="font-medium whitespace-nowrap">
                                <div className="flex max-w-[250px] items-center gap-2 sm:max-w-[350px]">
                                  <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                                  <span className="block truncate" title={membership.orgName}>
                                    {membership.orgName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {canEditMembershipRole ? (
                                  <Select
                                    value={membership.role}
                                    onValueChange={(value: Role) => handleRoleChange(membership, value)}
                                    disabled={pendingAction === `role-${membership.id}`}
                                  >
                                    <SelectTrigger className="w-[160px]">
                                      <SelectValue>
                                        <Badge variant="outline" className={ROLE_COLORS[membership.role]}>
                                          <Shield className="mr-1 h-3 w-3" />
                                          {ROLE_DISPLAY_NAMES[membership.role]}
                                        </Badge>
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {editableRoles.map((role) => (
                                        <SelectItem key={role} value={role}>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={ROLE_COLORS[role]}>
                                              <Shield className="mr-1 h-3 w-3" />
                                              {ROLE_DISPLAY_NAMES[role]}
                                            </Badge>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="outline" className={ROLE_COLORS[membership.role]}>
                                    <Shield className="mr-1 h-3 w-3" />
                                    {ROLE_DISPLAY_NAMES[membership.role]}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                {membership.isDefault ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex justify-center">
                                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Organización principal</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          disabled={!canSetDefault}
                                          onClick={() => handleSetDefault(membership.orgId)}
                                        >
                                          {pendingAction === `default-${membership.orgId}` ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <StarOff className="text-muted-foreground h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {isDefaultLocked
                                            ? "La organización principal debe ser la del empleado"
                                            : "Marcar como principal"}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-center">
                                        {pendingAction === `manage-${membership.id}` || isBulkUpdating ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : canToggleManageFlag ? (
                                          <Switch
                                            checked={membership.canManageUserOrganizations}
                                            onCheckedChange={(value) => handleManageFlagChange(membership, value)}
                                            disabled={isBulkUpdating}
                                            aria-label="Permiso de gestión multiempresa"
                                          />
                                        ) : (
                                          <span className="text-muted-foreground text-xs">No aplica</span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {!canGrantManageFlag
                                          ? "Solo Admin Org o Super Admin pueden asignar"
                                          : membership.role !== "HR_ADMIN" || !membership.isActive
                                            ? "Solo aplica a membresías HR Admin activas"
                                            : membership.canManageUserOrganizations
                                              ? "Puede gestionar organizaciones"
                                              : "Sin permiso de gestión multi-org"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex justify-center">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          disabled={membership.isDefault || pendingAction === `toggle-${membership.id}`}
                                          onClick={() => handleToggleActive(membership)}
                                        >
                                          {pendingAction === `toggle-${membership.id}` ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : membership.isActive ? (
                                            <ToggleRight className="h-5 w-5 text-green-500" />
                                          ) : (
                                            <ToggleLeft className="text-muted-foreground h-5 w-5" />
                                          )}
                                        </Button>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {membership.isDefault
                                          ? "No se puede desactivar la principal"
                                          : membership.isActive
                                            ? "Desactivar"
                                            : "Activar"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex justify-end">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive hover:text-destructive h-8 w-8"
                                          disabled={
                                            membership.isDefault ||
                                            memberships.length <= 1 ||
                                            pendingAction === `remove-${membership.id}`
                                          }
                                          onClick={() => handleRemove(membership)}
                                        >
                                          {pendingAction === `remove-${membership.id}` ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {membership.isDefault
                                          ? "No se puede eliminar la principal"
                                          : memberships.length <= 1
                                            ? "Debe tener al menos una organización"
                                            : "Eliminar"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="text-muted-foreground/30 mb-4 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">Este usuario no tiene organizaciones asignadas</p>
                </div>
              )}

              <Separator />

              {/* Formulario para añadir */}
              {showAddForm ? (
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium">Añadir organización</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Organización</label>
                      {groupId ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Aplicar a todas las organizaciones del grupo</span>
                            <Switch
                              checked={selectedOrgIds.length === availableOrgs.length && availableOrgs.length > 0}
                              onCheckedChange={(checked) =>
                                setSelectedOrgIds(checked ? availableOrgs.map((org) => org.id) : [])
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            {availableOrgs.map((org) => {
                              const isChecked = selectedOrgIds.includes(org.id);
                              return (
                                <div key={org.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`org-${org.id}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      setSelectedOrgIds((prev) => {
                                        if (checked) {
                                          return prev.includes(org.id) ? prev : [...prev, org.id];
                                        }
                                        return prev.filter((id) => id !== org.id);
                                      });
                                    }}
                                  />
                                  <label htmlFor={`org-${org.id}`} className="text-sm">
                                    {org.name}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={selectedOrgIds[0] ?? ""}
                          onValueChange={(value) => setSelectedOrgIds(value ? [value] : [])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar organización" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOrgs.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Rol</label>
                      <Select value={selectedRole} onValueChange={(value: Role) => setSelectedRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_DISPLAY_NAMES[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isDefault}
                      onCheckedChange={setIsDefault}
                      id="is-default"
                      disabled={selectedOrgIds.length !== 1 || !canSetDefaultForSelectedOrg}
                    />
                    <label htmlFor="is-default" className="text-sm">
                      Marcar como organización principal
                    </label>
                    {hasEmployeeOrg && selectedOrgIds.length === 1 && !canSetDefaultForSelectedOrg ? (
                      <span className="text-muted-foreground text-xs">
                        Disponible solo para la organización del empleado.
                      </span>
                    ) : null}
                  </div>
                  {canGrantManageFlag && selectedRole === "HR_ADMIN" && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={canManageUserOrganizations}
                        onCheckedChange={setCanManageUserOrganizations}
                        id="can-manage-orgs"
                      />
                      <label htmlFor="can-manage-orgs" className="text-sm">
                        Permitir gestionar multi-org
                      </label>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetAddForm} disabled={isAdding}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddOrganization} disabled={selectedOrgIds.length === 0 || isAdding}>
                      {isAdding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Añadiendo...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Añadir
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                availableOrgs.length > 0 && (
                  <Button variant="outline" onClick={() => setShowAddForm(true)} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir organización
                  </Button>
                )
              )}

              {availableOrgs.length === 0 && !showAddForm && (
                <p className="text-muted-foreground text-center text-sm">
                  No hay más organizaciones disponibles para añadir
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
