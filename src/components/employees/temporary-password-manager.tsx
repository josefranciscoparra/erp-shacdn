"use client";

import { useState, useEffect } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Key, RotateCcw, Clock, AlertTriangle, Copy, Check, Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { PasswordField } from "@/components/employees/password-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface TemporaryPassword {
  id: string;
  password: string;
  createdAt: string;
  expiresAt: string;
  reason: string | null;
  usedAt: string | null;
  active: boolean;
  invalidatedAt: string | null;
  invalidatedReason: string | null;
  notes: string | null;
  createdBy: {
    name: string;
  };
}

interface TemporaryPasswordManagerProps {
  userId: string;
  temporaryPasswords: TemporaryPassword[];
  onPasswordReset?: () => void;
  canViewPasswords?: boolean; // Por defecto true (mantener compatibilidad)
}

export function TemporaryPasswordManager({
  userId,
  temporaryPasswords,
  onPasswordReset,
  canViewPasswords = true,
}: TemporaryPasswordManagerProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Limpiar contraseña nueva al salir del componente
  useEffect(() => {
    return () => {
      setNewPassword(null);
      setShowNewPassword(false);
    };
  }, []);

  // Auto-ocultar contraseña nueva después de 2 minutos
  useEffect(() => {
    if (newPassword) {
      const timer = setTimeout(() => {
        setNewPassword(null);
        setShowNewPassword(false);
        toast.info("La contraseña temporal se ha ocultado por seguridad");
      }, 120000); // 2 minutos

      return () => clearTimeout(timer);
    }
  }, [newPassword]);

  const now = Date.now();
  const activePassword = temporaryPasswords.find(
    (tp) => tp.active && !tp.usedAt && new Date(tp.expiresAt).getTime() > now,
  );
  const historyPasswords = temporaryPasswords.filter((tp) => tp.id !== activePassword?.id);

  const getStatusInfo = (tp: TemporaryPassword) => {
    const expiresAt = new Date(tp.expiresAt);
    const expired = expiresAt.getTime() <= now;

    if (tp.usedAt) {
      return {
        label: "Usada",
        badgeClass:
          "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300",
        description: `Usada el ${format(new Date(tp.usedAt), "PPP 'a las' p", { locale: es })}`,
      };
    }

    if (!tp.active && tp.invalidatedAt) {
      return {
        label: "Invalidada",
        badgeClass:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
        description:
          tp.invalidatedReason ??
          `Invalidada el ${format(new Date(tp.invalidatedAt), "PPP 'a las' p", { locale: es })}`,
      };
    }

    if (expired) {
      return {
        label: "Expirada",
        badgeClass:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200",
        description: `Expiró el ${format(expiresAt, "PPP 'a las' p", { locale: es })}`,
      };
    }

    return {
      label: "Inactiva",
      badgeClass:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200",
      description: tp.reason ?? tp.notes ?? "Entrada sin actividad registrada",
    };
  };

  const handleResetPassword = async () => {
    setIsResetting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "reset-password",
          userId,
          reason: reason || "Reset desde perfil de empleado",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al resetear contraseña");
      }

      const result = await response.json();

      // Mostrar la nueva contraseña
      setNewPassword(result.temporaryPassword);
      setShowNewPassword(true);
      setResetDialogOpen(false);
      setReason("");

      toast.success("Contraseña reseteada exitosamente", {
        description: "La nueva contraseña se muestra temporalmente. ¡Cópiala ahora!",
      });

      // Llamar callback para refrescar datos
      onPasswordReset?.();
    } catch (error: any) {
      toast.error("Error al resetear contraseña", {
        description: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const copyPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      toast.success("Contraseña copiada al portapapeles");

      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      toast.error("Error al copiar contraseña");
    }
  };

  const hideNewPassword = () => {
    setNewPassword(null);
    setShowNewPassword(false);
    toast.info("Contraseña ocultada");
  };

  return (
    <Card className="bg-card rounded-lg border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Contraseñas Temporales
        </CardTitle>
        <CardDescription>Gestión de contraseñas temporales para acceso al sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nueva contraseña visible temporalmente */}
        {newPassword && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="space-y-3">
              <div className="font-medium text-green-800 dark:text-green-200">Nueva contraseña temporal generada</div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Contraseña temporal:</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border bg-white p-3 font-mono text-lg tracking-wider dark:bg-gray-900">
                    {showNewPassword ? newPassword : "••••••••••••"}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyPassword(newPassword)}
                    disabled={copiedPassword}
                  >
                    {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ⚠️ Esta contraseña se ocultará automáticamente en 2 minutos
                </p>
                <Button size="sm" variant="outline" onClick={hideNewPassword} className="ml-4">
                  Ocultar ahora
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Contraseña activa actual */}
        {activePassword && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Contraseña Activa</h4>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Activa
              </Badge>
            </div>

            <div className="bg-muted space-y-3 rounded-lg p-4">
              <PasswordField password={activePassword.password} label="Contraseña" canView={canViewPasswords} />

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="text-muted-foreground">Expira:</span>
                <span className="font-medium">
                  {format(new Date(activePassword.expiresAt), "PPP 'a las' p", { locale: es })}
                </span>
              </div>

              <div>
                <Label className="text-sm font-medium">Motivo:</Label>
                <p className="text-muted-foreground text-sm">{activePassword.reason ?? "No especificado"}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Creada por:</Label>
                <p className="text-muted-foreground text-sm">
                  {activePassword.createdBy.name} el {format(new Date(activePassword.createdAt), "PPP", { locale: es })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón para resetear */}
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="font-medium">Resetear Contraseña</p>
            <p className="text-muted-foreground text-sm">
              Genera una nueva contraseña temporal invalidando la anterior
            </p>
          </div>

          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Resetear
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resetear Contraseña Temporal</DialogTitle>
                <DialogDescription>
                  Se generará una nueva contraseña temporal y se invalidarán todas las anteriores.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">Motivo del reset (opcional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Ej: Empleado olvidó la contraseña"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setResetDialogOpen(false)} disabled={isResetting}>
                    Cancelar
                  </Button>
                  <Button onClick={handleResetPassword} disabled={isResetting}>
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Reseteando...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Resetear
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Historial de contraseñas expiradas o invalidadas */}
        {historyPasswords.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-muted-foreground font-medium">Historial</h4>
              <div className="space-y-2">
                {historyPasswords.slice(0, 3).map((tp) => {
                  const status = getStatusInfo(tp);
                  return (
                    <div key={tp.id} className="bg-muted/50 space-y-1 rounded-md px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm">••••••••</div>
                          <Badge variant="outline" size="sm" className={status.badgeClass}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Creada el {format(new Date(tp.createdAt), "dd/MM/yyyy", { locale: es })}
                        </div>
                      </div>
                      {status.description && (
                        <p className="text-muted-foreground text-xs leading-relaxed">{status.description}</p>
                      )}
                    </div>
                  );
                })}
                {historyPasswords.length > 3 && (
                  <p className="text-muted-foreground text-center text-xs">... y {historyPasswords.length - 3} más</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Sin contraseñas */}
        {temporaryPasswords.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No hay contraseñas temporales generadas para este usuario.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
