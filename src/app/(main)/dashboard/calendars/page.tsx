"use client";

import { useEffect } from "react";
import { SectionHeader } from "@/components/hr/section-header";
import { EmptyState } from "@/components/hr/empty-state";
import { CalendarsDataTable } from "./_components/calendars-data-table";
import { Plus, Calendar, Loader2 } from "lucide-react";
import { useCalendarsStore } from "@/stores/calendars-store";

export default function CalendarsPage() {
  const calendars = useCalendarsStore((state) => state.calendars);
  const isLoading = useCalendarsStore((state) => state.isLoading);
  const error = useCalendarsStore((state) => state.error);
  const fetchCalendars = useCalendarsStore((state) => state.fetchCalendars);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Calendarios"
          subtitle="Gestiona los calendarios organizacionales"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando calendarios...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Calendarios"
          subtitle="Gestiona los calendarios organizacionales"
        />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error al cargar calendarios: {error}</span>
        </div>
      </div>
    );
  }

  const hasCalendars = calendars.length > 0;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Calendarios"
        subtitle="Gestiona calendarios de festivos, eventos corporativos y cierres por centro de coste"
      />

      {hasCalendars ? (
        <CalendarsDataTable data={calendars} />
      ) : (
        <EmptyState
          icon={<Calendar className="mx-auto h-12 w-12" />}
          title="No hay calendarios registrados"
          description="Comienza creando tu primer calendario de festivos o eventos"
          actionHref="/dashboard/calendars/new"
          actionLabel="Crear primer calendario"
        />
      )}
    </div>
  );
}
