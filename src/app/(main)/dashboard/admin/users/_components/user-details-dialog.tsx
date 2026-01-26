"use client";

import * as React from "react";

import { type Role } from "@prisma/client";
import { format, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Mail, Shield, User, Clock, CheckCircle2, XCircle, Key } from "lucide-react";

import { PasswordField } from "@/components/employees/password-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { type UserRow } from "./users-columns";

interface UserDetailsDialogProps {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole: Role | null;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin Org",
  HR_ADMIN: "Admin RRHH",
  HR_ASSISTANT: "Asistente RRHH",
  MANAGER: "Manager",
  EMPLOYEE: "Empleado",
};

export function UserDetailsDialog({ user, open, onOpenChange, currentUserRole }: UserDetailsDialogProps) {
  if (!user) return null;

  // Validar permisos para ver contraseñas
  const canViewPasswords = currentUserRole && ["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(currentUserRole);
  const lockedUntilRaw = user.passwordLockedUntil;
  const lockedUntil = lockedUntilRaw ? new Date(lockedUntilRaw) : null;
  const isLocked = lockedUntil ? lockedUntil > new Date() : false;
  const failedAttempts = user.failedPasswordAttempts ?? 0;

  // Encontrar contraseña temporal activa
  const activePassword =
    user.temporaryPasswords?.find(
      (tp) => tp.active && isAfter(new Date(tp.expiresAt), new Date()) && !tp.usedAt && tp.password,
    ) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Usuario</DialogTitle>
          <DialogDescription>Información completa del usuario en el sistema</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Información Básica</h3>
            <div className="@container grid gap-4">
              <div className="flex items-start gap-3">
                <User className="text-muted-foreground mt-0.5 h-4 w-4" />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Nombre completo</p>
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="text-muted-foreground mt-0.5 h-4 w-4" />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="text-muted-foreground mt-0.5 h-4 w-4" />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Rol</p>
                  <Badge variant="outline">{ROLE_DISPLAY_NAMES[user.role] ?? user.role}</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Estado */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Estado de la Cuenta</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                {user.active ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
                )}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Estado</p>
                  <Badge variant={user.active ? "outline" : "destructive"}>{user.active ? "Activo" : "Inactivo"}</Badge>
                </div>
              </div>

              {user.mustChangePassword && (
                <div className="flex items-start gap-3">
                  <Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Contraseña</p>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-300">
                      Debe cambiar contraseña
                    </Badge>
                  </div>
                </div>
              )}

              {user._count && user._count.temporaryPasswords > 0 && (
                <div className="flex items-start gap-3">
                  <Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Contraseñas temporales activas</p>
                    <p className="text-sm font-medium">{user._count.temporaryPasswords}</p>
                  </div>
                </div>
              )}

              {(isLocked || failedAttempts > 0) && (
                <div className="flex items-start gap-3">
                  <Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Seguridad</p>
                    {isLocked ? (
                      <Badge variant="destructive">
                        Bloqueado hasta{" "}
                        {lockedUntil ? format(lockedUntil, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }) : "--"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        Intentos fallidos: {failedAttempts}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contraseña Temporal Activa */}
          {activePassword && canViewPasswords && (
            <>
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Key className="h-4 w-4" />
                  Contraseña Temporal Activa
                </h3>

                <div className="bg-muted/50 space-y-4 rounded-lg border p-4">
                  <PasswordField password={activePassword.password} canView={canViewPasswords} />

                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">Expira:</span>
                      <span className="font-medium">
                        {format(new Date(activePassword.expiresAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                      </span>
                    </div>

                    {activePassword.reason && (
                      <div>
                        <span className="text-muted-foreground">Razón:</span>{" "}
                        <span className="font-medium">{activePassword.reason}</span>
                      </div>
                    )}

                    {activePassword.createdBy?.name && (
                      <div>
                        <span className="text-muted-foreground">Creada por:</span>{" "}
                        <span className="font-medium">
                          {activePassword.createdBy.name} el{" "}
                          {format(new Date(activePassword.createdAt), "d 'de' MMMM", { locale: es })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>Recordatorio:</strong> Comparte esta contraseña de forma segura con el usuario. Deberá
                    cambiarla en su próximo inicio de sesión.
                  </AlertDescription>
                </Alert>
              </div>

              <Separator />
            </>
          )}

          {/* Fechas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Información Temporal</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="text-muted-foreground mt-0.5 h-4 w-4" />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Fecha de creación</p>
                  <p className="text-sm font-medium">
                    {format(new Date(user.createdAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
