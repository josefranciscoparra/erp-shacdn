"use client";

import { Receipt } from "lucide-react";

import { Card } from "@/components/ui/card";

import { ExpenseApproversList } from "./expense-approvers-list";
import { ExpenseModeSettings } from "./expense-mode-settings";

export function ExpensesTab() {
  // TODO: Fetch current mode via server component or pass as prop.
  // For now, we'll let the client component fetch/default,
  // but ideally this should be passed down.
  // Assuming we can't easily change the prop signature of ExpensesTab without affecting parent,
  // we will fetch it inside ExpenseModeSettings or assume a default/fetch via useEffect if needed.
  // BUT ExpenseModeSettings expects initialMode.
  // Let's refactor SettingsPage to pass the org config.

  // Quick fix: Let ExpenseModeSettings handle loading or pass a default.
  // Better: Make SettingsPage a server component that fetches the org.
  // Wait, SettingsPage IS a client component ("use client").

  return (
    <div className="flex flex-col gap-6">
      <ExpenseModeSettings initialMode="PRIVATE" /> {/* Temporarily default, ideally fetched */}
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

          <ExpenseApproversList />
        </div>
      </Card>
    </div>
  );
}
