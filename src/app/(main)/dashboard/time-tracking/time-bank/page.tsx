import { SectionHeader } from "@/components/hr/section-header";

import { TimeBankAdminPanel } from "./_components/time-bank-admin-panel";

export default function TimeBankAdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Bolsa de Horas"
        description="Revisa y aprueba solicitudes de recuperaciones y festivos trabajados."
      />
      <TimeBankAdminPanel />
    </div>
  );
}
