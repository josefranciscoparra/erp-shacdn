"use client";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type EmploymentStatus =
  | "PENDING_CONTRACT"
  | "ACTIVE"
  | "ON_LEAVE"
  | "VACATION"
  | "SUSPENDED"
  | "TERMINATED"
  | "RETIRED";

interface EmploymentStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

const EMPLOYMENT_STATUS_CONFIG: Record<EmploymentStatus, EmploymentStatusConfig> = {
  PENDING_CONTRACT: {
    label: "Pendiente de Contrato",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    description: "Empleado registrado pero sin contrato activo",
  },
  ACTIVE: {
    label: "Activo",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    description: "Trabajando normalmente",
  },
  ON_LEAVE: {
    label: "De Baja",
    color: "bg-orange-500",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    description: "Baja médica o permiso temporal",
  },
  VACATION: {
    label: "Vacaciones",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    description: "Periodo vacacional",
  },
  SUSPENDED: {
    label: "Suspendido",
    color: "bg-red-500",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    description: "Suspensión temporal de empleo",
  },
  TERMINATED: {
    label: "Dado de Baja",
    color: "bg-gray-500",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    description: "Finalización de la relación laboral",
  },
  RETIRED: {
    label: "Jubilado",
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    description: "Jubilación",
  },
};

interface EmployeeStatusSelectProps {
  value?: EmploymentStatus;
  onValueChange?: (value: EmploymentStatus) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EmployeeStatusSelect({
  value,
  onValueChange,
  placeholder = "Selecciona un estado",
  disabled = false,
  className,
}: EmployeeStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(EMPLOYMENT_STATUS_CONFIG).map(([status, config]) => (
          <SelectItem key={status} value={status}>
            <div className="flex items-center gap-3 py-1">
              <div className={`h-2 w-2 rounded-full ${config.color}`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-muted-foreground text-xs">{config.description}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface EmployeeStatusBadgeProps {
  status: EmploymentStatus;
  className?: string;
}

export function EmployeeStatusBadge({ status, className }: EmployeeStatusBadgeProps) {
  const config = EMPLOYMENT_STATUS_CONFIG[status];

  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        Sin estado
      </Badge>
    );
  }

  return (
    <Badge className={`${config.bgColor} ${config.textColor} border-0 ${className}`} variant="secondary">
      <div className={`h-1.5 w-1.5 rounded-full ${config.color} mr-1.5`} />
      {config.label}
    </Badge>
  );
}

// Hook para obtener la configuración del estado
export function useEmploymentStatus(status: EmploymentStatus) {
  return EMPLOYMENT_STATUS_CONFIG[status] || null;
}

// Función helper para obtener el color del estado
export function getEmploymentStatusColor(status: EmploymentStatus): string {
  return EMPLOYMENT_STATUS_CONFIG[status]?.color || "bg-gray-500";
}

// Función helper para obtener todos los estados disponibles
export function getAvailableEmploymentStatuses(): Array<{ status: EmploymentStatus; config: EmploymentStatusConfig }> {
  return Object.entries(EMPLOYMENT_STATUS_CONFIG).map(([status, config]) => ({
    status: status as EmploymentStatus,
    config,
  }));
}
