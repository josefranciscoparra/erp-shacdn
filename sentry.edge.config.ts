import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Configuración de organización y proyecto
  org: "timenow",
  project: "javascript-nextjs",

  // Performance Monitoring en Edge Runtime (middleware)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.3 : 1.0,

  // Edge runtime no soporta todas las features
  // Solo captura errores y performance básico

  // Configuración de entorno
  environment: process.env.NODE_ENV,

  // Tags globales para mejor organización
  initialScope: {
    tags: {
      module: "edge",
      runtime: "edge",
    },
  },

  // Filtrar datos sensibles
  beforeSend(event, hint) {
    // Eliminar información sensible de URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/auth-token=[^&]+/g, "auth-token=REDACTED");
    }

    // Eliminar cookies sensibles
    if (event.request?.cookies) {
      delete event.request.cookies["auth-token"];
      delete event.request.cookies["session"];
    }

    return event;
  },
});
