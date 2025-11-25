import { SectionHeader } from "@/components/hr/section-header";

import { TimeBankAdminPanel } from "./_components/time-bank-admin-panel";
<<<<<<< Updated upstream
import { TimeBankStats } from "./_components/time-bank-stats";

export default function TimeBankAdminPage() {
  return (
    <div className="@container/main flex flex-col gap-6">
      <SectionHeader
        title="Bolsa de Horas"
        description="Gestiona la bolsa de horas de todos los empleados de la organización."
      />
      <TimeBankStats />
=======

export default function TimeBankAdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Bolsa de Horas"
        description="Revisa y aprueba solicitudes de recuperaciones y festivos trabajados."
      />
>>>>>>> Stashed changes
      <TimeBankAdminPanel />
    </div>
  );
}
