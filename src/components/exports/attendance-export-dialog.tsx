"use client";

import { useEffect, useMemo, useState } from "react";

import { Calendar, DownloadCloud, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestTimeTrackingMonthlyExport } from "@/server/actions/data-exports";
import { getDepartments } from "@/server/actions/departments";

type AttendanceExportDialogProps = {
  triggerLabel?: string;
  onCreated?: (exportId: string) => void;
};

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export function AttendanceExportDialog({ triggerLabel = "Exportar", onCreated }: AttendanceExportDialogProps) {
  const now = useMemo(() => new Date(), []);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"COMPANY" | "DEPARTMENT">("COMPANY");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departmentId, setDepartmentId] = useState<string>("");
  const [notifyWhenReady, setNotifyWhenReady] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let isActive = true;

    const loadDepartments = async () => {
      setLoadingDepartments(true);
      const result = await getDepartments();
      if (!isActive) return;
      if (result.success && result.departments) {
        setDepartments(result.departments.map((dept) => ({ id: dept.id, name: dept.name })));
      }
      setLoadingDepartments(false);
    };

    loadDepartments();

    return () => {
      isActive = false;
    };
  }, [open]);

  useEffect(() => {
    if (scope === "COMPANY") {
      setDepartmentId("");
    }
  }, [scope]);

  const canSubmit = scope === "COMPANY" || departmentId.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const result = await requestTimeTrackingMonthlyExport(
      month,
      year,
      scope,
      departmentId ? departmentId : undefined,
      notifyWhenReady,
    );
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "No se pudo crear la exportación");
      return;
    }

    if (result.reused && result.status === "COMPLETED") {
      toast.success("El informe ya estaba disponible. Puedes descargarlo en Informes.");
    } else if (result.reused) {
      toast.success("Ya existe una exportación en curso. Te avisaremos cuando esté lista.");
    } else {
      toast.success("Solicitud registrada. El informe se generará en segundo plano.");
    }

    if (result.exportId && onCreated) {
      onCreated(result.exportId);
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="whitespace-nowrap">
          <DownloadCloud className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar fichajes mensuales</DialogTitle>
          <DialogDescription>
            Genera un CSV con fichajes y resumen diario. Se conservará durante 45 días.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="export-month">Mes</Label>
              <Select value={`${month}`} onValueChange={(value) => setMonth(Number(value))}>
                <SelectTrigger id="export-month">
                  <SelectValue placeholder="Selecciona mes" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((item) => (
                    <SelectItem key={item.value} value={`${item.value}`}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="export-year">Año</Label>
              <Input
                id="export-year"
                type="number"
                inputMode="numeric"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  if (Number.isNaN(parsed)) return;
                  setYear(parsed);
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="export-scope">Ámbito</Label>
              <Select
                value={scope}
                onValueChange={(value) => setScope(value === "DEPARTMENT" ? "DEPARTMENT" : "COMPANY")}
              >
                <SelectTrigger id="export-scope">
                  <SelectValue placeholder="Selecciona ámbito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Empresa
                    </div>
                  </SelectItem>
                  <SelectItem value="DEPARTMENT">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Departamento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="export-department">Departamento</Label>
              <Select
                value={departmentId}
                onValueChange={setDepartmentId}
                disabled={scope !== "DEPARTMENT" || loadingDepartments}
              >
                <SelectTrigger id="export-department">
                  <SelectValue placeholder={loadingDepartments ? "Cargando..." : "Selecciona"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Checkbox
              id="export-notify"
              checked={notifyWhenReady}
              onCheckedChange={(value) => setNotifyWhenReady(Boolean(value))}
            />
            <Label htmlFor="export-notify" className="flex flex-col gap-1">
              <span>Avísame cuando esté listo</span>
              <span className="text-muted-foreground text-xs">
                Recibirás una notificación en la campana cuando el informe esté disponible.
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generar exportación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
