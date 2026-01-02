"use client";

import { useTransition } from "react";

import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { switchActiveOrganization } from "@/server/actions/org-switcher";

interface SwitchToEmployeeOrgButtonProps {
  employeeOrgId: string;
  employeeOrgName: string;
}

export function SwitchToEmployeeOrgButton({ employeeOrgId, employeeOrgName }: SwitchToEmployeeOrgButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSwitch = () => {
    startTransition(async () => {
      try {
        await switchActiveOrganization(employeeOrgId);
      } catch {
        // Ignorar el error y recargar para asegurar el contexto correcto.
      } finally {
        window.location.reload();
      }
    });
  };

  return (
    <Button onClick={handleSwitch} disabled={isPending} size="lg" className="mt-2">
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cambiando...
        </>
      ) : (
        <>
          Cambiar a {employeeOrgName}
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
