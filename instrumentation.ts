/**
 * Instrumentation file for Next.js 15
 * Este archivo se ejecuta cuando Next.js arranca, antes de cualquier código de la aplicación
 * Se usa para inicializar Sentry y otros servicios de monitorización
 */

export async function register() {
  // Solo ejecutar en Node.js (no en Edge Runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Importar configuración de Sentry para servidor
    await import("./sentry.server.config");
  }

  // Si estás usando Edge Runtime (middleware, edge functions)
  if (process.env.NEXT_RUNTIME === "edge") {
    // Importar configuración de Sentry para Edge
    await import("./sentry.edge.config");
  }
}
