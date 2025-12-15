"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { switchActiveOrganization } from "@/server/actions/org-switcher";

interface SwitchToEmployeeOrgButtonProps {
  employeeOrgId: string;
  employeeOrgName: string;
}

export function SwitchToEmployeeOrgButton({ employeeOrgId, employeeOrgName }: SwitchToEmployeeOrgButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSwitch = () => {
    startTransition(async () => {
      try {
        await switchActiveOrganization(employeeOrgId);
        router.refresh();
      } catch {
        router.refresh();
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
