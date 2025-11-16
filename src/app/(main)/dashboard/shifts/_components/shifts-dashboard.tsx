/**
 * Dashboard Principal de Turnos (Rediseño v3 - Factorial Style)
 *
 * Dashboard con storytelling visual que responde 3 preguntas:
 * 1. ¿Estamos bien cubiertos esta semana? → Hero Card
 * 2. ¿Dónde hay problemas urgentes? → Alertas
 * 3. ¿Qué tengo que hacer ahora? → Resumen por Centro
 *
 * ⚠️ Usa datos MOCK para demostración visual
 * ⚠️ NO conectado a API ni base de datos
 */

"use client";

import { useMemo, useState } from "react";

import { getAlertsByCenter, getCentersSummary, getStatsByCenter } from "../_lib/dashboard-mock-data";

import { DashboardCenterSummaryV2 } from "./dashboard-center-summary-v2";
import { DashboardCriticalAlertsV2 } from "./dashboard-critical-alerts-v2";
import { DashboardFilterBar } from "./dashboard-filter-bar";
import { DashboardStatsCardsV2 } from "./dashboard-stats-cards-v2";

export function ShiftsDashboard() {
  // Estados de filtros (solo UI, datos MOCK)
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [periodType, setPeriodType] = useState<"week" | "month">("week");

  // Simular loading (en producción vendría del store)
  const isLoading = false;

  // Obtener datos MOCK según filtros
  const stats = useMemo(() => {
    return getStatsByCenter(selectedCenter);
  }, [selectedCenter]);

  const alerts = useMemo(() => {
    return getAlertsByCenter(selectedCenter);
  }, [selectedCenter]);

  const centers = useMemo(() => {
    return getCentersSummary(selectedCenter);
  }, [selectedCenter]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Barra de Filtros Compacta */}
      <DashboardFilterBar
        selectedCenter={selectedCenter}
        onCenterChange={setSelectedCenter}
        periodType={periodType}
        onPeriodChange={setPeriodType}
      />

      {/* 1️⃣ Pregunta: ¿Estamos bien cubiertos? → Hero Card Compacta */}
      <DashboardStatsCardsV2 stats={stats} isLoading={isLoading} />

      {/* 2️⃣ y 3️⃣ Preguntas: ¿Problemas urgentes? ¿Qué hacer? */}
      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-2">
        {/* Alertas Críticas - Problemas que requieren atención */}
        <DashboardCriticalAlertsV2 alerts={alerts} isLoading={isLoading} />

        {/* Resumen por Centro - Vista general de cada centro */}
        <DashboardCenterSummaryV2 centers={centers} isLoading={isLoading} />
      </div>
    </div>
  );
}
