"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Reportar error crítico a Sentry
    Sentry.captureException(error, {
      level: "fatal",
      tags: {
        error_boundary: "global_error",
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
    <html lang="es">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>Error Crítico</h1>
          <p style={{ color: "#737373", marginBottom: "1rem" }}>
            Ha ocurrido un error crítico. Nuestro equipo ha sido notificado automáticamente.
          </p>
          {process.env.NODE_ENV === "development" && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.375rem",
                marginBottom: "1rem",
                maxWidth: "32rem",
              }}
            >
              <p style={{ fontSize: "0.875rem", fontWeight: "500", color: "#dc2626", marginBottom: "0.5rem" }}>
                Error (solo visible en desarrollo):
              </p>
              <code style={{ fontSize: "0.75rem", color: "#6b7280", wordBreak: "break-word" }}>{error.message}</code>
              {error.digest && (
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>Error ID: {error.digest}</p>
              )}
            </div>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #e5e5e5",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
