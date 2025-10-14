"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, AlertTriangle, Clock, Calendar, Sun } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Contract } from "@/stores/contracts-store";

interface BulkEditPreviewProps {
  selectedContracts: Contract[];
  changes: {
    weeklyHours?: number;
    workingDaysPerWeek?: number;
    hasIntensiveSchedule?: boolean;
    intensiveStartDate?: string;
    intensiveEndDate?: string;
    intensiveWeeklyHours?: number;
  };
}

export function BulkEditPreview({ selectedContracts, changes }: BulkEditPreviewProps) {
  const [showEmployeeList, setShowEmployeeList] = useState(false);

  // Verificar si hay cambios para mostrar
  const hasChanges = Object.keys(changes).some((key) => {
    const value = changes[key as keyof typeof changes];
    return value !== undefined && value !== null;
  });

  if (!hasChanges) {
    return null;
  }

  // Formatear fecha MM-DD a texto legible
  const formatDate = (mmdd: string) => {
    const [month, day] = mmdd.split("-");
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return `${day} de ${monthNames[parseInt(month, 10) - 1]}`;
  };

  return (
    <div className="space-y-4">
      {/* Advertencia para muchos contratos */}
      {selectedContracts.length > 50 && (
        <Alert className="border-orange-500 bg-orange-50 dark:border-orange-400 dark:bg-orange-950/50">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="dark:text-foreground text-orange-900">
            ⚠️ Vas a modificar <strong>{selectedContracts.length} contratos</strong>. Verifica que los cambios sean
            correctos antes de confirmar.
          </AlertDescription>
        </Alert>
      )}

      {/* Resumen de cambios */}
      <Card className="p-4">
        <h4 className="text-foreground mb-3 text-sm font-semibold">Resumen de cambios</h4>
        <div className="space-y-2">
          {changes.weeklyHours !== undefined && changes.weeklyHours !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="text-primary h-4 w-4" />
              <span className="text-muted-foreground">Horas semanales:</span>
              <span className="text-foreground font-medium">{changes.weeklyHours}h/semana</span>
            </div>
          )}

          {changes.workingDaysPerWeek !== undefined && changes.workingDaysPerWeek !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="text-primary h-4 w-4" />
              <span className="text-muted-foreground">Días laborables:</span>
              <span className="text-foreground font-medium">{changes.workingDaysPerWeek} días/semana</span>
            </div>
          )}

          {changes.hasIntensiveSchedule !== undefined && changes.hasIntensiveSchedule !== null && (
            <div className="flex items-start gap-2 text-sm">
              <Sun className="text-primary mt-0.5 h-4 w-4" />
              <div className="flex-1">
                <span className="text-muted-foreground">Jornada intensiva:</span>
                {changes.hasIntensiveSchedule ? (
                  <div className="mt-1 space-y-1">
                    <div className="text-foreground font-medium">Activada</div>
                    {changes.intensiveStartDate && changes.intensiveEndDate && (
                      <div className="text-muted-foreground text-xs">
                        Desde {formatDate(changes.intensiveStartDate)} hasta {formatDate(changes.intensiveEndDate)}
                      </div>
                    )}
                    {changes.intensiveWeeklyHours && (
                      <div className="text-foreground text-xs font-medium">{changes.intensiveWeeklyHours}h/semana</div>
                    )}
                  </div>
                ) : (
                  <span className="text-foreground ml-1 font-medium">Desactivada</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Lista de empleados afectados */}
      <Card className="p-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowEmployeeList(!showEmployeeList)}
          className="mb-2 w-full justify-between p-2"
        >
          <span className="text-sm font-semibold">Empleados afectados ({selectedContracts.length})</span>
          {showEmployeeList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showEmployeeList && (
          <ScrollArea className="h-40">
            <div className="space-y-1 pr-4">
              {selectedContracts.map((contract) => {
                const employee = contract.employee;
                if (!employee) return null;

                const fullName = `${employee.firstName} ${employee.lastName}${employee.secondLastName ? ` ${employee.secondLastName}` : ""}`;

                return (
                  <div key={contract.id} className="flex items-center justify-between rounded border p-2 text-xs">
                    <div>
                      <div className="text-foreground font-medium">{fullName}</div>
                      {employee.employeeNumber && (
                        <div className="text-muted-foreground font-mono">#{employee.employeeNumber}</div>
                      )}
                    </div>
                    <div className="text-muted-foreground text-right">
                      {contract.weeklyHours && <div>{contract.weeklyHours}h/sem</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
