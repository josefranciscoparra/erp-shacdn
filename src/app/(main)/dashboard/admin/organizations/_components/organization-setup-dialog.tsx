"use client";

import Link from "next/link";

import { AlertTriangle, CheckCircle2, ChevronRight, Layers, LayoutDashboard, Settings, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { OrganizationItem } from "./types";

interface OrganizationSetupDialogProps {
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
  action?: React.ReactNode;
}

function ChecklistRow({ ok, title, description, action }: ChecklistRowProps) {
  return (
    <div
      className={cn(
        "group relative flex gap-4 rounded-xl border p-4 transition-all",
        ok
          ? "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/20"
          : "border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
          ok
            ? "border-emerald-200 bg-emerald-100 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20"
            : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/50 dark:bg-amber-900/20",
        )}
      >
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className={cn("font-medium", ok && "text-slate-500 line-through")}>{title}</p>
          {ok && (
            <Badge
              variant="secondary"
              className="border-emerald-100 bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-100"
            >
              Completado
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        {action && !ok && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}

export function OrganizationSetupDialog({
  open,
  onOpenChange,
  organization,
  onSeedBasics,
  isSeeding,
}: OrganizationSetupDialogProps) {
  if (!organization) {
    return null;
  }

  const hasPrefix = Boolean(organization.employeeNumberPrefix);
  const hasDomains = organization.allowedEmailDomains.length > 0;

  const departmentCount = organization._count?.departments ?? 0;
  const costCenterCount = organization._count?.costCenters ?? 0;
  const scheduleCount = organization._count?.scheduleTemplates ?? 0;

  const allBasicsReady = departmentCount > 0 && costCenterCount > 0 && scheduleCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="space-y-1 border-b bg-slate-50/50 px-6 py-6 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Configuración Inicial</DialogTitle>
              <DialogDescription className="mt-1">
                Prepara <strong>{organization.name}</strong> para el lanzamiento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-8 px-6 py-6">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Settings className="h-4 w-4 text-indigo-500" />
                Identidad y Reglas
              </h3>

              <div className="grid gap-3">
                <ChecklistRow
                  ok={hasPrefix}
                  title="Prefijo de Empleados"
                  description={
                    hasPrefix
                      ? `Prefijo activo: ${organization.employeeNumberPrefix}`
                      : "Necesario para generar IDs únicos (ej. EMP001)."
                  }
                />
                <ChecklistRow
                  ok={hasDomains}
                  title="Dominios Corporativos"
                  description={
                    hasDomains ? "Dominios restringidos configurados." : "Recomendado para seguridad y auto-join."
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Estructura Organizativa
                </h3>
                {!allBasicsReady && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSeedBasics}
                    disabled={isSeeding}
                    className="h-8 gap-2 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-indigo-900 dark:hover:bg-indigo-900/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isSeeding ? "Generando..." : "Auto-generar básicos"}
                  </Button>
                )}
              </div>

              <div className="grid gap-3">
                <ChecklistRow
                  ok={costCenterCount > 0}
                  title="Centros de Trabajo"
                  description="Ubicaciones físicas o lógicas para asignar empleados."
                  action={
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href="/dashboard/cost-centers" className="flex items-center gap-1">
                        Ir a Centros <ChevronRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  }
                />
                <ChecklistRow
                  ok={departmentCount > 0}
                  title="Departamentos"
                  description="Unidades organizativas para agrupar equipos."
                  action={
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href="/dashboard/departments" className="flex items-center gap-1">
                        Ir a Departamentos <ChevronRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  }
                />
                <ChecklistRow
                  ok={scheduleCount > 0}
                  title="Horarios y Turnos"
                  description="Plantillas de horario para asignar jornadas."
                  action={
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href="/dashboard/schedules" className="flex items-center gap-1">
                        Ir a Horarios <ChevronRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t bg-slate-50/50 p-6 dark:bg-slate-900/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
