"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>Error del servidor</h1>
          <p style={{ color: "#737373", marginBottom: "1rem" }}>
            Ha ocurrido un error grave. Por favor, recarga la página.
          </p>
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
