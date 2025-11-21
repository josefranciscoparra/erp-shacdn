import { SectionHeader } from "@/components/hr/section-header";

import { ResponsibilitiesList } from "./_components/responsibilities-list";

export default function ResponsibilitiesPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Mis Responsabilidades"
        description="Gestiona tus áreas de responsabilidad y configura notificaciones de alertas."
      />

      <ResponsibilitiesList />
    </div>
  );
}
