"use client";

import * as React from "react";

import { type Role } from "@prisma/client";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addOrganizationGroupMember,
  addOrganizationToGroup,
  approveOrganizationGroupOrganization,
  listAvailableGroupUsers,
  listAvailableOrganizationsForGroup,
  listOrganizationGroupMembers,
  listOrganizationGroupOrganizations,
  removeOrganizationFromGroup,
  removeOrganizationGroupMember,
  updateOrganizationGroup,
  updateOrganizationGroupMember,
  type AvailableGroupUserItem,
  type AvailableOrganizationItem,
  type GroupMemberItem,
  type GroupOrganizationItem,
} from "@/server/actions/organization-groups";

import type { OrganizationGroupRow } from "./types";

interface ManageGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: OrganizationGroupRow | null;
  currentUserRole?: Role | null;
  onUpdated: () => void;
}

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Org",
  HR_ADMIN: "Admin RRHH",
  HR_ASSISTANT: "Asistente RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

const STATUS_LABELS: Record<GroupOrganizationItem["status"], string> = {
  ACTIVE: "Activa",
  PENDING: "Pendiente",
  REJECTED: "Rechazada",
};

const STATUS_COLORS: Record<GroupOrganizationItem["status"], string> = {
  ACTIVE: "bg-green-500/10 text-green-700 dark:text-green-300",
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export function ManageGroupDialog({ open, onOpenChange, group, currentUserRole, onUpdated }: ManageGroupDialogProps) {
  const [tab, setTab] = React.useState("details");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const [organizations, setOrganizations] = React.useState<GroupOrganizationItem[]>([]);
  const [members, setMembers] = React.useState<GroupMemberItem[]>([]);
  const [availableOrganizations, setAvailableOrganizations] = React.useState<AvailableOrganizationItem[]>([]);
  const [availableUsers, setAvailableUsers] = React.useState<AvailableGroupUserItem[]>([]);

  const [selectedOrgId, setSelectedOrgId] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedUserRole, setSelectedUserRole] = React.useState<Role>("HR_ADMIN");
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);

  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  React.useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? "");
      setIsActive(group.isActive);
      setTab("details");
    }
  }, [group]);

  const loadDetails = React.useCallback(async () => {
    if (!group) return;
    setIsLoading(true);
    try {
      const [orgsResult, membersResult, availableOrgsResult, availableUsersResult] = await Promise.all([
        listOrganizationGroupOrganizations(group.id),
        listOrganizationGroupMembers(group.id),
        listAvailableOrganizationsForGroup(group.id),
        listAvailableGroupUsers(group.id),
      ]);

      if (orgsResult.success && orgsResult.organizations) {
        setOrganizations(orgsResult.organizations);
      }
      if (membersResult.success && membersResult.members) {
        setMembers(membersResult.members);
      }
      if (availableOrgsResult.success && availableOrgsResult.organizations) {
        setAvailableOrganizations(availableOrgsResult.organizations);
      }
      if (availableUsersResult.success && availableUsersResult.users) {
        setAvailableUsers(availableUsersResult.users);
      }
    } catch (error) {
      console.error("Error loading group details", error);
      toast.error("No se pudieron cargar los datos del grupo");
    } finally {
      setIsLoading(false);
    }
  }, [group]);

  React.useEffect(() => {
    if (open && group) {
      loadDetails();
    }
  }, [open, group, loadDetails]);

  const handleSaveDetails = async () => {
    if (!group) return;
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateOrganizationGroup({
        groupId: group.id,
        name,
        description,
        isActive,
      });

      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar el grupo");
        return;
      }

      toast.success("Grupo actualizado");
      onUpdated();
    } catch (error) {
      console.error("Error updating group", error);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el grupo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOrganization = async () => {
    if (!group || !selectedOrgId) return;
    setPendingAction(`add-org-${selectedOrgId}`);
    try {
      const result = await addOrganizationToGroup(group.id, selectedOrgId);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo añadir la organización");
        return;
      }
      toast.success(result.status === "PENDING" ? "Solicitud enviada" : "Organización añadida");
      setSelectedOrgId("");
      await loadDetails();
      onUpdated();
    } catch (error) {
      console.error("Error adding organization", error);
      toast.error(error instanceof Error ? error.message : "No se pudo añadir la organización");
    } finally {
      setPendingAction(null);
    }
  };

  const handleApproveOrganization = async (membershipId: string) => {
    setPendingAction(`approve-org-${membershipId}`);
    try {
      const result = await approveOrganizationGroupOrganization(membershipId);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo aprobar la organización");
        return;
      }
      toast.success("Organización aprobada");
      await loadDetails();
      onUpdated();
    } catch (error) {
      console.error("Error approving organization", error);
      toast.error(error instanceof Error ? error.message : "No se pudo aprobar la organización");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveOrganization = async (membershipId: string) => {
    setPendingAction(`remove-org-${membershipId}`);
    try {
      const result = await removeOrganizationFromGroup(membershipId);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar la organización");
        return;
      }
      toast.success("Organización eliminada");
      await loadDetails();
      onUpdated();
    } catch (error) {
      console.error("Error removing organization", error);
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la organización");
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddMember = async () => {
    if (!group || !selectedUserId) return;
    setPendingAction(`add-member-${selectedUserId}`);
    try {
      const result = await addOrganizationGroupMember({
        groupId: group.id,
        userId: selectedUserId,
        role: selectedUserRole,
      });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo añadir el miembro");
        return;
      }
      toast.success("Miembro añadido");
      setSelectedUserId("");
      await loadDetails();
      onUpdated();
    } catch (error) {
      console.error("Error adding member", error);
      toast.error(error instanceof Error ? error.message : "No se pudo añadir el miembro");
    } finally {
      setPendingAction(null);
    }
  };

  const handleUpdateMemberRole = async (membershipId: string, role: Role) => {
    setPendingAction(`role-${membershipId}`);
    try {
      const result = await updateOrganizationGroupMember({
        membershipId,
        role,
      });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar el rol");
        return;
      }
      toast.success("Rol actualizado");
      await loadDetails();
    } catch (error) {
      console.error("Error updating member role", error);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el rol");
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleMember = async (membershipId: string, isActiveValue: boolean) => {
    setPendingAction(`toggle-${membershipId}`);
    try {
      const result = await updateOrganizationGroupMember({
        membershipId,
        isActive: isActiveValue,
      });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar el estado");
        return;
      }
      await loadDetails();
    } catch (error) {
      console.error("Error updating member status", error);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    setPendingAction(`remove-member-${membershipId}`);
    try {
      const result = await removeOrganizationGroupMember(membershipId);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar el miembro");
        return;
      }
      toast.success("Miembro eliminado");
      await loadDetails();
      onUpdated();
    } catch (error) {
      console.error("Error removing member", error);
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el miembro");
    } finally {
      setPendingAction(null);
    }
  };

  const assignableRoles = React.useMemo(() => {
    if (currentUserRole === "SUPER_ADMIN") {
      return ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER", "EMPLOYEE"] as Role[];
    }
    return ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER"] as Role[];
  }, [currentUserRole]);

  if (!group) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar grupo</DialogTitle>
          <DialogDescription>Administra la estructura y los permisos del grupo.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 w-full flex-1 flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="organizations">Organizaciones</TabsTrigger>
            <TabsTrigger value="members">Miembros</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">Nombre</Label>
                <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-status">Activo</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} id="group-status" />
                  <span className="text-muted-foreground text-sm">{isActive ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Descripción</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveDetails} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label>Agregar organización</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una organización" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrganizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddOrganization} disabled={!selectedOrgId || isLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir
              </Button>
            </div>
            <Separator />
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Organización</TableHead>
                    <TableHead className="w-[140px]">Estado</TableHead>
                    <TableHead className="w-[160px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-sm">
                        No hay organizaciones asignadas al grupo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.organizationName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[org.status]}>
                            {STATUS_LABELS[org.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isSuperAdmin && org.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveOrganization(org.id)}
                                disabled={pendingAction === `approve-org-${org.id}`}
                              >
                                Aprobar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveOrganization(org.id)}
                              disabled={pendingAction === `remove-org-${org.id}`}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="members" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} · {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rol global del grupo</Label>
                <Select value={selectedUserRole} onValueChange={(value: Role) => setSelectedUserRole(value)}>
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
              <Button onClick={handleAddMember} disabled={!selectedUserId || isLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir
              </Button>
            </div>
            <Separator />
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Usuario</TableHead>
                    <TableHead className="w-[180px]">Rol global</TableHead>
                    <TableHead className="w-[120px] text-center">Activo</TableHead>
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground text-sm">
                        No hay miembros asignados al grupo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id} className={!member.isActive ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-muted-foreground text-xs">{member.email}</div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.role}
                            onValueChange={(value: Role) => handleUpdateMemberRole(member.id, value)}
                            disabled={pendingAction === `role-${member.id}`}
                          >
                            <SelectTrigger className="w-[160px]">
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
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={member.isActive}
                            onCheckedChange={(value) => handleToggleMember(member.id, value)}
                            disabled={pendingAction === `toggle-${member.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={pendingAction === `remove-member-${member.id}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
