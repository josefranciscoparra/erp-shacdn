"use client";

import * as React from "react";

import { Loader2, AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { type UserRow } from "./users-columns";

interface ToggleActiveDialogProps {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ToggleActiveDialog({ user, open, onOpenChange, onSuccess }: ToggleActiveDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleToggle = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-active",
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Error al cambiar el estado del usuario");
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Error de conexión al servidor");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const action = user.active ? "desactivar" : "activar";
  const actionTitle = user.active ? "Desactivar Usuario" : "Activar Usuario";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionTitle}</DialogTitle>
          <DialogDescription>
            {user.active
              ? "El usuario no podrá acceder al sistema hasta que lo reactives"
              : "El usuario podrá volver a acceder al sistema"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Usuario */}
          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Usuario</p>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground text-xs">{user.email}</p>
            </div>
          </div>

          {/* Advertencia */}
          {user.active && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Atención:</strong> Al desactivar este usuario:
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Se cerrarán todas sus sesiones activas</li>
                  <li>No podrá iniciar sesión en el sistema</li>
                  <li>Sus datos se conservarán pero no tendrá acceso</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={user.active ? "destructive" : "default"}
            onClick={handleToggle}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
