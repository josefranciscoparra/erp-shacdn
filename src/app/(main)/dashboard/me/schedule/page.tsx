import { SectionHeader } from "@/components/hr/section-header";

import { CurrentPeriodBadge } from "./_components/current-period-badge";
import { NextPeriodChange } from "./_components/next-period-change";
import { WeekScheduleView } from "./_components/week-schedule-view";

export default function MySchedulePage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Mi Horario" subtitle="Consulta tu horario semanal y próximos cambios" />

      <div className="grid gap-4 md:gap-6">
        {/* Período actual y próximos cambios */}
        <div className="grid gap-4 md:gap-6 @2xl/main:grid-cols-2">
          <CurrentPeriodBadge />
          <NextPeriodChange />
        </div>

        {/* Horario semanal */}
        <WeekScheduleView />
      </div>
    </div>
  );
}
