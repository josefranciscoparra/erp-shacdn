"use client";

import { useEffect } from "react";

import { setSentryUserContext } from "@/lib/sentry/client-context";

interface SentryUserInitializerProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    orgId: string;
  };
}

/**
 * Componente que inicializa el contexto de usuario en Sentry
 * Debe montarse en el layout del dashboard una vez que el usuario esté autenticado
 */
export function SentryUserInitializer({ user }: SentryUserInitializerProps) {
  useEffect(() => {
    if (user) {
      setSentryUserContext(user);
    }
  }, [user]);

  return null; // Este componente no renderiza nada
}
