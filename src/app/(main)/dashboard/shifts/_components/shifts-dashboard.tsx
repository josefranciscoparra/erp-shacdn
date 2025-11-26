/**
 * Dashboard Principal de Turnos (Rediseño v3 - Factorial Style)
 *
 * Dashboard con storytelling visual que responde 3 preguntas:
 * 1. ¿Estamos bien cubiertos esta semana? → Hero Card
 * 2. ¿Dónde hay problemas urgentes? → Alertas
 * 3. ¿Qué tengo que hacer ahora? → Resumen por Centro
 *
 * ✅ Usa datos REALES del store Zustand
 */

"use client";

import { useMemo } from "react";

import { calculateDuration } from "../_lib/shift-utils";
import { useShiftsStore } from "../_store/shifts-store";

import { DashboardCenterSummaryV2 } from "./dashboard-center-summary-v2";
import { DashboardCriticalAlertsV2 } from "./dashboard-critical-alerts-v2";
import { DashboardStatsCardsV2 } from "./dashboard-stats-cards-v2";

export function ShiftsDashboard() {
  const { shifts, employees, costCenters, isLoading } = useShiftsStore();

  // --- 1. Calcular Stats Globales ---
  const stats = useMemo(() => {
    const totalShifts = shifts.length;
    const conflictShifts = shifts.filter((s) => s.status === "conflict").length;

    // Empleados únicos con al menos un turno
    const employeesWithShifts = new Set(shifts.map((s) => s.employeeId)).size;
    const totalEmployees = employees.length;
    const employeesWithoutShifts = Math.max(0, totalEmployees - employeesWithShifts);

    // Horas
    let hoursAssigned = 0;
    shifts.forEach((s) => {
      hoursAssigned += calculateDuration(s.startTime, s.endTime);
    });

    // Horas contratadas (sumar contractHours de todos los empleados visibles)
    const hoursContracted = employees.reduce((acc, emp) => acc + (emp.contractHours || 0), 0);

    // Cobertura (Simple: % de horas asignadas vs contratadas, o algún KPI de negocio)
    // Si hoursContracted es 0, evitar NaN
    const coverage = hoursContracted > 0 ? Math.min(100, Math.round((hoursAssigned / hoursContracted) * 100)) : 0;

    return {
      coverage,
      totalShifts,
      conflictShifts,
      employeesWithoutShifts,
      totalEmployees,
      hoursAssigned,
      hoursContracted,
    };
  }, [shifts, employees]);

  // --- 2. Calcular Alertas (Conflictos Reales) ---
  const alerts = useMemo(() => {
    // Mapear conflictos reales a estructura de alertas
    return shifts
      .filter((s) => s.status === "conflict")
      .map((s) => ({
        id: s.id,
        title: "Conflicto de Turno", // Podríamos mejorar esto si guardamos el tipo de conflicto
        description: `Conflicto detectado para el empleado ${s.employeeId}`, // Idealmente buscar nombre
        severity: "high" as const,
        date: s.date,
        centerId: s.costCenterId,
      }));
  }, [shifts]);

  // --- 3. Calcular Resumen por Centro ---
  const centersSummary = useMemo(() => {
    return costCenters
      .map((center) => {
        const centerShifts = shifts.filter((s) => s.costCenterId === center.id);

        // Calcular cobertura específica del centro
        // Necesitamos empleados de este centro para saber horas contratadas
        const centerEmployees = employees.filter((e) => e.costCenterId === center.id);
        const centerHoursContracted = centerEmployees.reduce((acc, emp) => acc + (emp.contractHours || 0), 0);

        let centerHoursAssigned = 0;
        centerShifts.forEach((s) => (centerHoursAssigned += calculateDuration(s.startTime, s.endTime)));

        const coverage =
          centerHoursContracted > 0
            ? Math.min(100, Math.round((centerHoursAssigned / centerHoursContracted) * 100))
            : 0;

        const alertsCount = centerShifts.filter((s) => s.status === "conflict").length;

        return {
          id: center.id,
          name: center.name,
          coverage,
          totalShifts: centerShifts.length,
          alerts: alertsCount,
        };
      })
      .sort((a, b) => b.alerts - a.alerts); // Ordenar por alertas primero
  }, [costCenters, shifts, employees]);

  return (
    <div className="@container/main flex flex-col gap-4 pt-2 md:gap-6">
      {/* Hero Card con Datos Reales */}
      <DashboardStatsCardsV2 stats={stats} isLoading={isLoading} />

      <div className="grid gap-4 md:gap-6 @xl/main:grid-cols-2">
        {/* Alertas Reales */}
        <DashboardCriticalAlertsV2 alerts={alerts} isLoading={isLoading} />

        {/* Resumen por Centro Real */}
        <DashboardCenterSummaryV2 centers={centersSummary} isLoading={isLoading} />
      </div>
    </div>
  );
}
