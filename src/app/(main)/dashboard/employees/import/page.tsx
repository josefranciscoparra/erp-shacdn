"use client";

import { useCallback, useMemo, useState } from "react";

import Link from "next/link";

import { ArrowLeft, Loader2, ShieldCheck, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  messages: { type: "ERROR" | "WARNING"; message: string }[];
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

export default function EmployeeImportPage() {
  return (
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
            Esta es la “chuleta” para RRHH: cada fila del archivo crea a una persona nueva. Sigue estos pasos y evitarás
            errores:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="text-muted-foreground list-decimal space-y-2 pl-4 text-sm">
            <li>
              Descarga la plantilla y copia los datos de tus empleados (nombre, email, NIF, etc.). Sin ella, el sistema
              no entiende nada.
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
            <li>
              Después revisa en la tabla de empleados que aparezcan y, si activaste las invitaciones, se les enviará un
              email automáticamente.
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
  );
}

function EmployeeImportWizard() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState({
    vacationMode: "BALANCE",
    sendInvites: true,
    departmentPolicy: "REQUIRE_EXISTING",
    managerPolicy: "ALLOW_MISSING_WARNING",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ imported: number; failed: number } | null>(null);

  const [jobStatus, setJobStatus] = useState<"PENDING" | "RUNNING" | "DONE" | "FAILED">("PENDING");

  // Polling para verificar el estado del job
  const checkJobStatus = useCallback(async (jobId: string) => {
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
      } else {
        // Si sigue en progreso, volver a consultar en 2 segundos
        setTimeout(() => checkJobStatus(jobId), 2000);
      }
    } catch (error) {
      console.error("Error checking job status:", error);
    }
  }, []);

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la fila.");
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
      checkJobStatus(job.jobId);
      toast.success("Importación iniciada. Procesando en segundo plano...");
    } catch (error) {
      setIsConfirming(false);
      toast.error(error instanceof Error ? error.message : "No fue posible confirmar la importación.");
    }
  };

  const steps = useMemo(
    () => [
      { title: "Archivo y opciones", complete: currentStep > 1 },
      { title: "Revisión de filas", complete: currentStep > 2 },
      { title: "Confirmación", complete: currentStep === 3 && jobStatus === "DONE" },
    ],
    [currentStep, jobStatus],
  );

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
                  <Label>Enviar invitaciones automáticamente</Label>
                  <RadioGroup
                    value={options.sendInvites ? "true" : "false"}
                    onValueChange={(value) => setOptions((prev) => ({ ...prev, sendInvites: value === "true" }))}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label
                      htmlFor="invites-yes"
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-3 text-sm",
                        options.sendInvites === "true" && "border-primary",
                      )}
                    >
                      <RadioGroupItem id="invites-yes" value="true" />
                      Sí, enviar invitación
                    </Label>
                    <Label
                      htmlFor="invites-no"
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-3 text-sm",
                        options.sendInvites === "false" && "border-primary",
                      )}
                    >
                      <RadioGroupItem id="invites-no" value="false" />
                      No, las enviaré después
                    </Label>
                  </RadioGroup>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setJob(null);
                      setConfirmResult(null);
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
                  Solo se muestran las primeras 50 filas. Podrás descargar el detalle completo tras confirmar.
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
                <Button onClick={handleConfirm} disabled={isConfirming}>
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
              <Tabs defaultValue="all" className="flex flex-col gap-4">
                <TabsList className="w-fit">
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="ready">Listas</TabsTrigger>
                  <TabsTrigger value="error">Errores</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <RowsTable rows={job.rows} onSkipToggle={handleSkipToggle} />
                </TabsContent>
                <TabsContent value="ready">
                  <RowsTable rows={job.rows.filter((row) => row.status === "READY")} onSkipToggle={handleSkipToggle} />
                </TabsContent>
                <TabsContent value="error">
                  <RowsTable rows={job.rows.filter((row) => row.status === "ERROR")} onSkipToggle={handleSkipToggle} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{jobStatus === "RUNNING" ? "Procesando importación..." : "Resumen de importación"}</CardTitle>
            <CardDescription>
              {jobStatus === "RUNNING"
                ? "Estamos creando los empleados y enviando invitaciones. Por favor espera."
                : "Consulta los resultados y descarga el reporte de errores si es necesario."}
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
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setJob(null);
                      setConfirmResult(null);
                      setFile(null);
                      setCurrentStep(1);
                      setJobStatus("PENDING");
                    }}
                  >
                    Iniciar nueva importación
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RowsTable({
  rows,
  onSkipToggle,
}: {
  rows: ImportRow[];
  onSkipToggle: (row: ImportRow, status: "SKIPPED" | "READY") => void;
}) {
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
              {(() => {
                const source = row.rawData ?? row.data ?? {};
                const fullName = `${source.firstName ?? "—"} ${source.lastName ?? ""}`.trim();
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
                        message.type === "ERROR"
                          ? "border-destructive/30 text-destructive"
                          : "border-amber-400/40 text-amber-500",
                      )}
                    >
                      {message.type === "ERROR" ? <XCircle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
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
