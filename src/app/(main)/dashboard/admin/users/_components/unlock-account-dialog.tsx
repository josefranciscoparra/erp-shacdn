"use client";

import * as React from "react";

import { AlertTriangle, Loader2, Unlock } from "lucide-react";

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

interface UnlockAccountDialogProps {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UnlockAccountDialog({ user, open, onOpenChange, onSuccess }: UnlockAccountDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleUnlock = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlock-account",
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Error al desbloquear la cuenta");
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

  const lockedUntilRaw = user.passwordLockedUntil;
  const lockedUntil = lockedUntilRaw ? new Date(lockedUntilRaw) : null;
  const isLocked = lockedUntil ? lockedUntil > new Date() : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desbloquear cuenta</DialogTitle>
          <DialogDescription>Restablece los intentos fallidos y elimina el bloqueo temporal.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Usuario</p>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground text-xs">{user.email}</p>
            </div>
          </div>

          <Alert variant={isLocked ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {isLocked
                ? "La cuenta está bloqueada por intentos fallidos."
                : "La cuenta no está bloqueada, pero puedes resetear los intentos fallidos."}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleUnlock} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Unlock className="mr-2 h-4 w-4" />
            Desbloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
