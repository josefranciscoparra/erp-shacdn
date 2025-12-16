"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileSearch,
  Loader2,
  Lock,
  MapPin,
  Shield,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WhistleblowingDocumentsSection } from "@/components/whistleblowing/documents-section";
import { getMyWhistleblowingReportDetail, type MyWhistleblowingReportDetail } from "@/server/actions/whistleblowing";

const statusConfig = {
  SUBMITTED: {
    label: "Pendiente",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
    description: "Tu denuncia ha sido recibida y esta pendiente de asignacion a un gestor.",
  },
  IN_REVIEW: {
    label: "En investigacion",
    icon: FileSearch,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
    description: "Un gestor esta investigando los hechos descritos en tu denuncia.",
  },
  RESOLVED: {
    label: "Resuelta",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-900",
    description: "La investigacion ha concluido y se ha tomado una resolucion.",
  },
  CLOSED: {
    label: "Cerrada",
    icon: XCircle,
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    border: "border-slate-200 dark:border-slate-800",
    description: "El expediente de esta denuncia ha sido cerrado.",
  },
};

const resolutionTypeLabels = {
  SUBSTANTIATED: "Fundada",
  UNSUBSTANTIATED: "No fundada",
  PARTIALLY_SUBSTANTIATED: "Parcialmente fundada",
  NO_ACTION: "Sin accion requerida",
};

const priorityConfig = {
  LOW: {
    label: "Baja",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
  },
  MEDIUM: {
    label: "Media",
    className:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900",
  },
  HIGH: {
    label: "Alta",
    className:
      "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900",
  },
  CRITICAL: {
    label: "Critica",
    className: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
  },
};

type ReportStatus = keyof typeof statusConfig;

const progressSteps: Array<{ id: ReportStatus; title: string; description: string }> = [
  {
    id: "SUBMITTED",
    title: "Recepcion del caso",
    description: "Tu denuncia ha sido recibida y registrada en el sistema.",
  },
  {
    id: "IN_REVIEW",
    title: "Investigacion en curso",
    description: "Un gestor de cumplimiento analiza los hechos y recopila evidencia.",
  },
  {
    id: "RESOLVED",
    title: "Resolucion emitida",
    description: "El equipo ha tomado una decision formal y documentada.",
  },
  {
    id: "CLOSED",
    title: "Expediente cerrado",
    description: "La denuncia ha sido archivada tras comunicar la resolucion.",
  },
];

export default function MyWhistleblowingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<MyWhistleblowingReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  async function loadReport() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyWhistleblowingReportDetail(reportId);
      if (result.success && result.report) {
        setReport(result.report);
      } else {
        setError(result.error ?? "No se pudo cargar la denuncia");
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
            <p className="text-muted-foreground mt-2 animate-pulse text-sm">Cargando denuncia...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Shield className="text-muted-foreground/30 mx-auto h-12 w-12" />
          <h3 className="mt-4 text-lg font-semibold">No se encontro la denuncia</h3>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          <Button className="mt-6" onClick={() => router.push("/dashboard/me/whistleblowing")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al listado
          </Button>
        </div>
      </div>
    );
  }

  const status = statusConfig[report.status as ReportStatus];
  const StatusIcon = status.icon;
  const priority = priorityConfig[report.priority];
  const currentStepIndex = Math.max(
    progressSteps.findIndex((step) => step.id === (report.status as ReportStatus)),
    0,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      {/* Header con boton volver */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/me/whistleblowing">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{report.title}</h1>
          <p className="text-muted-foreground text-sm">
            Codigo: <code className="bg-muted rounded px-1.5 py-0.5 font-mono">{report.trackingCode}</code>
          </p>
        </div>
      </div>

      {/* Tarjeta de estado */}
      <Card className={`${status.bg} ${status.border} border`}>
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${status.bg}`}>
            <StatusIcon className={`h-6 w-6 ${status.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-semibold ${status.color}`}>{status.label}</span>
              <Badge variant="secondary" className={`${status.bg} ${status.color} ${status.border} border`}>
                {report.categoryName}
              </Badge>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priority.className}`}>
                Prioridad {priority.label.toLowerCase()}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{status.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolucion del expediente</CardTitle>
          <CardDescription>Estado actual y siguientes hitos</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-6">
            {progressSteps.map((step, index) => {
              const StepIcon = statusConfig[step.id].icon;
              const isCompleted = index < currentStepIndex;
              const isActive = index === currentStepIndex;

              return (
                <li key={step.id} className="relative flex gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : isCompleted
                          ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                          : "border-muted bg-muted text-muted-foreground"
                    }`}
                  >
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-muted-foreground text-xs">{step.description}</p>
                  </div>
                  {index < progressSteps.length - 1 && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "19px",
                        top: "36px",
                        width: "2px",
                        height: "calc(100% - 20px)",
                        backgroundColor: isCompleted ? "#16a34a" : "#e2e8f0",
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Detalles de la denuncia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-emerald-600" />
            Detalles de la denuncia
          </CardTitle>
          <CardDescription>Informacion confidencial de tu comunicacion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Descripcion */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">Descripcion de los hechos</h4>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap">{report.description}</p>
            </div>
          </div>

          <Separator />

          {/* Metadatos */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Fecha del incidente
              </div>
              <p className="text-sm font-medium">
                {report.incidentDate
                  ? format(new Date(report.incidentDate), "d 'de' MMMM 'de' yyyy", { locale: es })
                  : "No especificada"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Lugar del incidente
              </div>
              <p className="text-sm font-medium">{report.incidentLocation ?? "No especificado"}</p>
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Fecha de envio
              </div>
              <p className="text-sm font-medium">
                {format(new Date(report.submittedAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <WhistleblowingDocumentsSection
        reportId={report.id}
        allowDelete={false}
        title="Documentos aportados"
        description="Adjunta evidencias complementarias (capturas, comunicaciones, contratos...) para reforzar tu denuncia."
        emptyMessage="Todavía no has subido documentación a este expediente."
      />

      {/* Resolucion (solo si existe) */}
      {(report.status === "RESOLVED" || report.status === "CLOSED") && report.resolution && (
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Resolucion
            </CardTitle>
            {report.resolutionType && (
              <Badge variant="outline" className="w-fit">
                {resolutionTypeLabels[report.resolutionType as keyof typeof resolutionTypeLabels]}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
              <p className="text-sm whitespace-pre-wrap">{report.resolution}</p>
            </div>
            {report.resolvedAt && (
              <p className="text-muted-foreground mt-3 text-xs">
                Resuelta el {format(new Date(report.resolvedAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Nota legal */}
      <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-900/50">
        <p className="text-muted-foreground text-xs">
          Esta informacion esta protegida por la Ley 2/2023 y el Reglamento (UE) 2019/1937. Tu identidad y los datos de
          esta comunicacion son confidenciales.
        </p>
      </div>
    </div>
  );
}
