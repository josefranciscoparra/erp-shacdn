"use client";

import * as Sentry from "@sentry/nextjs";

/**
 * Configura el contexto de usuario en Sentry (lado cliente)
 * Debe llamarse en un componente cliente después de que el usuario esté autenticado
 */
export function setSentryUserContext(user: { id: string; email: string; name: string; role: string; orgId: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });

  Sentry.setTags({
    role: user.role,
    orgId: user.orgId,
  });

  Sentry.setContext("user_details", {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
  });
}

/**
 * Limpia el contexto de usuario en Sentry
 * Llamar en logout
 */
export function clearSentryUserContext() {
  Sentry.setUser(null);
}

/**
 * Añade tags de módulo para mejor organización
 */
export function setSentryModule(module: string) {
  Sentry.setTag("module", module);
}

/**
 * Captura una acción del usuario para debugging
 */
export function trackUserAction(action: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: "user_action",
    message: action,
    level: "info",
    data,
  });
}
