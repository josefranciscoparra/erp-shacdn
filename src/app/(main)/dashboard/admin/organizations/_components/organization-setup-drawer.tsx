"use client";

import Link from "next/link";

import { AlertTriangle, ArrowLeft, CheckCircle2, Layers2, Sparkles, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type { OrganizationItem } from "./types";

interface OrganizationSetupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: OrganizationItem | null;
  onSeedBasics: () => Promise<void>;
  isSeeding: boolean;
}

interface ChecklistRowProps {
  ok: boolean;
  title: string;
  description: string;
  helper?: string;
}

function ChecklistRow({ ok, title, description, helper }: ChecklistRowProps) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  const badgeVariant = ok ? "secondary" : "outline";
  const badgeLabel = ok ? "Listo" : "Pendiente";

  return (
    <div className="border-border/80 flex items-start gap-3 rounded-lg border px-3 py-3">
      <Icon className={cn("mt-1 h-4 w-4", ok ? "text-emerald-500" : "text-amber-500")} />
      <div className="flex-1 text-sm">
        <div className="flex items-center gap-2">
          <p className="font-medium">{title}</p>
          <Badge variant={badgeVariant} className="text-[11px]">
            {badgeLabel}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
        {helper ? <p className="text-muted-foreground mt-1 text-xs italic">{helper}</p> : null}
      </div>
    </div>
  );
}

export function OrganizationSetupDrawer({
  open,
  onOpenChange,
  organization,
  onSeedBasics,
  isSeeding,
}: OrganizationSetupDrawerProps) {
  if (!organization) {
    return null;
  }

  const hasPrefix = Boolean(organization.employeeNumberPrefix);
  const hasDomains = organization.allowedEmailDomains.length > 0;
  const hasPto = organization.annualPtoDays > 0;

  const departmentCount = organization._count?.departments ?? 0;
  const costCenterCount = organization._count?.costCenters ?? 0;
  const scheduleCount = organization._count?.scheduleTemplates ?? 0;

  const catalogSummary = [
    { label: "Centros de trabajo", count: costCenterCount, href: "/dashboard/cost-centers" },
    { label: "Departamentos", count: departmentCount, href: "/dashboard/departments" },
    { label: "Horarios", count: scheduleCount, href: "/dashboard/schedules" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>Checklist de arranque</SheetTitle>
          <SheetDescription>
            Revisa que la organización <strong>{organization.name}</strong> tenga el mínimo imprescindible antes de
            importar empleados.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto py-6 pr-2">
          <div className="bg-primary/5 text-primary-foreground/90 border-primary/20 text-foreground rounded-lg border p-4 text-sm">
            <p className="text-primary font-semibold">¿Qué hace este asistente?</p>
            <p className="text-muted-foreground mt-1">
              Comprueba prefijo, dominios, vacaciones y catálogos (centros, departamentos, horarios). Si falta algo,
              puedes crear una base mínima con un clic y luego completar los datos desde el panel correspondiente.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UserCog className="h-4 w-4" />
                Identidad y accesos
              </div>
              <div className="mt-3 space-y-3">
                <ChecklistRow
                  ok={hasPrefix}
                  title="Prefijo de numeración"
                  description={
                    hasPrefix
                      ? `Usaremos el prefijo ${organization.employeeNumberPrefix} para numerar automáticamente los empleados.`
                      : "Configura un prefijo para generar códigos profesionales (ej. TMNW00001)."
                  }
                />
                <ChecklistRow
                  ok={hasDomains}
                  title="Dominios corporativos"
                  description={
                    hasDomains
                      ? "Los invitaremos con los dominios indicados. Puedes añadir más desde la edición de la organización."
                      : "Añade al menos un dominio corporativo si quieres forzar emails del tipo @empresa.com."
                  }
                  helper={
                    hasDomains
                      ? `Dominios activos: ${organization.allowedEmailDomains.map((domain) => `@${domain}`).join(", ")}.`
                      : "Si aún no lo tienes claro, puedes dejarlo vacío."
                  }
                />
                <ChecklistRow
                  ok={hasPto}
                  title="Vacaciones anuales por defecto"
                  description={`Actualmente se darán ${organization.annualPtoDays} día(s) de vacaciones al año a cada nuevo empleado.`}
                  helper="Podrás ajustar saldos concretos durante la importación."
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Layers2 className="h-4 w-4" />
                Catálogos básicos
              </div>
              <div className="mt-3 space-y-3">
                <ChecklistRow
                  ok={costCenterCount > 0}
                  title="Centro de trabajo"
                  description={
                    costCenterCount > 0
                      ? "Ya tienes al menos un centro donde ubicar contratos y geocercas."
                      : "Necesitas al menos un centro de coste para asociar fichajes y departamentos."
                  }
                />
                <ChecklistRow
                  ok={departmentCount > 0}
                  title="Departamento principal"
                  description={
                    departmentCount > 0
                      ? "Puedes añadir más departamentos desde el panel para reflejar la estructura real."
                      : "Crea un departamento base para que RRHH pueda asignar jerarquías."
                  }
                />
                <ChecklistRow
                  ok={scheduleCount > 0}
                  title="Horario oficial"
                  description={
                    scheduleCount > 0
                      ? "Ya dispones de al menos un horario listo para asignar en el import."
                      : "Crea un horario 9:00-18:00 (o el que corresponda) para asociarlo en la plantilla."
                  }
                />
              </div>
            </div>
          </div>

          <div className="text-muted-foreground space-y-3 rounded-lg border px-4 py-3 text-xs">
            <p className="text-foreground font-semibold">Necesitas moverte como SUPER_ADMIN</p>
            <p>
              Cambia a la organización objetivo (menú superior) antes de abrir cada módulo. Desde ahí podrás completar
              centros, departamentos y horarios en sus pantallas habituales.
            </p>
            <div className="grid gap-2 pt-1 sm:grid-cols-3">
              {catalogSummary.map((item) => (
                <Button key={item.label} asChild variant="outline" size="sm" className="justify-center gap-1 text-xs">
                  <Link href={item.href} className="flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {item.label}
                    <span className="text-muted-foreground text-[10px]">({item.count})</span>
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border px-4 py-3">
            <p className="text-sm font-semibold">¿Falta todo? Crea una base mínima</p>
            <p className="text-muted-foreground text-xs">
              Generaremos automáticamente un centro de trabajo, un departamento general y un horario fijo (L-V
              9:00-18:00 con pausa). Después puedes editar cada elemento.
            </p>
            <Button
              className="w-full gap-2"
              onClick={onSeedBasics}
              disabled={isSeeding}
              aria-label="Crear catálogos base"
            >
              <Sparkles className="h-4 w-4" />
              {isSeeding ? "Creando catálogos..." : "Crear catálogos base"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
