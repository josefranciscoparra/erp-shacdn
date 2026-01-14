"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

export function PasswordGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isImpersonating = session?.user?.isImpersonating ?? false;

  useEffect(() => {
    // Solo verificar si la sesión está cargada y el usuario está autenticado
    if (status === "authenticated" && session?.user?.mustChangePassword && !isImpersonating) {
      // Evitar loop infinito en la página de cambio de contraseña
      if (window.location.pathname !== "/auth/change-password") {
        router.replace("/auth/change-password");
      }
    }
  }, [session, status, router, isImpersonating]);

  // Si el usuario debe cambiar contraseña y no está en la página correcta
  if (
    status === "authenticated" &&
    session?.user?.mustChangePassword &&
    !isImpersonating &&
    window.location.pathname !== "/auth/change-password"
  ) {
    return null; // No renderizar nada mientras redirige
  }

  return <>{children}</>;
}
