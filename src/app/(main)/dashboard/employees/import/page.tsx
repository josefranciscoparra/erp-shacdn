"use client";

import { useCallback, useMemo, useState } from "react";

import Link from "next/link";

import { ArrowLeft, Loader2, ShieldAlert, ShieldCheck, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ImportRow {
  id: string;
  rowIndex: number;
  status: "READY" | "ERROR" | "SKIPPED" | "IMPORTED" | "FAILED";
  messages: { type: "ERROR" | "WARNING" | "SUCCESS"; message: string }[];
  rawData?: Record<string, any> | null;
  data?: Record<string, any> | null;
  errorReason?: string | null;
}

interface ImportSummary {
  total: number;
  ready: number;
  error: number;
  warning: number;
}

interface JobInfo {
  jobId: string;
  summary: ImportSummary;
  rows: ImportRow[];
  options: any;
}

interface InviteSummary {
  totalEligible: number;
  pending: number;
  sent: number;
  failed: number;
  notApplicable: number;
}

interface InviteRow {
  id: string;
  rowIndex: number;
  status: "READY" | "ERROR" | "SKIPPED" | "IMPORTED" | "FAILED";
  fullName: string;
  email: string | null;
  inviteStatus: "PENDING" | "SENT" | "FAILED" | "NOT_APPLICABLE";
  inviteMessage?: string | null;
  errorReason?: string | null;
}

export default function EmployeeImportPage() {
  const permissionFallback = (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader title="Importar empleados" />
      <EmptyState
        icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
        title="Acceso denegado"
        description="No tienes permisos para ver esta sección"
      />
    </div>
  );

  return (
    <PermissionGuard permission="manage_employees" fallback={permissionFallback}>
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/employees" className="text-muted-foreground flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a empleados
            </Link>
          </Button>
        </div>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Cómo usar el cargador paso a paso</CardTitle>
            <CardDescription>
              Esta es la “chuleta” para RRHH: cada fila del archivo crea a una persona nueva. Sigue estos pasos y
              evitarás errores:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="text-muted-foreground list-decimal space-y-2 pl-4 text-sm">
              <li>
                Descarga la plantilla y copia los datos de tus empleados (nombre, email, NIF, etc.). Sin ella, el
                sistema no entiende nada.
              </li>
              <li>
                Rellena la columna <strong>schedule_template_id</strong> con el ID real del horario (aparece en la URL o
                en “Copiar ID”). Si inventas el número, fallará.
              </li>
              <li>
                Elige <strong>Modo saldo</strong> si solo conoces cuántos días tiene cada persona hoy. Usa{" "}
                <strong>Modo anual</strong> si te han pasado los días totales y los usados.
              </li>
              <li>
                Sube el archivo y mira la lista: si algo sale en rojo, corrige esa fila. Si todo sale verde, pulsa
                “Confirmar importación”.
              </li>
              <li>Después revisa la lista creada y envía las invitaciones desde el panel de “Invitaciones”.</li>
              <li>
                Si quieres probar sin dar de alta a nadie, usa “Simular importación” en la revisión. No guarda datos.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Importación masiva de empleados</CardTitle>
            <CardDescription>
              Sube un archivo XLSX o CSV con los datos de empleados para validarlos antes de importarlos en tu
              organización.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeImportWizard />
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}

function EmployeeImportWizard() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState({
    vacationMode: "BALANCE",
    sendInvites: false,
    departmentPolicy: "REQUIRE_EXISTING",
    managerPolicy: "ALLOW_MISSING_WARNING",
  });
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ imported: number; failed: number } | null>(null);

  const [jobStatus, setJobStatus] = useState<"PENDING" | "RUNNING" | "DONE" | "FAILED">("PENDING");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [inviteSummary, setInviteSummary] = useState<InviteSummary | null>(null);
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  const loadInviteData = useCallback(async (jobId: string) => {
    try {
      setIsLoadingInvites(true);
      const response = await fetch(`/api/employees/import/${jobId}/invites`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible cargar las invitaciones.");
      }
      setInviteSummary(data.summary ?? null);
      setInviteRows(data.rows ?? []);
      return (data.summary ?? null) as InviteSummary | null;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cargar las invitaciones.");
      return null;
    } finally {
      setIsLoadingInvites(false);
    }
  }, []);

  const refreshJobData = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/employees/import/${jobId}?page=1&pageSize=50`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible recargar la importación.");
      }

      const jobData = data.job;
      const summary = {
        total: jobData?.totalRows ?? 0,
        ready: jobData?.readyRows ?? 0,
        error: jobData?.errorRows ?? 0,
        warning: jobData?.warningRows ?? 0,
      };

      setJob((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          summary,
          rows: data.rows ?? prev.rows,
          options: jobData?.options ?? prev.options,
        };
      });

      return jobData;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible recargar la importación.");
      return null;
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const toggleRowSelection = useCallback((rowId: string, checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  }, []);

  const toggleAllSelection = useCallback((rowIds: string[], checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        rowIds.forEach((id) => next.add(id));
      } else {
        rowIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  }, []);

  const shouldStopInvitePolling = useCallback((summary: InviteSummary | null, mode: "PENDING" | "FAILED" | "ALL") => {
    if (!summary) return false;
    if (mode === "FAILED") {
      return summary.failed === 0;
    }
    if (mode === "ALL") {
      return summary.pending === 0 && summary.failed === 0;
    }
    return summary.pending === 0;
  }, []);

  const pollInviteStatus = useCallback(
    async (jobId: string, mode: "PENDING" | "FAILED" | "ALL", attempt = 0) => {
      const maxAttempts = 12;
      if (attempt >= maxAttempts) {
        setIsSendingInvites(false);
        return;
      }

      setTimeout(async () => {
        const summary = await loadInviteData(jobId);
        if (shouldStopInvitePolling(summary, mode)) {
          setIsSendingInvites(false);
          return;
        }
        await pollInviteStatus(jobId, mode, attempt + 1);
      }, 2000);
    },
    [loadInviteData, shouldStopInvitePolling],
  );

  const pollSimulationStatus = useCallback(
    async (jobId: string, attempt = 0) => {
      const maxAttempts = 20;
      if (attempt >= maxAttempts) {
        setIsSimulating(false);
        return;
      }

      setTimeout(async () => {
        try {
          const response = await fetch(`/api/employees/import/${jobId}`);
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error ?? "No fue posible validar la simulación.");
          }
          const jobData = data.job;
          if (jobData.status === "RUNNING") {
            await pollSimulationStatus(jobId, attempt + 1);
            return;
          }
          await refreshJobData(jobId);
          setIsSimulating(false);
          toast.success("Simulación completada.");
        } catch (error) {
          setIsSimulating(false);
          toast.error(error instanceof Error ? error.message : "No fue posible validar la simulación.");
        }
      }, 2000);
    },
    [refreshJobData],
  );

  // Polling para verificar el estado del job
  const checkJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/employees/import/${jobId}`);
        if (!response.ok) return;

        const data = await response.json();
        // La respuesta de la API envuelve los datos del job en la propiedad "job"
        const jobData = data.job;

        if (jobData.status === "DONE" || jobData.status === "FAILED") {
          setJobStatus(jobData.status);
          setConfirmResult({
            imported: jobData.importedRows ?? 0,
            failed: jobData.failedRows ?? 0,
          });
          setIsConfirming(false); // Detener el spinner del botón
          if (jobData.status === "DONE") {
            await loadInviteData(jobId);
          }
        } else {
          // Si sigue en progreso, volver a consultar en 2 segundos
          setTimeout(() => checkJobStatus(jobId), 2000);
        }
      } catch (error) {
        console.error("Error checking job status:", error);
      }
    },
    [loadInviteData],
  );

  const handleTemplateDownload = useCallback((format: "xlsx" | "csv") => {
    const url = `/api/employees/import/template?format=${format}`;
    window.open(url, "_blank", "noopener");
  }, []);

  const handleValidate = async () => {
    if (!file) {
      toast.error("Selecciona un archivo para continuar.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("options", JSON.stringify(options));

    try {
      setIsUploading(true);
      const response = await fetch("/api/employees/import/validate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible validar el archivo.");
      }

      setJob(data);
      setCurrentStep(2);
      setSelectedRowIds(new Set());
      toast.success("Archivo validado. Revisa las filas antes de confirmar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible validar el archivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipToggle = async (row: ImportRow, status: "SKIPPED" | "READY") => {
    if (!job) return;
    try {
      const response = await fetch(`/api/employees/import/${job.jobId}/rows/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "No se pudo actualizar la fila.");
      }

      setJob((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((current) =>
            current.id === row.id
              ? {
                  ...current,
                  status,
                }
              : current,
          ),
        };
      });
      setSelectedRowIds((prev) => {
        if (!prev.has(row.id)) return prev;
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la fila.");
    }
  };

  const handleBulkUpdate = async (status: "SKIPPED" | "READY") => {
    if (!job) return;

    const selectedRows = job.rows.filter((row) => selectedRowIds.has(row.id));
    const rowIds =
      status === "SKIPPED"
        ? selectedRows.filter((row) => row.status === "READY").map((row) => row.id)
        : selectedRows.filter((row) => row.status === "SKIPPED").map((row) => row.id);

    if (!rowIds.length) {
      toast.error("No hay filas seleccionadas para esta acción.");
      return;
    }

    try {
      setIsBulkUpdating(true);
      const response = await fetch(`/api/employees/import/${job.jobId}/rows/batch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIds, status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron actualizar las filas.");
      }

      await refreshJobData(job.jobId);
      clearSelection();
      toast.success("Filas actualizadas correctamente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron actualizar las filas.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleConfirm = async () => {
    if (!job) return;

    try {
      setIsConfirming(true);
      const response = await fetch(`/api/employees/import/${job.jobId}/confirm`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible ejecutar la importación.");
      }

      // Iniciar polling
      setCurrentStep(3);
      setJobStatus("RUNNING");
      setInviteSummary(null);
      setInviteRows([]);
      checkJobStatus(job.jobId);
      toast.success("Importación iniciada. Procesando en segundo plano...");
    } catch (error) {
      setIsConfirming(false);
      toast.error(error instanceof Error ? error.message : "No fue posible confirmar la importación.");
    }
  };

  const handleRollback = async () => {
    if (!job) return;

    try {
      setIsRollingBack(true);
      const response = await fetch(`/api/employees/import/${job.jobId}/rollback`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible revertir la importación.");
      }

      await refreshJobData(job.jobId);
      setCurrentStep(2);
      setJobStatus("PENDING");
      setConfirmResult(null);
      setInviteSummary(null);
      setInviteRows([]);
      setSelectedRowIds(new Set());
      toast.success("Importación revertida correctamente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible revertir la importación.");
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleSimulate = async () => {
    if (!job) return;

    try {
      setIsSimulating(true);
      const response = await fetch(`/api/employees/import/${job.jobId}/simulate`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible simular la importación.");
      }

      toast.success("Simulación en cola. Revisando resultados...");
      await pollSimulationStatus(job.jobId);
    } catch (error) {
      setIsSimulating(false);
      toast.error(error instanceof Error ? error.message : "No fue posible simular la importación.");
    }
  };

  const handleSendInvites = async (mode: "PENDING" | "FAILED" | "ALL") => {
    if (!job) return;

    try {
      setIsSendingInvites(true);
      const response = await fetch(`/api/employees/import/${job.jobId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible enviar las invitaciones.");
      }

      toast.success("Invitaciones en cola. Actualizando estado...");
      await pollInviteStatus(job.jobId, mode);
    } catch (error) {
      setIsSendingInvites(false);
      toast.error(error instanceof Error ? error.message : "No fue posible enviar las invitaciones.");
    }
  };

  const handleRefreshInvites = useCallback(() => {
    if (!job) return;
    void loadInviteData(job.jobId);
  }, [job, loadInviteData]);

  const steps = useMemo(
    () => [
      { title: "Archivo y opciones", complete: currentStep > 1 },
      { title: "Revisión de filas", complete: currentStep > 2 },
      { title: "Confirmación", complete: currentStep === 3 && jobStatus === "DONE" },
    ],
    [currentStep, jobStatus],
  );

  const selectedRows = useMemo(() => {
    if (!job) return [];
    return job.rows.filter((row) => selectedRowIds.has(row.id));
  }, [job, selectedRowIds]);

  const selectedReadyCount = selectedRows.filter((row) => row.status === "READY").length;
  const selectedSkippedCount = selectedRows.filter((row) => row.status === "SKIPPED").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        {steps.map((step, index) => (
          <div key={step.title} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium",
                currentStep === index + 1 && "bg-primary text-primary-foreground border-primary",
                step.complete && currentStep !== index + 1 && "border-emerald-600 bg-emerald-600 text-white",
              )}
            >
              {step.complete && currentStep !== index + 1 ? <ShieldCheck className="h-4 w-4" /> : index + 1}
            </div>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-muted-foreground text-xs">
                {index === 0 && "Sube el archivo y define las opciones"}
                {index === 1 && "Revisa errores o warnings antes de confirmar"}
                {index === 2 && "Confirma la importación y revisa el resultado"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {currentStep === 1 && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Descarga la plantilla oficial</CardTitle>
              <CardDescription>
                Incluye la hoja de catálogos con IDs válidos para horarios y departamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={() => handleTemplateDownload("xlsx")}>Descargar XLSX</Button>
              <Button variant="outline" onClick={() => handleTemplateDownload("csv")}>
                Descargar CSV
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Archivo</CardTitle>
                <CardDescription>Solo se admite un archivo por importación (máx. 500 filas).</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="import-file">Archivo XLSX / CSV</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Utiliza la plantilla oficial para mantener los encabezados exactos. El campo `schedule_template_id`
                    se obtiene desde la URL o el menú “Copiar ID” del horario, y puedes usar correos con <code>+</code>{" "}
                    (alias corporativos) sin problema.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Modo de vacaciones</Label>
                  <Select
                    value={options.vacationMode}
                    onValueChange={(value) => setOptions((prev) => ({ ...prev, vacationMode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BALANCE">Saldo actual (introduce `pto_balance_days` o minutos)</SelectItem>
                      <SelectItem value="ANNUAL">Anualidad + consumidos (`pto_annual_*` + `pto_used_*`)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Solo rellena las columnas del modo elegido. En modo saldo basta con informar los días/minutos
                    disponibles hoy.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Enviar invitaciones automáticamente (opcional)</Label>
                  <RadioGroup
                    value={options.sendInvites ? "true" : "false"}
                    onValueChange={(value) => setOptions((prev) => ({ ...prev, sendInvites: value === "true" }))}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label
                      htmlFor="invites-yes"
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-3 text-sm",
                        options.sendInvites && "border-primary",
                      )}
                    >
                      <RadioGroupItem id="invites-yes" value="true" />
                      Sí, enviar invitación
                    </Label>
                    <Label
                      htmlFor="invites-no"
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-3 text-sm",
                        !options.sendInvites && "border-primary",
                      )}
                    >
                      <RadioGroupItem id="invites-no" value="false" />
                      No, las enviaré después
                    </Label>
                  </RadioGroup>
                  <p className="text-muted-foreground text-xs">
                    Recomendado: revisa el listado final y envía invitaciones desde el panel de invitaciones.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setJob(null);
                      setConfirmResult(null);
                      setInviteSummary(null);
                      setInviteRows([]);
                      setIsSimulating(false);
                      setSelectedRowIds(new Set());
                      setCurrentStep(1);
                    }}
                  >
                    Limpiar formulario
                  </Button>
                  <Button onClick={handleValidate} disabled={!file || isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Validar archivo
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ayuda rápida</CardTitle>
                <CardDescription>Explicado sin tecnicismos.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3 text-sm">
                <div className="border-primary/30 bg-primary/5 rounded-md border p-3">
                  <p className="text-primary font-medium">¿De dónde saco el horario?</p>
                  <p>
                    Entra en el horario y copia el ID que ves en la URL (todo lo que va después de /schedules/). También
                    puedes abrir el menú ⋯ y pulsar “Copiar ID”.
                  </p>
                </div>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="font-medium text-emerald-700">¿Y el saldo de vacaciones?</p>
                  <p>
                    <strong>Modo saldo:</strong> escribe cuántos días libres tiene hoy cada persona (ej: 23). Si
                    prefieres, puedes poner los minutos directamente.
                    <br />
                    <strong>Modo anual:</strong> rellena los días totales que le corresponden y los que ya gastó.
                    Nosotros calculamos el resto.
                  </p>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="font-medium text-amber-700">Correos con “+”</p>
                  <p>
                    Los emails tipo <code>miguel.perez+demo@empresa.com</code> funcionan perfecto. Es la misma bandeja,
                    solo lo usamos para distinguir a cada empleado.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Políticas de validación</CardTitle>
                <CardDescription>Define cómo tratamos departamentos o managers no encontrados.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Departamentos</Label>
                  <Select
                    value={options.departmentPolicy}
                    onValueChange={(value) => setOptions((prev) => ({ ...prev, departmentPolicy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona política" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REQUIRE_EXISTING">Obligatorio que existan</SelectItem>
                      <SelectItem value="ALLOW_MISSING_WARNING">Permitir, mostrar warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Managers</Label>
                  <Select
                    value={options.managerPolicy}
                    onValueChange={(value) => setOptions((prev) => ({ ...prev, managerPolicy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona política" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALLOW_MISSING_WARNING">Permitir warning</SelectItem>
                      <SelectItem value="ERROR_IF_MISSING">Obligatorio que existan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-muted-foreground text-xs">
                  Los managers deben existir como empleados en la organización (por email). Si seleccionas “Permitir
                  warning”, la fila se importará aunque no se encuentre el manager.
                </p>
                <p className="text-muted-foreground text-sm">
                  Estas políticas solo afectan a la validación. En la confirmación se aplicarán los mismos criterios que
                  definas aquí.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {currentStep === 2 && job && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="Filas totales" value={job.summary.total} />
            <SummaryCard label="Listas para importar" value={job.summary.ready} variant="success" />
            <SummaryCard label="Errores" value={job.summary.error} variant="error" />
            <SummaryCard label="Warnings" value={job.summary.warning} variant="warning" />
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Vista previa de filas</CardTitle>
                <CardDescription>
                  Solo se muestran las primeras 50 filas. Puedes simular antes de confirmar para no dar altas reales.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCurrentStep(1);
                  }}
                >
                  Volver al paso anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/employees/import/${job.jobId}/report`, "_blank")}
                >
                  Descargar reporte
                </Button>
                <Button variant="outline" onClick={handleSimulate} disabled={isSimulating || isConfirming}>
                  {isSimulating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Simulando...
                    </>
                  ) : (
                    "Simular importación"
                  )}
                </Button>
                <Button onClick={handleConfirm} disabled={isConfirming || isSimulating}>
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Confirmar importación
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <p className="text-muted-foreground text-xs">
                  Seleccionadas: <span className="text-foreground font-medium">{selectedRowIds.size}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkUpdate("SKIPPED")}
                    disabled={isBulkUpdating || selectedReadyCount === 0}
                  >
                    Omitir seleccionadas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkUpdate("READY")}
                    disabled={isBulkUpdating || selectedSkippedCount === 0}
                  >
                    Reactivar seleccionadas
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection} disabled={selectedRowIds.size === 0}>
                    Limpiar selección
                  </Button>
                </div>
              </div>
              <Tabs defaultValue="all" className="flex flex-col gap-4">
                <TabsList className="w-fit">
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="ready">Listas</TabsTrigger>
                  <TabsTrigger value="error">Errores</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <RowsTable
                    rows={job.rows}
                    onSkipToggle={handleSkipToggle}
                    selectedRowIds={selectedRowIds}
                    onSelectRow={toggleRowSelection}
                    onSelectAll={toggleAllSelection}
                  />
                </TabsContent>
                <TabsContent value="ready">
                  <RowsTable
                    rows={job.rows.filter((row) => row.status === "READY")}
                    onSkipToggle={handleSkipToggle}
                    selectedRowIds={selectedRowIds}
                    onSelectRow={toggleRowSelection}
                    onSelectAll={toggleAllSelection}
                  />
                </TabsContent>
                <TabsContent value="error">
                  <RowsTable
                    rows={job.rows.filter((row) => row.status === "ERROR")}
                    onSkipToggle={handleSkipToggle}
                    selectedRowIds={selectedRowIds}
                    onSelectRow={toggleRowSelection}
                    onSelectAll={toggleAllSelection}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === 3 && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{jobStatus === "RUNNING" ? "Procesando importación..." : "Resumen de importación"}</CardTitle>
              <CardDescription>
                {jobStatus === "RUNNING"
                  ? "Estamos creando los empleados. Por favor espera."
                  : "Consulta los resultados y gestiona las invitaciones cuando quieras."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {jobStatus === "RUNNING" ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="text-primary h-12 w-12 animate-spin" />
                  <p className="text-muted-foreground mt-4 text-sm">Esto puede tardar unos segundos...</p>
                </div>
              ) : confirmResult ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SummaryCard label="Empleados creados" value={confirmResult.imported} variant="success" />
                    <SummaryCard label="Filas con error" value={confirmResult.failed} variant="error" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => window.open(`/api/employees/import/${job?.jobId}/report`, "_blank")}>
                      Descargar reporte de errores
                    </Button>
                    <Button variant="outline" onClick={() => window.open("/dashboard/employees", "_blank")}>
                      Ir al listado de empleados
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isRollingBack}>
                          {isRollingBack ? "Revirtiendo..." : "Revertir importación"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Revertir esta importación?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminarán los empleados creados por este lote y la importación volverá al estado de
                            revisión. Solo es posible si no hay actividad (fichajes, ausencias, gastos, documentos,
                            etc.).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 text-white"
                            onClick={handleRollback}
                          >
                            Sí, revertir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setJob(null);
                        setConfirmResult(null);
                        setFile(null);
                        setCurrentStep(1);
                        setJobStatus("PENDING");
                        setInviteSummary(null);
                        setInviteRows([]);
                        setIsSimulating(false);
                        setSelectedRowIds(new Set());
                      }}
                    >
                      Iniciar nueva importación
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {jobStatus === "DONE" && job && (
            <Card>
              <CardHeader>
                <CardTitle>Invitaciones a empleados</CardTitle>
                <CardDescription>
                  Revisa quién quedó listo tras la importación y envía las invitaciones cuando lo decidas.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {isLoadingInvites ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando invitaciones...
                  </div>
                ) : inviteSummary ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <SummaryCard label="Pendientes" value={inviteSummary.pending} variant="warning" />
                      <SummaryCard label="Enviadas" value={inviteSummary.sent} variant="success" />
                      <SummaryCard label="Fallidas" value={inviteSummary.failed} variant="error" />
                      <SummaryCard label="No aplica" value={inviteSummary.notApplicable} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={() => handleSendInvites("PENDING")}
                        disabled={isSendingInvites || inviteSummary.pending === 0}
                      >
                        {isSendingInvites ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Enviar pendientes"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSendInvites("FAILED")}
                        disabled={isSendingInvites || inviteSummary.failed === 0}
                      >
                        Reintentar fallidas
                      </Button>
                      <Button variant="ghost" onClick={handleRefreshInvites} disabled={isSendingInvites}>
                        Actualizar estado
                      </Button>
                    </div>
                    <InviteRowsTable rows={inviteRows} />
                  </>
                ) : (
                  <EmptyState
                    icon={<ShieldAlert className="text-muted-foreground mx-auto h-12 w-12" />}
                    title="Sin datos de invitaciones"
                    description="No se han cargado aún las invitaciones para este lote."
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function RowsTable({
  rows,
  onSkipToggle,
  selectedRowIds,
  onSelectRow,
  onSelectAll,
}: {
  rows: ImportRow[];
  onSkipToggle: (row: ImportRow, status: "SKIPPED" | "READY") => void;
  selectedRowIds: Set<string>;
  onSelectRow: (rowId: string, checked: boolean) => void;
  onSelectAll: (rowIds: string[], checked: boolean) => void;
}) {
  if (!rows.length) {
    return <p className="text-muted-foreground text-sm">No hay filas para mostrar.</p>;
  }

  const selectableRowIds = rows
    .filter((row) => row.status === "READY" || row.status === "SKIPPED")
    .map((row) => row.id);
  const selectedCount = selectableRowIds.filter((id) => selectedRowIds.has(id)).length;
  const allSelected = selectableRowIds.length > 0 && selectedCount === selectableRowIds.length;
  const someSelected = selectedCount > 0 && selectedCount < selectableRowIds.length;

  return (
    <ScrollArea className="h-[420px] rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(value) => onSelectAll(selectableRowIds, value === true)}
                aria-label="Seleccionar todas las filas"
              />
            </th>
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Nombre</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Horario</th>
            <th className="px-4 py-2 font-medium">Vacaciones</th>
            <th className="px-4 py-2 font-medium">Estado</th>
            <th className="px-4 py-2 font-medium">Mensajes</th>
            <th className="px-4 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.id}-${index}`} className="border-b last:border-b-0">
              <td className="px-4 py-2">
                <Checkbox
                  checked={selectedRowIds.has(row.id)}
                  disabled={!(row.status === "READY" || row.status === "SKIPPED")}
                  onCheckedChange={(value) => onSelectRow(row.id, value === true)}
                  aria-label={`Seleccionar fila ${row.rowIndex}`}
                />
              </td>
              {(() => {
                const source = row.rawData ?? row.data ?? {};
                const fullName =
                  `${source.firstName ?? source.first_name ?? "—"} ${source.lastName ?? source.last_name ?? ""} ${source.secondLastName ?? source.second_last_name ?? ""}`.trim();
                const email = source.email ?? "—";
                const scheduleId = source.scheduleTemplateId ?? "—";
                const balanceDays = source.ptoBalanceDays ?? source.pto_balance_days;
                const balanceMinutes = source.ptoBalanceMinutes ?? source.pto_balance_minutes;
                const annualDays = source.ptoAnnualDays ?? source.pto_annual_days;
                const usedDays = source.ptoUsedDays ?? source.pto_used_days;

                let vacationInfo = "—";
                if (balanceDays || balanceMinutes) {
                  vacationInfo = balanceDays ? `${balanceDays} días` : `${balanceMinutes} min`;
                } else if (annualDays) {
                  const used = usedDays ?? 0;
                  vacationInfo = `${annualDays} días (usados ${used})`;
                }

                return (
                  <>
                    <td className="px-4 py-2">{row.rowIndex}</td>
                    <td className="px-4 py-2 font-medium">{fullName}</td>
                    <td className="px-4 py-2">{email}</td>
                    <td className="text-muted-foreground px-4 py-2 text-xs">{scheduleId}</td>
                    <td className="text-muted-foreground px-4 py-2 text-xs">{vacationInfo}</td>
                  </>
                );
              })()}
              <td className="px-4 py-2">
                <Badge
                  variant={
                    row.status === "READY"
                      ? "success"
                      : row.status === "ERROR" || row.status === "FAILED"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {row.status}
                </Badge>
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-col gap-1 text-xs">
                  {row.messages?.map((message, idx) => (
                    <div
                      key={`${idx}-${message.message}`}
                      className={cn(
                        "flex items-center gap-1 rounded border px-2 py-1",
                        message.type === "ERROR" && "border-destructive/30 text-destructive",
                        message.type === "WARNING" && "border-amber-400/40 text-amber-500",
                        message.type === "SUCCESS" && "border-emerald-400/40 text-emerald-600",
                      )}
                    >
                      {message.type === "ERROR" ? (
                        <XCircle className="h-3 w-3" />
                      ) : message.type === "WARNING" ? (
                        <ShieldAlert className="h-3 w-3" />
                      ) : (
                        <ShieldCheck className="h-3 w-3" />
                      )}
                      {message.message}
                    </div>
                  ))}
                  {row.errorReason && (
                    <div className="border-destructive/40 text-destructive flex items-center gap-1 rounded border px-2 py-1">
                      <XCircle className="h-3 w-3" />
                      {row.errorReason}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-right">
                {row.status === "READY" ? (
                  <Button size="sm" variant="outline" onClick={() => onSkipToggle(row, "SKIPPED")}>
                    Omitir
                  </Button>
                ) : row.status === "SKIPPED" ? (
                  <Button size="sm" onClick={() => onSkipToggle(row, "READY")}>
                    Reactivar
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

function InviteRowsTable({ rows }: { rows: InviteRow[] }) {
  if (!rows.length) {
    return <p className="text-muted-foreground text-sm">No hay filas para mostrar.</p>;
  }

  return (
    <ScrollArea className="h-[420px] rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Nombre</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Importación</th>
            <th className="px-4 py-2 font-medium">Invitación</th>
            <th className="px-4 py-2 font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const inviteLabel =
              row.inviteStatus === "SENT"
                ? "Enviada"
                : row.inviteStatus === "FAILED"
                  ? "Fallida"
                  : row.inviteStatus === "NOT_APPLICABLE"
                    ? "No aplica"
                    : "Pendiente";

            const inviteVariant =
              row.inviteStatus === "SENT"
                ? "success"
                : row.inviteStatus === "FAILED"
                  ? "destructive"
                  : row.inviteStatus === "NOT_APPLICABLE"
                    ? "secondary"
                    : "warning";

            const importVariant =
              row.status === "IMPORTED"
                ? "success"
                : row.status === "FAILED" || row.status === "ERROR"
                  ? "destructive"
                  : row.status === "SKIPPED"
                    ? "secondary"
                    : "warning";

            return (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className="px-4 py-2">{row.rowIndex}</td>
                <td className="px-4 py-2 font-medium">{row.fullName}</td>
                <td className="px-4 py-2">{row.email ?? "—"}</td>
                <td className="px-4 py-2">
                  <Badge variant={importVariant}>{row.status}</Badge>
                </td>
                <td className="px-4 py-2">
                  <Badge variant={inviteVariant}>{inviteLabel}</Badge>
                </td>
                <td className="text-muted-foreground px-4 py-2 text-xs">
                  {row.inviteMessage ?? row.errorReason ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollArea>
  );
}

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "success" | "error" | "warning";
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={cn("text-2xl font-semibold", {
          "text-emerald-600": variant === "success",
          "text-destructive": variant === "error",
          "text-amber-500": variant === "warning",
        })}
      >
        {value}
      </p>
    </div>
  );
}
