"use client";

import type { Shift } from "@prisma/client";
import { Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type ShiftWithRelations = Shift & {
  position: { id: string; title: string } | null;
  costCenter: { id: string; name: string };
  template: { id: string; name: string; color: string } | null;
  assignments: Array<{
    id: string;
    employeeId: string;
    status: string;
  }>;
};

interface EmployeeShiftCardProps {
  shift: ShiftWithRelations;
}

export function EmployeeShiftCard({ shift }: EmployeeShiftCardProps) {
  const statusColor = {
    DRAFT: "bg-gray-500",
    PENDING_APPROVAL: "bg-amber-500",
    PUBLISHED: "bg-green-500",
    CLOSED: "bg-blue-500",
  }[shift.status];

  const statusLabel = {
    DRAFT: "Borrador",
    PENDING_APPROVAL: "Pendiente",
    PUBLISHED: "Confirmado",
    CLOSED: "Finalizado",
  }[shift.status];

  const templateColor = shift.template?.color ?? "#3b82f6";

  const durationHours = Math.floor(shift.durationMinutes / 60);
  const durationMins = shift.durationMinutes % 60;

  return (
    <div className="bg-card relative rounded-lg border p-3 transition-all hover:shadow-md">
      {/* Color indicator */}
      <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg" style={{ backgroundColor: templateColor }} />

      {/* Content */}
      <div className="ml-2 flex flex-col gap-2">
        {/* Time */}
        <div className="flex items-center gap-1 text-sm font-medium">
          <Clock className="text-muted-foreground h-3 w-3" />
          {shift.startTime} - {shift.endTime}
        </div>

        {/* Duration */}
        <div className="text-muted-foreground text-xs">
          {durationHours}h {durationMins > 0 ? `${durationMins}m` : ""}
        </div>

        {/* Position */}
        {shift.position && <div className="text-xs font-medium">{shift.position.title}</div>}

        {/* Cost center */}
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3" />
          {shift.costCenter.name}
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-between">
          <Badge variant={shift.status === "PUBLISHED" ? "default" : "outline"} className="text-[10px]">
            {statusLabel}
          </Badge>
          <div className={`h-2 w-2 rounded-full ${statusColor}`} title={statusLabel} />
        </div>

        {/* Notes if any */}
        {shift.notes && <div className="bg-muted text-muted-foreground mt-1 rounded p-2 text-xs">{shift.notes}</div>}
      </div>
    </div>
  );
}
