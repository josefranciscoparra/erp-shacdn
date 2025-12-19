"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronDown, ChevronUp, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  type ApprovalCriterion,
  type ApprovalRequestType,
  type ApprovalSettings,
  DEFAULT_APPROVAL_SETTINGS,
} from "@/lib/approvals/approval-settings";
import { getApprovalSettings, updateApprovalSettings } from "@/server/actions/approval-settings";

import { ExpenseApproversList } from "./expense-approvers-list";

type WorkflowKey = ApprovalRequestType;

const workflowLabels: Record<WorkflowKey, { title: string; description: string }> = {
  PTO: {
    title: "Ausencias",
    description: "Define quien aprueba vacaciones y permisos.",
  },
  MANUAL_TIME_ENTRY: {
    title: "Fichajes manuales",
    description: "Define quien valida solicitudes de correccion de fichajes.",
  },
  TIME_BANK: {
    title: "Bolsa de horas",
    description: "Define quien revisa solicitudes de compensacion/recuperacion.",
  },
  EXPENSE: {
    title: "Gastos",
    description: "Define quien aprueba los gastos enviados por empleados.",
  },
};

const criterionLabels: Record<ApprovalCriterion, string> = {
  DIRECT_MANAGER: "Responsable directo (manager del contrato)",
  TEAM_RESPONSIBLE: "Responsable de equipo",
  DEPARTMENT_RESPONSIBLE: "Responsable de departamento",
  COST_CENTER_RESPONSIBLE: "Responsable de centro de coste",
};

const criterionOptions: ApprovalCriterion[] = [
  "DIRECT_MANAGER",
  "TEAM_RESPONSIBLE",
  "DEPARTMENT_RESPONSIBLE",
  "COST_CENTER_RESPONSIBLE",
];

function ApprovalOrderEditor({
  order,
  onChange,
}: {
  order: ApprovalCriterion[];
  onChange: (next: ApprovalCriterion[]) => void;
}) {
  const availableOptions = useMemo(() => criterionOptions.filter((option) => !order.includes(option)), [order]);

  const moveItem = (from: number, to: number) => {
    const next = [...order];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {order.map((criterion, index) => (
        <div key={criterion} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {index + 1}. {criterionLabels[criterion]}
            </span>
            <span className="text-muted-foreground text-xs">Se usa si existe para el empleado.</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveItem(index, index - 1)}
              disabled={index === 0}
              aria-label="Subir criterio"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveItem(index, index + 1)}
              disabled={index === order.length - 1}
              aria-label="Bajar criterio"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(order.filter((item) => item !== criterion))}
              disabled={order.length <= 1}
              aria-label="Eliminar criterio"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Eliminar criterio</span>
            </Button>
          </div>
        </div>
      ))}

      {availableOptions.length > 0 && (
        <div className="flex items-center gap-3">
          <Select
            value=""
            onValueChange={(value) => {
              if (!value) return;
              onChange([...order, value as ApprovalCriterion]);
            }}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Agregar criterio..." />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {criterionLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export function ApprovalSettingsTab() {
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getApprovalSettings();
      setSettings(data);
    } catch (error) {
      console.error("Error al cargar configuracion de aprobaciones:", error);
      setSettings(DEFAULT_APPROVAL_SETTINGS);
      toast.error("No se pudo cargar la configuracion de aprobaciones");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const result = await updateApprovalSettings(settings);
      if (result.success) {
        toast.success("Configuracion de aprobaciones guardada");
      } else {
        toast.error(result.error ?? "No se pudo guardar la configuracion");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <div className="text-muted-foreground text-sm">Cargando configuracion...</div>
        </Card>
      </div>
    );
  }

  const workflows = settings.workflows;

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-primary h-5 w-5" />
          <div>
            <h3 className="font-semibold">Flujo de aprobaciones</h3>
            <p className="text-muted-foreground text-sm">
              El sistema utiliza el primer criterio que aplique para cada empleado. Si no encuentra aprobadores, se
              activa el fallback de RRHH.
            </p>
          </div>
        </div>
      </Card>

      {(["PTO", "MANUAL_TIME_ENTRY", "TIME_BANK", "EXPENSE"] as WorkflowKey[]).map((key) => (
        <Card key={key} className="rounded-lg border p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{workflowLabels[key].title}</h3>
              <p className="text-muted-foreground text-sm">{workflowLabels[key].description}</p>
            </div>

            {key === "EXPENSE" && (
              <div className="grid gap-4 @xl/main:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Modo de aprobacion</p>
                  <Select
                    value={workflows.EXPENSE.mode}
                    onValueChange={(value) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              workflows: {
                                ...prev.workflows,
                                EXPENSE: {
                                  ...prev.workflows.EXPENSE,
                                  mode: value === "LIST" ? "LIST" : "HIERARCHY",
                                },
                              },
                            }
                          : prev,
                      )
                    }
                  >
                    <SelectTrigger className="mt-2 w-full max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIST">Lista de aprobadores</SelectItem>
                      <SelectItem value="HIERARCHY">Jerarquia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-muted-foreground text-sm">
                  {workflows.EXPENSE.mode === "LIST"
                    ? "Si la lista esta vacia, se aplicara el orden jerarquico configurado."
                    : "Se aplica el orden jerarquico configurado. Siempre hay fallback a RRHH."}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Orden jerarquico</p>
              <ApprovalOrderEditor
                order={workflows[key].criteriaOrder}
                onChange={(next) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          workflows: {
                            ...prev.workflows,
                            [key]: {
                              ...prev.workflows[key],
                              criteriaOrder: next,
                            },
                          },
                        }
                      : prev,
                  )
                }
              />
            </div>

            {key === "EXPENSE" && workflows.EXPENSE.mode === "LIST" && (
              <>
                <Separator />
                <ExpenseApproversList />
              </>
            )}
          </div>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
