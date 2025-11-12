/**
 * Página de Configuración de Turnos
 * Sprint 7
 */

import { SectionHeader } from "@/components/hr/section-header";

import { ShiftSettingsForm } from "./_components/shift-settings-form";
import { ShiftSystemStats } from "./_components/shift-system-stats";

export default function ShiftSettingsPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Configuración de Turnos"
        description="Configura las reglas y límites del sistema de gestión de turnos"
      />

      <div className="grid gap-6 @4xl/main:grid-cols-3">
        <div className="@4xl/main:col-span-2">
          <ShiftSettingsForm />
        </div>
        <div>
          <ShiftSystemStats />
        </div>
      </div>
    </div>
  );
}
