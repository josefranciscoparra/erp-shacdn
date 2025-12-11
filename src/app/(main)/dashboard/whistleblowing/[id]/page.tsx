"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Shield,
  User,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";

import { SectionHeader } from "@/components/hr/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  getWhistleblowingReportDetail,
  updateReportStatus,
  updateReportPriority,
  type WhistleblowingReportDetail,
} from "@/server/actions/whistleblowing";

import { AssignManagerDialog } from "../_components/assign-manager-dialog";
import { InternalNoteDialog } from "../_components/internal-note-dialog";
import { ResolveReportDialog } from "../_components/resolve-report-dialog";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  SUBMITTED: { label: "Pendiente", variant: "default", icon: Clock },
  IN_REVIEW: { label: "En investigación", variant: "secondary", icon: AlertTriangle },
  RESOLVED: { label: "Resuelta", variant: "outline", icon: CheckCircle2 },
  CLOSED: { label: "Cerrada", variant: "outline", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: "Baja", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  MEDIUM: { label: "Media", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  HIGH: { label: "Alta", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  CRITICAL: { label: "Crítica", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const reporterTypeConfig: Record<string, { label: string; icon: typeof User }> = {
  EMPLOYEE: { label: "Empleado interno", icon: User },
  EXTERNAL: { label: "Externo", icon: ExternalLink },
  ANONYMOUS: { label: "Anónimo", icon: UserX },
};

const activityTypeLabels: Record<string, string> = {
  CREATED: "Denuncia creada",
  SUBMITTED: "Denuncia enviada",
  ASSIGNED: "Gestor asignado",
  STATUS_CHANGED: "Estado actualizado",
  PRIORITY_CHANGED: "Prioridad actualizada",
  DOCUMENT_ADDED: "Documento adjuntado",
  INTERNAL_NOTE: "Nota interna",
  RESOLVED: "Denuncia resuelta",
  CLOSED: "Denuncia cerrada",
};

export default function WhistleblowingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<WhistleblowingReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Diálogos
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  const reportId = params.id as string;

  useEffect(() => {
    loadReport();
  }, [reportId]);

  async function loadReport() {
    setIsLoading(true);
    try {
      const result = await getWhistleblowingReportDetail(reportId);
      if (result.success && result.report) {
        setReport(result.report);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(newStatus: "SUBMITTED" | "IN_REVIEW" | "RESOLVED" | "CLOSED") {
    if (!report) return;
    setIsUpdating(true);
    try {
      const result = await updateReportStatus(report.id, newStatus);
      if (result.success) {
        await loadReport();
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function handlePriorityChange(newPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") {
    if (!report) return;
    setIsUpdating(true);
    try {
      const result = await updateReportPriority(report.id, newPriority);
      if (result.success) {
        await loadReport();
      }
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="@container/main flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="@container/main flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertTriangle className="text-muted-foreground h-12 w-12" />
        <p className="text-muted-foreground">No se encontró la denuncia</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/whistleblowing">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[report.status];
  const priority = priorityConfig[report.priority];
  const reporterType = reporterTypeConfig[report.reporterType];
  const StatusIcon = status.icon;
  const ReporterIcon = reporterType.icon;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/dashboard/whistleblowing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al listado
          </Link>
        </Button>

        <div className="flex flex-col gap-4 @lg/main:flex-row @lg/main:items-start @lg/main:justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Shield className="text-primary h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{report.title}</h1>
                <Badge variant={status.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Código: <span className="font-mono">{report.trackingCode}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {report.status === "SUBMITTED" && (
              <Button onClick={() => handleStatusChange("IN_REVIEW")} disabled={isUpdating}>
                Iniciar investigación
              </Button>
            )}
            {report.status === "IN_REVIEW" && (
              <Button onClick={() => setShowResolveDialog(true)} disabled={isUpdating}>
                Resolver denuncia
              </Button>
            )}
            {(report.status === "SUBMITTED" || report.status === "IN_REVIEW") && (
              <Button variant="outline" onClick={() => setShowAssignDialog(true)} disabled={isUpdating}>
                <UserCheck className="mr-2 h-4 w-4" />
                Asignar
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowNoteDialog(true)} disabled={isUpdating}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Nota interna
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={isUpdating}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-muted-foreground text-xs" disabled>
                  Cambiar prioridad
                </DropdownMenuItem>
                {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((p) => (
                  <DropdownMenuItem key={p} onClick={() => handlePriorityChange(p)} disabled={report.priority === p}>
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${priorityConfig[p].className}`} />
                    {priorityConfig[p].label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {report.status === "RESOLVED" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("CLOSED")}>Cerrar denuncia</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid gap-4 @3xl/main:grid-cols-3">
        {/* Columna principal */}
        <div className="flex flex-col gap-4 @3xl/main:col-span-2">
          {/* Descripción */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descripción de los hechos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{report.description}</p>
            </CardContent>
          </Card>

          {/* Detalles del incidente */}
          {(report.incidentDate ?? report.incidentLocation) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalles del incidente</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6">
                {report.incidentDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">Fecha del incidente</p>
                      <p className="text-sm font-medium">
                        {format(new Date(report.incidentDate), "PPP", { locale: es })}
                      </p>
                    </div>
                  </div>
                )}
                {report.incidentLocation && (
                  <div className="flex items-center gap-2">
                    <MapPin className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-muted-foreground text-xs">Lugar</p>
                      <p className="text-sm font-medium">{report.incidentLocation}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Personas implicadas */}
          {report.involvedParties && report.involvedParties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personas implicadas</CardTitle>
                <CardDescription>Información confidencial - solo visible para gestores</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {report.involvedParties.map((party, index) => (
                    <li key={index} className="text-sm">
                      • {party}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Resolución */}
          {report.resolution && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resolución</CardTitle>
                <CardDescription>
                  {report.resolvedAt && `Resuelta el ${format(new Date(report.resolvedAt), "PPP", { locale: es })}`}
                  {report.resolvedBy && ` por ${report.resolvedBy.name}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{report.resolution}</p>
              </CardContent>
            </Card>
          )}

          {/* Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentos adjuntos</CardTitle>
              <CardDescription>
                {report.documents.length} documento{report.documents.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.documents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay documentos adjuntos</p>
              ) : (
                <ul className="space-y-2">
                  {report.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2 rounded-md border p-2">
                      <FileText className="text-muted-foreground h-4 w-4" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{doc.fileName}</p>
                        <p className="text-muted-foreground text-xs">
                          {(doc.fileSize / 1024).toFixed(1)} KB • {format(new Date(doc.uploadedAt), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Timeline de actividad */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.activities.map((activity, index) => (
                  <div key={activity.id} className="relative flex gap-4">
                    {index < report.activities.length - 1 && (
                      <div className="bg-border absolute top-6 left-[11px] h-[calc(100%+8px)] w-px" />
                    )}
                    <div className="bg-muted relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                      {activity.type === "INTERNAL_NOTE" ? (
                        <MessageSquare className="h-3 w-3" />
                      ) : activity.type === "STATUS_CHANGED" ? (
                        <Clock className="h-3 w-3" />
                      ) : activity.type === "ASSIGNED" ? (
                        <UserCheck className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{activityTypeLabels[activity.type] ?? activity.type}</p>
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(activity.performedAt), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-muted-foreground mt-1 text-sm">{activity.description}</p>
                      )}
                      {activity.performedBy && (
                        <p className="text-muted-foreground mt-1 text-xs">Por: {activity.performedBy.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Info del denunciante */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información del denunciante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                  <ReporterIcon className="text-muted-foreground h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{report.reporterDisplayLabel ?? reporterType.label}</p>
                  <p className="text-muted-foreground text-xs">{reporterType.label}</p>
                </div>
              </div>

              {report.employee && (
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">Empleado asociado</p>
                  <p className="text-sm font-medium">
                    {report.employee.firstName} {report.employee.lastName}
                  </p>
                </div>
              )}

              {report.reporterMetadata && Object.keys(report.reporterMetadata).length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">Datos de contacto (confidencial)</p>
                  {Object.entries(report.reporterMetadata).map(([key, value]) => (
                    <div key={key} className="rounded-md border p-2">
                      <p className="text-muted-foreground text-xs capitalize">{key}</p>
                      <p className="text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs">Categoría</p>
                <p className="text-sm font-medium">{report.category.name}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs">Prioridad</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priority.className}`}>
                  {priority.label}
                </span>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs">Fecha de envío</p>
                <p className="text-sm font-medium">{format(new Date(report.submittedAt), "PPP", { locale: es })}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs">Gestor asignado</p>
                {report.assignedTo ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={report.assignedTo.image ?? undefined} />
                      <AvatarFallback>{report.assignedTo.name?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{report.assignedTo.name}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin asignar</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogos */}
      <AssignManagerDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        reportId={report.id}
        currentAssigneeId={report.assignedTo?.id}
        onSuccess={loadReport}
      />
      <InternalNoteDialog
        open={showNoteDialog}
        onOpenChange={setShowNoteDialog}
        reportId={report.id}
        onSuccess={loadReport}
      />
      <ResolveReportDialog
        open={showResolveDialog}
        onOpenChange={setShowResolveDialog}
        reportId={report.id}
        onSuccess={loadReport}
      />
    </div>
  );
}
