import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Configuración de organización y proyecto
  org: "timenow",
  project: "javascript-nextjs",

  // Performance Monitoring - Captura el 100% de transacciones en desarrollo
  // En producción, reducir a 0.1-0.3 (10%-30%)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.3 : 1.0,

  // Session Replay - Captura sesiones para ver qué hizo el usuario
  replaysSessionSampleRate: 0.1, // 10% de sesiones normales
  replaysOnErrorSampleRate: 1.0, // 100% de sesiones cuando hay error

  // Profiling - Para detectar problemas de rendimiento y bucles infinitos
  profilesSampleRate: 1.0,

  // Configuración de integración
  integrations: [
    Sentry.replayIntegration({
      // Configuración de Session Replay
      maskAllText: true, // Oculta texto sensible
      blockAllMedia: true, // Oculta imágenes/videos
    }),
    Sentry.browserTracingIntegration({
      // Configuración de tracing del navegador
      enableInp: true, // Interaction to Next Paint
    }),
  ],

  // Solo trackear peticiones a tu dominio (opcional pero recomendado)
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/timenow\.cloud/,
    /^https:\/\/.*\.timenow\.cloud/,
  ],

  // Filtrar datos sensibles antes de enviar
  beforeSend(event, hint) {
    // Eliminar información sensible de URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/auth-token=[^&]+/g, "auth-token=REDACTED");
    }

    // Eliminar headers sensibles
    if (event.request?.headers) {
      delete event.request.headers.Authorization;
      delete event.request.headers.Cookie;
    }

    return event;
  },

  // Configuración de entorno
  environment: process.env.NODE_ENV,

  // Ignorar errores conocidos del navegador
  ignoreErrors: [
    // Errores de extensiones del navegador
    "top.GLOBALS",
    "Non-Error promise rejection captured",
    // Errores de red transitorios
    "NetworkError",
    "Failed to fetch",
  ],

  // Configuración de breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Filtrar breadcrumbs sensibles
    if (breadcrumb.category === "console" && breadcrumb.data) {
      // Eliminar logs de passwords
      const message = String(breadcrumb.data.message ?? "");
      if (message.toLowerCase().includes("password")) {
        return null;
      }
    }
    return breadcrumb;
  },

  // Tags globales para mejor organización
  initialScope: {
    tags: {
      module: "client",
    },
  },
});
