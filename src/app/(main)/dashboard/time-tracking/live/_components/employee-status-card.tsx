"use client";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight } from "lucide-react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { EmployeeTimeTracking } from "../../_components/employee-columns";

interface EmployeeStatusCardProps {
  employee: EmployeeTimeTracking;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}

function getStatusDotColor(status: EmployeeTimeTracking["status"]): string {
  const colors = {
    CLOCKED_IN: "#10b981", // green
    ON_BREAK: "#f59e0b", // yellow
    CLOCKED_OUT: "#ef4444", // red
  };
  return colors[status];
}

export function EmployeeStatusCard({ employee }: EmployeeStatusCardProps) {
  const dotColor = getStatusDotColor(employee.status);

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Link
          href={`/dashboard/time-tracking/${employee.id}`}
          className="hover:bg-accent group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        >
          {/* Status dot - estilos inline para Safari */}
          <div
            className="status-indicator shrink-0"
            style={{
              backgroundColor: dotColor,
              width: "8px",
              height: "8px",
              borderRadius: "50%",
            }}
          />

          {/* Nombre y departamento */}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium">{employee.name}</span>
            <span className="text-muted-foreground text-xs"> - {employee.department}</span>
          </div>

          {/* Horas trabajadas */}
          {employee.todayWorkedMinutes > 0 && (
            <div className="text-muted-foreground shrink-0 text-xs font-medium">
              {formatMinutes(employee.todayWorkedMinutes)}
            </div>
          )}

          {/* Flecha de navegación */}
          <ArrowRight className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </HoverCardTrigger>

      {/* Tooltip con detalles completos */}
      <HoverCardContent className="w-64" side="right" align="start">
        <div className="space-y-2">
          <div>
            <h4 className="text-sm font-semibold">{employee.name}</h4>
            <p className="text-muted-foreground text-xs">{employee.department}</p>
          </div>

          <div className="space-y-1 text-xs">
            {employee.todayWorkedMinutes > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trabajado hoy:</span>
                <span className="font-medium">{formatMinutes(employee.todayWorkedMinutes)}</span>
              </div>
            )}

            {employee.lastAction && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última acción:</span>
                <span className="font-medium">{format(new Date(employee.lastAction), "HH:mm", { locale: es })}</span>
              </div>
            )}

            {employee.isHoliday && (
              <div className="text-blue-600 dark:text-blue-400">{employee.holidayName ?? "Festivo"}</div>
            )}

            {!employee.isWorkingDay && !employee.isHoliday && (
              <div className="text-muted-foreground">Día no laborable</div>
            )}

            {employee.isAbsent && (
              <div className="text-red-600 dark:text-red-400">
                Ausencia detectada {employee.expectedEntryTime && `(${employee.expectedEntryTime})`}
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
