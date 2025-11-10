"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/nextjs";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Reportar error a Sentry
    Sentry.captureException(error, {
      tags: {
        error_boundary: "app_error",
      },
      contexts: {
        error_details: {
          digest: error.digest,
          name: error.name,
          message: error.message,
        },
      },
    });
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">Algo salió mal</h1>
        <p className="text-muted-foreground max-w-md text-sm sm:text-base">
          Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado automáticamente.
        </p>
        {process.env.NODE_ENV === "development" && (
          <div className="border-destructive/20 bg-destructive/5 mt-4 rounded-lg border p-4 text-left">
            <p className="text-destructive mb-2 text-sm font-medium">Error (solo visible en desarrollo):</p>
            <code className="text-muted-foreground text-xs">{error.message}</code>
            {error.digest && <p className="text-muted-foreground mt-2 text-xs">Error ID: {error.digest}</p>}
          </div>
        )}
      </div>
      <button
        onClick={reset}
        className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
