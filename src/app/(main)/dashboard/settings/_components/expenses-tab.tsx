"use client";

import { Receipt } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

import { ExpenseModeSettings } from "./expense-mode-settings";

export function ExpensesTab() {
  const expenseMode = useOrganizationFeaturesStore((state) => state.features.expenseMode);

  return (
    <div className="flex flex-col gap-6">
      <ExpenseModeSettings initialMode={expenseMode} />
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Aprobadores de Gastos</h3>
              <p className="text-muted-foreground text-sm">
                Gestiona quién puede aprobar los gastos de la organización
              </p>
            </div>
          </div>

          <Alert>
            <AlertTitle>Configuracion unificada</AlertTitle>
            <AlertDescription>
              Los aprobadores de gastos ahora se configuran desde la pestaña &quot;Aprobaciones&quot;.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  );
}
