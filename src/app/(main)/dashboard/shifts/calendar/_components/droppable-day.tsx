"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Shift } from "@prisma/client";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { CreateShiftDialog } from "./create-shift-dialog";
import { ShiftCard } from "./shift-card";

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

interface DroppableDayProps {
  day: Date;
  shifts: ShiftWithRelations[];
  onShiftClick: (date: Date) => void;
  onShiftUpdate?: () => void;
}

export function DroppableDay({ day, shifts, onShiftClick, onShiftUpdate }: DroppableDayProps) {
  const dayId = format(day, "yyyy-MM-dd");
  const isToday = isSameDay(day, new Date());

  const { setNodeRef, isOver } = useDroppable({
    id: dayId,
  });

  return (
    <Card
      ref={setNodeRef}
      className={`flex min-h-[400px] flex-col p-3 transition-all ${
        isToday ? "border-primary bg-primary/5" : ""
      } ${isOver ? "border-primary bg-primary/10 ring-primary ring-2" : ""}`}
    >
      {/* Day header */}
      <div className="mb-3 flex items-center justify-between border-b pb-2">
        <div>
          <div className="text-muted-foreground text-xs font-medium uppercase">
            {format(day, "EEE", { locale: es })}
          </div>
          <div className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
        </div>
        {shifts.length > 0 && <Badge variant="secondary">{shifts.length}</Badge>}
      </div>

      {/* Shifts for this day */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {shifts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground text-sm">Sin turnos</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onClick={() => onShiftClick(new Date(shift.date))}
              onUpdate={onShiftUpdate}
            />
          ))
        )}
      </div>

      {/* Quick add button */}
      <CreateShiftDialog
        trigger={
          <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Añadir turno
          </Button>
        }
        defaultDate={day}
      />
    </Card>
  );
}
