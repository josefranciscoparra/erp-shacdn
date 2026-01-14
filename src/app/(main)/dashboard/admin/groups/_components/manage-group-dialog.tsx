"use client";

import * as React from "react";

import { type Role } from "@prisma/client";
import {
  Building2,
  Check,
  ChevronsUpDown,
  FolderCog,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ManageAccessDialog } from "@/app/(main)/g/[groupId]/dashboard/admin/users/_components/manage-access-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getGroupDirectoryUsers, type DirectoryUserRow } from "@/server/actions/group-users";
import {
  addOrganizationGroupMember,
  addOrganizationToGroup,
  approveOrganizationGroupOrganization,
  type AvailableGroupUserItem,
  type AvailableOrganizationItem,
  listAvailableGroupUsers,
  listAvailableOrganizationsForGroup,
  listOrganizationGroupMembers,
  listOrganizationGroupOrganizations,
  removeOrganizationFromGroup,
  removeOrganizationGroupMember,
  updateOrganizationGroup,
  updateOrganizationGroupMember,
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
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  REJECTED: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
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
  const [userSearch, setUserSearch] = React.useState("");
  const [userSelectOpen, setUserSelectOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [accessSelections, setAccessSelections] = React.useState<Record<string, boolean>>({});
  const [directoryUsers, setDirectoryUsers] = React.useState<DirectoryUserRow[]>([]);
  const [accessDialogOpen, setAccessDialogOpen] = React.useState(false);
  const [selectedAccessUserId, setSelectedAccessUserId] = React.useState<string | null>(null);

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
      const [orgsResult, membersResult, availableOrgsResult, availableUsersResult, directoryResult] = await Promise.all(
        [
          listOrganizationGroupOrganizations(group.id),
          listOrganizationGroupMembers(group.id),
          listAvailableOrganizationsForGroup(group.id),
          listAvailableGroupUsers(group.id),
          getGroupDirectoryUsers(group.id),
        ],
      );

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
      if (directoryResult.success && directoryResult.users) {
        setDirectoryUsers(directoryResult.users);
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
    const selectedUserData = availableUsers.find((user) => user.id === selectedUserId);
    if (!selectedUserData) return;

    if (selectedUserData.role === "EMPLOYEE") {
      toast.error("Este usuario ya es empleado de una organización y no puede añadirse al grupo.");
      return;
    }

    const selectedOrgIds = activeOrganizations
      .filter((org) => accessSelections[org.organizationId])
      .map((org) => org.organizationId);

    if (selectedOrgIds.length === 0) {
      toast.error("Selecciona al menos una empresa para este usuario.");
      return;
    }

    setPendingAction(`add-member-${selectedUserId}`);
    try {
      const result = await addOrganizationGroupMember(group.id, selectedUserId, selectedUserRole, selectedOrgIds);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo añadir el miembro");
        return;
      }
      toast.success("Miembro añadido");
      setSelectedUserId("");
      setAccessSelections({});
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
      return ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER"] as Role[];
    }
    return ["ORG_ADMIN", "HR_ADMIN", "HR_ASSISTANT", "MANAGER"] as Role[];
  }, [currentUserRole]);

  const selectedUser = React.useMemo(
    () => availableUsers.find((user) => user.id === selectedUserId) ?? null,
    [availableUsers, selectedUserId],
  );

  const filteredUsers = React.useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (query.length < 2) return [];
    return availableUsers.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query));
  }, [availableUsers, userSearch]);

  const activeOrganizations = React.useMemo(
    () => organizations.filter((org) => org.status === "ACTIVE"),
    [organizations],
  );

  React.useEffect(() => {
    if (!selectedUser || activeOrganizations.length === 0) {
      setAccessSelections({});
      return;
    }

    const nextSelections: Record<string, boolean> = {};

    activeOrganizations.forEach((org) => {
      nextSelections[org.organizationId] = true;
    });

    setAccessSelections(nextSelections);
    if (assignableRoles.includes(selectedUser.role)) {
      setSelectedUserRole(selectedUser.role);
    }
  }, [activeOrganizations, assignableRoles, selectedUser]);

  const selectedAccessUser = React.useMemo(() => {
    if (!selectedAccessUserId) return null;
    return directoryUsers.find((user) => user.userId === selectedAccessUserId) ?? null;
  }, [directoryUsers, selectedAccessUserId]);

  const accessOrganizations = React.useMemo(
    () =>
      activeOrganizations.map((org) => ({
        id: org.organizationId,
        name: org.organizationName,
      })),
    [activeOrganizations],
  );

  const handleAccessDialogOpenChange = (value: boolean) => {
    setAccessDialogOpen(value);
    if (!value) {
      setSelectedAccessUserId(null);
      void loadDetails();
    }
  };

  const handleAccessToggle = (orgId: string, checked: boolean, isLocked: boolean) => {
    if (isLocked) {
      return;
    }
    setAccessSelections((prev) => ({
      ...prev,
      [orgId]: checked,
    }));
  };

  if (!group) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[96vw] max-w-7xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <FolderCog className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-lg">Gestionar Grupo</DialogTitle>
              <DialogDescription className="mt-0.5">
                Administra la estructura, permisos y miembros de este grupo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 w-full flex-1 flex-col">
          <div className="border-b px-6">
            <TabsList className="h-auto w-full justify-start gap-6 bg-transparent p-0">
              <TabsTrigger
                value="details"
                className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pt-3 pb-3 font-medium text-slate-500 shadow-none transition-none hover:text-slate-700 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:text-slate-400 dark:data-[state=active]:text-indigo-400"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Detalles
              </TabsTrigger>
              <TabsTrigger
                value="organizations"
                className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pt-3 pb-3 font-medium text-slate-500 shadow-none transition-none hover:text-slate-700 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:text-slate-400 dark:data-[state=active]:text-indigo-400"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Organizaciones
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pt-3 pb-3 font-medium text-slate-500 shadow-none transition-none hover:text-slate-700 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:text-slate-400 dark:data-[state=active]:text-indigo-400"
              >
                <Users className="mr-2 h-4 w-4" />
                Miembros
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Details Content */}
          <TabsContent value="details" className="m-0 min-h-0 flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Nombre</Label>
                  <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-status">Estado</Label>
                  <div className="flex h-10 items-center justify-between rounded-lg border px-3 shadow-sm">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} id="group-status" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">Descripción</Label>
                <Textarea
                  id="group-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleSaveDetails} disabled={isSaving} className="min-w-[140px]">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Organizations Content */}
          <TabsContent value="organizations" className="m-0 min-h-0 flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Add Organization Card */}
              <div className="rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Añadir Organización
                </h4>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger className="w-full bg-white sm:max-w-md dark:bg-slate-950">
                      <SelectValue placeholder="Selecciona una organización..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddOrganization} disabled={!selectedOrgId || isLoading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border bg-white shadow-sm dark:bg-slate-950">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead className="min-w-[200px]">Organización</TableHead>
                      <TableHead className="w-[140px]">Estado</TableHead>
                      <TableHead className="w-[160px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-slate-500">
                          <Building2 className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                          <p>No hay organizaciones asignadas.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      organizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                            {org.organizationName}
                          </TableCell>
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
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
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
            </div>
          </TabsContent>

          {/* Members Content */}
          <TabsContent value="members" className="m-0 min-h-0 flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Add Member Section - Vertical Layout */}
              <div className="rounded-xl border bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm dark:from-slate-900/80 dark:to-slate-950">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                    <UserCog className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Añadir Miembro</h4>
                    <p className="text-xs text-slate-500">Selecciona un usuario y configura sus permisos</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Row 1: User + Role Selection */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Usuario</Label>
                      <Popover open={userSelectOpen} onOpenChange={setUserSelectOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="h-10 w-full justify-between border-slate-200 bg-white text-left font-normal shadow-sm transition-colors hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-700"
                          >
                            {selectedUser ? (
                              <span className="truncate font-medium">{selectedUser.name}</span>
                            ) : (
                              <span className="text-slate-400">Buscar usuario...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Buscar por nombre o email..."
                              value={userSearch}
                              onValueChange={setUserSearch}
                            />
                            <CommandList>
                              {userSearch.trim().length < 2 ? (
                                <CommandEmpty className="py-4 text-center text-sm text-slate-500">
                                  Escribe al menos 2 letras para buscar.
                                </CommandEmpty>
                              ) : filteredUsers.length === 0 ? (
                                <CommandEmpty className="py-4 text-center text-sm text-slate-500">
                                  No se encontraron usuarios.
                                </CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {filteredUsers.map((user) => (
                                    <CommandItem
                                      key={user.id}
                                      value={`${user.name} ${user.email}`}
                                      onSelect={() => {
                                        setSelectedUserId(user.id);
                                        setUserSelectOpen(false);
                                        setUserSearch("");
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={
                                          selectedUserId === user.id
                                            ? "mr-2 h-4 w-4 text-indigo-600 opacity-100"
                                            : "mr-2 h-4 w-4 opacity-0"
                                        }
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{user.name}</span>
                                        <span className="text-xs text-slate-500">{user.email}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Rol en el grupo</Label>
                      <Select value={selectedUserRole} onValueChange={(value: Role) => setSelectedUserRole(value)}>
                        <SelectTrigger className="h-10 border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
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

                  {/* Role Permission Hint */}
                  {(selectedUserRole === "ORG_ADMIN" || selectedUserRole === "HR_ADMIN") && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        Puede añadir personas y gestionar el grupo
                      </span>
                    </div>
                  )}

                  {/* Organization Access - Chips */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Acceso a empresas
                      </Label>
                      {selectedUser && activeOrganizations.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {
                            activeOrganizations.filter(
                              (org) =>
                                selectedUser.orgId === org.organizationId || accessSelections[org.organizationId],
                            ).length
                          }{" "}
                          de {activeOrganizations.length} seleccionadas
                        </span>
                      )}
                    </div>

                    <div className="min-h-[52px] rounded-lg border border-dashed border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                      {!selectedUser ? (
                        <p className="text-center text-xs text-slate-400">
                          Selecciona un usuario para configurar sus accesos
                        </p>
                      ) : activeOrganizations.length === 0 ? (
                        <p className="text-center text-xs text-slate-400">
                          No hay organizaciones activas en este grupo
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {activeOrganizations.map((org) => {
                            const isBaseOrg = selectedUser.orgId === org.organizationId;
                            const isSelected = isBaseOrg ? true : accessSelections[org.organizationId];
                            return (
                              <button
                                key={org.organizationId}
                                type="button"
                                onClick={() => handleAccessToggle(org.organizationId, !isSelected, isBaseOrg)}
                                disabled={isBaseOrg}
                                className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                  isBaseOrg
                                    ? "cursor-not-allowed border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                                    : isSelected
                                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:border-emerald-700"
                                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600"
                                } `}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                                <Building2 className={`h-3 w-3 ${isSelected ? "" : "opacity-50"}`} />
                                <span className="max-w-[140px] truncate">{org.organizationName}</span>
                                {isBaseOrg && (
                                  <span className="ml-0.5 rounded bg-indigo-200/60 px-1 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-600 uppercase dark:bg-indigo-800/60 dark:text-indigo-300">
                                    Principal
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Button */}
                  <Button
                    onClick={handleAddMember}
                    disabled={!selectedUserId || isLoading}
                    className="w-full bg-indigo-600 font-medium shadow-sm hover:bg-indigo-700 sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir al Grupo
                  </Button>
                </div>
              </div>

              {/* Members Table */}
              <div className="rounded-md border bg-white shadow-sm dark:bg-slate-950">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead className="min-w-[200px]">Usuario</TableHead>
                      <TableHead className="w-[180px]">Permisos</TableHead>
                      <TableHead className="w-[120px] text-center">Acceso</TableHead>
                      <TableHead className="w-[120px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                          <Users className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                          <p>No hay miembros asignados.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => (
                        <TableRow key={member.id} className={!member.isActive ? "bg-slate-50/50 opacity-60" : ""}>
                          <TableCell>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{member.name}</div>
                            <div className="text-xs text-slate-500">{member.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Select
                                value={member.role}
                                onValueChange={(value: Role) => handleUpdateMemberRole(member.id, value)}
                                disabled={pendingAction === `role-${member.id}`}
                              >
                                <SelectTrigger className="h-8 w-[160px]">
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
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={member.isActive}
                              onCheckedChange={(value) => handleToggleMember(member.id, value)}
                              disabled={pendingAction === `toggle-${member.id}`}
                              className="scale-90"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                                onClick={() => {
                                  setSelectedAccessUserId(member.userId);
                                  setAccessDialogOpen(true);
                                }}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={pendingAction === `remove-member-${member.id}`}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
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

              <ManageAccessDialog
                open={accessDialogOpen}
                onOpenChange={handleAccessDialogOpenChange}
                user={selectedAccessUser}
                groupId={group.id}
                organizations={accessOrganizations}
                currentUserRole={currentUserRole ?? "SUPER_ADMIN"}
                readOnly={false}
                allowEmployeeRole={false}
                allowRoleChange={false}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
