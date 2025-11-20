"use client";

import type { Scope } from "@/lib/permissions/scope-helpers";

import { AddResponsibleDialog } from "./add-responsible-dialog";
import { ResponsiblesList } from "./responsibles-list";

interface ResponsiblesTabProps {
  scope: Scope;
  scopeId: string;
  scopeName?: string; // Nombre del ámbito (ej: "Centro Madrid", "Equipo A")
}

export function ResponsiblesTab({ scope, scopeId, scopeName }: ResponsiblesTabProps) {
  return (
    <div className="space-y-4">
      {/* Botón añadir responsable */}
      <div className="flex items-center justify-end">
        <AddResponsibleDialog scope={scope} scopeId={scopeId} scopeName={scopeName} />
      </div>

      {/* Lista de responsables */}
      <ResponsiblesList scope={scope} scopeId={scopeId} />
    </div>
  );
}
