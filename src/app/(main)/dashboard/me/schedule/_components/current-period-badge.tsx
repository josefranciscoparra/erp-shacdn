"use client";

import { useCallback, useEffect, useState } from "react";

import { CalendarCheck, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodaySchedule } from "@/server/actions/employee-schedule";

export function CurrentPeriodBadge() {
  const [periodName, setPeriodName] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPeriodInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getTodaySchedule();

      if (result.success && result.schedule) {
        setPeriodName(result.schedule.periodName ?? null);
        setSource(result.schedule.source);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriodInfo();
  }, [loadPeriodInfo]);

  const getPeriodBadgeVariant = (name?: string | null) => {
    if (!name) return "secondary";
    const nameLower = name.toLowerCase();
    if (nameLower.includes("intensive") || nameLower.includes("verano")) return "default";
    if (nameLower.includes("special")) return "destructive";
    return "secondary";
  };

  const getPeriodLabel = (name?: string | null) => {
    if (!name) return "Sin período específico";
    const nameLower = name.toLowerCase();
    if (nameLower === "regular") return "Horario Regular";
    if (nameLower === "intensive") return "Jornada Intensiva";
    if (nameLower === "special") return "Período Especial";
    return name;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" />
          Período Actual
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="bg-muted relative h-16 w-full overflow-hidden rounded-lg">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={getPeriodBadgeVariant(periodName)} className="text-sm">
                {getPeriodLabel(periodName)}
              </Badge>
            </div>

            {source === "EXCEPTION" && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarCheck className="h-4 w-4" />
                <span>Horario especial para hoy</span>
              </div>
            )}

            {source === "ABSENCE" && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarCheck className="h-4 w-4" />
                <span>Día de ausencia</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
