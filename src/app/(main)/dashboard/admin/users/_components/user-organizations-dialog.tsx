"use client";

import * as React from "react";

import type { Role } from "@prisma/client";
import { Building2, Check, Loader2, Plus, Shield, Star, StarOff, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/server/actions/user-organizations";

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Org",
  HR_ADMIN: "Admin RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  ORG_ADMIN: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HR_ADMIN: "bg-green-500/10 text-green-700 dark:text-green-300",
  MANAGER: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  EMPLOYEE: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

// Roles disponibles para asignar (no incluye SUPER_ADMIN)
const ASSIGNABLE_ROLES: Role[] = ["ORG_ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"];

interface UserOrganizationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function UserOrganizationsDialog({ open, onOpenChange, user }: UserOrganizationsDialogProps) {
  const [memberships, setMemberships] = React.useState<UserOrganizationItem[]>([]);
  const [availableOrgs, setAvailableOrgs] = React.useState<AvailableOrganization[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);

  // Estado para el formulario de añadir
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>("");
  const [selectedRole, setSelectedRole] = React.useState<Role>("EMPLOYEE");
  const [isDefault, setIsDefault] = React.useState(false);

  // Cargar datos al abrir el dialog
  React.useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [membershipsResult, availableResult] = await Promise.all([
        listUserOrganizations(user.id),
        getAvailableOrganizations(user.id),
      ]);

      if (membershipsResult.success && membershipsResult.memberships) {
        setMemberships(membershipsResult.memberships);
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
    if (!user || !selectedOrgId) return;

    setIsAdding(true);
    try {
      const result = await addUserOrganization({
        userId: user.id,
        orgId: selectedOrgId,
        role: selectedRole,
        isDefault,
      });

      if (result.success) {
        toast.success("Organización añadida correctamente");
        resetAddForm();
        await loadData();
      } else {
        toast.error(result.error ?? "Error al añadir organización");
      }
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
      const result = await setDefaultOrganization(user.id, orgId);

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
      const result = await toggleUserOrganization(membership.id, !membership.isActive);

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
      const result = await removeUserOrganization(membership.id);

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
      const result = await updateUserOrganizationRole(membership.id, newRole);

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

  const resetAddForm = () => {
    setShowAddForm(false);
    setSelectedOrgId("");
    setSelectedRole("EMPLOYEE");
    setIsDefault(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
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
          ) : (
            <>
              {/* Tabla de membresías */}
              {memberships.length > 0 ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organización</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="text-center">Default</TableHead>
                        <TableHead className="text-center">Activa</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberships.map((membership) => (
                        <TableRow key={membership.id} className={!membership.isActive ? "opacity-50" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="text-muted-foreground h-4 w-4" />
                              {membership.orgName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={membership.role}
                              onValueChange={(value: Role) => handleRoleChange(membership, value)}
                              disabled={pendingAction === `role-${membership.id}`}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue>
                                  <Badge variant="outline" className={ROLE_COLORS[membership.role]}>
                                    <Shield className="mr-1 h-3 w-3" />
                                    {ROLE_DISPLAY_NAMES[membership.role]}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {ASSIGNABLE_ROLES.map((role) => (
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
                          </TableCell>
                          <TableCell className="text-center">
                            {membership.isDefault ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Star className="mx-auto h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Organización por defecto</p>
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
                                      disabled={!membership.isActive || pendingAction === `default-${membership.orgId}`}
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
                                    <p>Marcar como default</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
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
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {membership.isDefault
                                      ? "No se puede desactivar la default"
                                      : membership.isActive
                                        ? "Desactivar"
                                        : "Activar"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
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
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {membership.isDefault
                                      ? "No se puede eliminar la default"
                                      : memberships.length <= 1
                                        ? "Debe tener al menos una organización"
                                        : "Eliminar"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                      <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
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
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Rol</label>
                      <Select value={selectedRole} onValueChange={(value: Role) => setSelectedRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_DISPLAY_NAMES[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={isDefault} onCheckedChange={setIsDefault} id="is-default" />
                    <label htmlFor="is-default" className="text-sm">
                      Marcar como organización por defecto
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetAddForm} disabled={isAdding}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddOrganization} disabled={!selectedOrgId || isAdding}>
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
