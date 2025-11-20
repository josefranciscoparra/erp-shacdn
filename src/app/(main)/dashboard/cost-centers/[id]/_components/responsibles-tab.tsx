"use client";

import { AddResponsibleDialog } from "./add-responsible-dialog";
import { ResponsiblesList } from "./responsibles-list";

interface ResponsiblesTabProps {
  costCenterId: string;
}

export function ResponsiblesTab({ costCenterId }: ResponsiblesTabProps) {
  return (
    <div className="space-y-4">
      {/* Botón añadir responsable */}
      <div className="flex items-center justify-end">
        <AddResponsibleDialog costCenterId={costCenterId} />
      </div>

      {/* Lista de responsables */}
      <ResponsiblesList costCenterId={costCenterId} />
    </div>
  );
}
