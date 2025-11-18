"use client";

import { AlertCircle, CalendarDays, Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NextPeriodChange() {
  // TODO: Implementar getNextPeriodChange() en el backend cuando sea necesario
  // Por ahora mostramos un mensaje informativo

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" />
          Próximos Cambios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Si tu horario tiene cambios programados (como jornada intensiva de verano), aparecerán aquí con antelación.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
