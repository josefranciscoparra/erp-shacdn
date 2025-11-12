"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, MapPin, Users, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UnderstaffedShift {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  requiredHeadcount: number;
  deficit: number;
  coveragePercentage: number;
  position?: {
    id: string;
    title: string;
  } | null;
  costCenter: {
    id: string;
    name: string;
  };
  assignments: Array<{
    id: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface UnderstaffedShiftsListProps {
  shifts: UnderstaffedShift[];
}

export function UnderstaffedShiftsList({ shifts }: UnderstaffedShiftsListProps) {
  // Ordenar por déficit (mayor a menor)
  const sortedShifts = [...shifts].sort((a, b) => b.deficit - a.deficit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Turnos con Déficit de Cobertura
          </CardTitle>
          <Badge variant="destructive">{shifts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedShifts.map((shift) => (
            <div
              key={shift.id}
              className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-all"
            >
              <div className="flex flex-1 flex-col gap-2">
                {/* Date and time */}
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">
                    {format(new Date(shift.date), "EEEE d 'de' MMMM", {
                      locale: es,
                    })}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    {shift.startTime} - {shift.endTime}
                  </div>
                </div>

                {/* Position and center */}
                <div className="flex items-center gap-4 text-sm">
                  {shift.position && <div className="font-medium">{shift.position.title}</div>}
                  <div className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {shift.costCenter.name}
                  </div>
                </div>

                {/* Assigned employees */}
                {shift.assignments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {shift.assignments.map((assignment) => (
                      <Badge key={assignment.id} variant="outline" className="text-xs">
                        {assignment.employee.firstName} {assignment.employee.lastName}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Coverage stats */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Users className="text-muted-foreground h-3 w-3" />
                    {shift.assignments.length} / {shift.requiredHeadcount}
                  </div>
                  <div className="text-muted-foreground text-xs">Faltan {shift.deficit}</div>
                </div>

                <Badge
                  variant={
                    shift.coveragePercentage === 0
                      ? "destructive"
                      : shift.coveragePercentage < 50
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {shift.coveragePercentage.toFixed(0)}%
                </Badge>

                <Button size="sm" variant="outline">
                  Asignar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
