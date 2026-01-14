"use client";

import { useMemo } from "react";

import { LogOut, Shield } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SupportImpersonationBanner() {
  const { data: session } = useSession();
  const isImpersonating = session?.user?.isImpersonating ?? false;

  const expiresAtLabel = useMemo(() => {
    const expiresAt = session?.user?.impersonationExpiresAt;
    if (!expiresAt) {
      return null;
    }

    return new Date(expiresAt).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [session?.user?.impersonationExpiresAt]);

  if (!isImpersonating) {
    return null;
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
      <Shield className="text-amber-600 dark:text-amber-300" />
      <AlertTitle>Modo soporte activo</AlertTitle>
      <AlertDescription className="w-full gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-200"
          >
            Acceso como {session?.user?.email}
          </Badge>
          {session?.user?.impersonatedByName && (
            <span className="text-xs text-amber-800/80 dark:text-amber-200/80">
              Generado por {session.user.impersonatedByName}
            </span>
          )}
          {expiresAtLabel && (
            <span className="text-xs text-amber-800/80 dark:text-amber-200/80">Expira a las {expiresAtLabel}</span>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
            Esta sesion es temporal y de uso exclusivo para soporte.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Salir del modo soporte
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
