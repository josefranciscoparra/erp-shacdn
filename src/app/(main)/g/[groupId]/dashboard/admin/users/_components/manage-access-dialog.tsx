"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Role } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserOrgAccessBulk, DirectoryUserRow } from "@/server/actions/group-users";
import { getCreatableRoles, getEditableRoles } from "@/services/permissions/role-hierarchy";

interface ManageAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DirectoryUserRow | null;
  groupId: string;
  organizations: { id: string; name: string }[];
  currentUserRole: Role;
}

export function ManageAccessDialog({
  open,
  onOpenChange,
  user,
  groupId,
  organizations,
  currentUserRole,
}: ManageAccessDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [selections, setSelections] = useState<Record<string, { selected: boolean; role: Role }>>({});

  // Ref para tracking de inicialización - usamos ID del usuario como key
  const lastInitializedUserIdRef = useRef<string | null>(null);

  // Calcular selecciones iniciales con useMemo (sin causar re-render)
  const initialSelections = useMemo(() => {
    if (!user) return {};

    const result: Record<string, { selected: boolean; role: Role }> = {};
    organizations.forEach((org) => {
      const existingOrg = user.organizations.find((uo) => uo.orgId === org.id);
      if (existingOrg) {
        result[org.id] = { selected: true, role: existingOrg.role };
      } else {
        result[org.id] = { selected: false, role: "EMPLOYEE" };
      }
    });
    return result;
  }, [user, organizations]);

  // Inicializar estado SOLO cuando cambia el usuario (no en cada render)
  // Deliberadamente usamos user?.userId (primitivo) en lugar de user (objeto)
  // para evitar re-ejecuciones cuando el padre pasa nuevas referencias
  useEffect(() => {
    if (!open || !user) {
      return;
    }

    // Solo inicializar si es un usuario diferente
    if (lastInitializedUserIdRef.current !== user.userId) {
      lastInitializedUserIdRef.current = user.userId;
      setSelections(initialSelections);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.userId, initialSelections]);

  // Limpiar ref cuando se cierra (para re-inicializar si se abre de nuevo con el mismo usuario)
  useEffect(() => {
    if (!open) {
      lastInitializedUserIdRef.current = null;
    }
  }, [open]);

  const handleToggle = (orgId: string, checked: boolean) => {
    setSelections((prev) => ({
      ...prev,
      [orgId]: { ...(prev[orgId] ?? { selected: false, role: "EMPLOYEE" }), selected: checked },
    }));
  };

  const handleRoleChange = (orgId: string, role: Role) => {
    setSelections((prev) => ({
      ...prev,
      [orgId]: { ...(prev[orgId] ?? { selected: true, role }), role },
    }));
  };

  const handleSave = () => {
    if (!user) return;

    startTransition(async () => {
      // Construir payload
      const changes = organizations
        .map((org) => {
          const selection = selections[org.id] ?? { selected: false, role: "EMPLOYEE" };
          const original = user.organizations.find((uo) => uo.orgId === org.id);

          // Caso 1: Estaba y sigue estando -> ver si cambió el rol
          if (original && selection.selected) {
            if (original.role !== selection.role) {
              return { orgId: org.id, role: selection.role };
            }
            return null; // Sin cambios
          }

          // Caso 2: No estaba y ahora está -> crear
          if (!original && selection.selected) {
            return { orgId: org.id, role: selection.role, isActive: true };
          }

          // Caso 3: Estaba y ahora no está -> eliminar
          if (original && !selection.selected) {
            return { orgId: org.id, remove: true };
          }

          return null;
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      if (changes.length === 0) {
        onOpenChange(false);
        return;
      }

      const result = await updateUserOrgAccessBulk({
        userId: user.userId,
        groupId,
        changes,
      });

      if (result.success) {
        toast.success("Accesos actualizados");
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Error al actualizar accesos");
      }
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar Accesos: {user.name}</DialogTitle>
          <DialogDescription>
            Selecciona las organizaciones a las que este usuario tendrá acceso dentro del grupo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
          <div className="text-muted-foreground mb-2 grid grid-cols-[1fr_200px] gap-4 px-2 text-sm font-semibold">
            <div>Organización</div>
            <div>Rol asignado</div>
          </div>

          {organizations.map((org) => {
            const selection = selections[org.id] ?? { selected: false, role: "EMPLOYEE" };
            const original = user.organizations.find((uo) => uo.orgId === org.id);
            const editableRoles = original
              ? getEditableRoles(currentUserRole, original.role)
              : getCreatableRoles(currentUserRole);
            const availableRoles = editableRoles.length > 0 ? editableRoles : original ? [original.role] : [];
            const isRoleLocked = original && editableRoles.length === 0;
            const canToggle = !original || editableRoles.length > 0;

            return (
              <div
                key={org.id}
                className="hover:bg-muted/50 grid grid-cols-[1fr_200px] items-center gap-4 rounded-lg border p-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`org-${org.id}`}
                    checked={selection.selected}
                    onCheckedChange={(c) => handleToggle(org.id, c as boolean)}
                    disabled={!canToggle}
                  />
                  <label htmlFor={`org-${org.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                    {org.name}
                  </label>
                </div>

                {selection.selected && (
                  <Select
                    value={selection.role}
                    onValueChange={(r) => handleRoleChange(org.id, r as Role)}
                    disabled={isRoleLocked ?? availableRoles.length === 0}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role === "EMPLOYEE" && "Empleado"}
                          {role === "MANAGER" && "Manager"}
                          {role === "HR_ASSISTANT" && "Asistente RRHH"}
                          {role === "HR_ADMIN" && "Admin RRHH"}
                          {role === "ORG_ADMIN" && "Admin Organización"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
