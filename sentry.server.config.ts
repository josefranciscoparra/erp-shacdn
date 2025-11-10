import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Configuración de organización y proyecto
  org: "timenow",
  project: "javascript-nextjs",

  // Performance Monitoring en servidor
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.3 : 1.0,

  // Profiling en servidor - Detecta bucles infinitos y queries lentas
  profilesSampleRate: 1.0,

  // Configuración de integración para Node.js
  integrations: [
    Sentry.prismaIntegration({
      // Captura queries de Prisma para detectar N+1 queries
    }),
  ],

  // Filtrar datos sensibles antes de enviar
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

    // Filtrar datos sensibles de los datos del evento
    if (event.extra) {
      // Eliminar passwords de los datos extra
      Object.keys(event.extra).forEach((key) => {
        if (key.toLowerCase().includes("password") || key.toLowerCase().includes("token")) {
          delete event.extra![key];
        }
      });
    }

    return event;
  },

  // Configuración de entorno
  environment: process.env.NODE_ENV,

  // Tags globales para mejor organización
  initialScope: {
    tags: {
      module: "server",
      runtime: "nodejs",
    },
  },

  // Ignorar errores conocidos
  ignoreErrors: [
    // Errores de conexión de red
    "ECONNREFUSED",
    "ETIMEDOUT",
    // Errores de Prisma transitorios
    "PrismaClientKnownRequestError",
  ],
});
