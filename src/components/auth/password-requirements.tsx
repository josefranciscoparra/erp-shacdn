"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { getPasswordRequirementsStatus } from "@/lib/validations/password";

interface PasswordRequirementsProps {
  password: string;
  showTitle?: boolean;
  className?: string;
}

/**
 * Componente de validación visual de requisitos de contraseña en tiempo real.
 *
 * Muestra cada requisito con un check (verde) o círculo (gris) según se cumpla.
 * Usa la misma fuente de verdad que el schema Zod (PASSWORD_REQUIREMENTS).
 */
export function PasswordRequirements({ password, showTitle = true, className }: PasswordRequirementsProps) {
  const requirements = getPasswordRequirementsStatus(password);
  const hasStartedTyping = password.length > 0;

  return (
    <div
      className={cn("bg-muted/50 rounded-lg p-4", className)}
      aria-live={hasStartedTyping ? "polite" : "off"}
      aria-atomic="true"
    >
      {showTitle && <h3 className="text-foreground mb-2 text-sm font-medium">Requisitos de contraseña</h3>}

      <ul className="space-y-1.5">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-center gap-2">
            {req.fulfilled ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 transition-colors" aria-hidden="true" />
            ) : (
              <Circle className="text-muted-foreground h-4 w-4 shrink-0 transition-colors" aria-hidden="true" />
            )}
            <span
              className={cn("text-xs transition-colors", req.fulfilled ? "text-green-600" : "text-muted-foreground")}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
