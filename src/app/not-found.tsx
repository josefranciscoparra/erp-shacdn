/* eslint-disable @next/next/no-html-link-for-pages */
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <title>Página no encontrada</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: "#0a0a0a",
            }}
          >
            Página no encontrada
          </h1>
          <p
            style={{
              color: "#737373",
              marginBottom: "1rem",
            }}
          >
            La página que buscas no existe.
          </p>
          <a
            href="/dashboard/me"
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              border: "1px solid #e5e5e5",
              borderRadius: "0.375rem",
              textDecoration: "none",
              color: "#0a0a0a",
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            Volver al inicio
          </a>
        </div>
      </body>
    </html>
  );
}
