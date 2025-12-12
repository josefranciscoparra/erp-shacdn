"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileSearch,
  Loader2,
  Plus,
  Search,
  Shield,
  XCircle,
} from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  checkAnonymousReportStatus,
  getMyWhistleblowingReports,
  type MyWhistleblowingReport,
} from "@/server/actions/whistleblowing";

const statusConfig = {
  SUBMITTED: {
    label: "Pendiente",
    icon: Clock,
    variant: "outline" as const,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
  },
  IN_REVIEW: {
    label: "En investigación",
    icon: FileSearch,
    variant: "secondary" as const,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
  },
  RESOLVED: {
    label: "Resuelta",
    icon: CheckCircle2,
    variant: "default" as const,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-900",
  },
  CLOSED: {
    label: "Cerrada",
    icon: XCircle,
    variant: "outline" as const,
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    border: "border-slate-200 dark:border-slate-800",
  },
};

const priorityConfig = {
  LOW: {
    label: "Baja",
    badge:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
  },
  MEDIUM: {
    label: "Media",
    badge:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900",
  },
  HIGH: {
    label: "Alta",
    badge:
      "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900",
  },
  CRITICAL: {
    label: "Crítica",
    badge: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
  },
};

type ReportStatus = "SUBMITTED" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

const ITEMS_PER_PAGE = 5;

export default function MyWhistleblowingPage() {
  const [reports, setReports] = useState<MyWhistleblowingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Estado para consulta por código
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<{
    status: ReportStatus;
    statusLabel: string;
  } | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc.total += 1;
        acc[report.status] = (acc[report.status] ?? 0) + 1;
        return acc;
      },
      {
        total: 0,
        SUBMITTED: 0,
      },
    );
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return report.title.toLowerCase().includes(query) || report.trackingCode.toLowerCase().includes(query);
    });
  }, [reports, search]);

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReports, currentPage]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setIsLoading(true);
    try {
      const result = await getMyWhistleblowingReports();
      if (result.success) {
        setReports(result.reports);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTrackingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingCode.trim() || !accessCode.trim()) return;

    setIsChecking(true);
    setTrackingError(null);
    setTrackingResult(null);

    try {
      const response = await checkAnonymousReportStatus(
        trackingCode.trim().toUpperCase(),
        accessCode.trim().toUpperCase(),
      );

      if (response.success && response.status) {
        setTrackingResult({
          status: response.status,
          statusLabel: response.statusLabel ?? statusConfig[response.status].label,
        });
      } else {
        setTrackingError(response.error ?? "No se pudo verificar el estado");
      }
    } catch {
      setTrackingError("Error de conexion. Intenta de nuevo.");
    } finally {
      setIsChecking(false);
    }
  }

  function resetTrackingForm() {
    setTrackingCode("");
    setAccessCode("");
    setTrackingResult(null);
    setTrackingError(null);
  }

  return (
    <div className="@container/main mx-auto max-w-5xl space-y-8 py-6">
      <SectionHeader
        title="Canal de Denuncias"
        description="Gestiona tus comunicaciones de forma segura, confidencial y anónima."
        actionLabel="Nueva denuncia"
        actionHref="/dashboard/me/whistleblowing/new"
        actionIcon={<Plus className="h-4 w-4" />}
      />

      {/* Mis denuncias */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 border-b pb-4 @lg/main:flex-row @lg/main:items-center @lg/main:justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Mis denuncias</p>
            <h2 className="text-lg font-semibold tracking-tight">Seguimiento personal</h2>
            {reports.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {statusCounts.total} expedientes totales • {statusCounts.SUBMITTED} pendientes
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 @lg/main:flex-row @lg/main:items-center">
            <Input
              placeholder="Buscar por título o código..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // Reset page on search
              }}
              className="w-full min-w-[240px]"
            />
          </div>
        </div>

        <div className="bg-card/70 flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
          <div className="mt-2">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8">
                <EmptyState
                  icon={<Shield className="text-muted-foreground/30 h-10 w-10" />}
                  title="No hay denuncias"
                  description="No se encontraron registros que coincidan con tu búsqueda."
                  action={
                    search ? (
                      <Button size="sm" variant="outline" onClick={() => setSearch("")}>
                        Limpiar búsqueda
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3">
                {paginatedReports.map((report) => {
                  const status = statusConfig[report.status];
                  const StatusIcon = status.icon;
                  const priority = priorityConfig[report.priority];

                  return (
                    <Link
                      key={report.id}
                      href={`/dashboard/me/whistleblowing/${report.id}`}
                      className="group bg-card/80 hover:border-primary/40 hover:bg-accent/40 relative flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-foreground group-hover:text-primary text-base font-semibold transition-colors">
                            {report.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`${status.bg} ${status.color} ${status.border} border px-2 py-0.5 font-medium`}
                          >
                            <StatusIcon className="mr-1 h-3.5 w-3.5" />
                            {status.label}
                          </Badge>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority.badge}`}>
                            {priority.label}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                          <span>{report.categoryName}</span>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="capitalize">
                            {format(new Date(report.submittedAt), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 border-t pt-4 md:border-l md:pt-0 md:pl-4">
                        <div className="flex flex-col text-right">
                          <span className="text-muted-foreground text-[11px] tracking-wider uppercase">Código</span>
                          <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-sm">
                            {report.trackingCode}
                          </code>
                        </div>
                        <ChevronRight className="text-muted-foreground/30 group-hover:text-primary h-5 w-5 transition-all group-hover:translate-x-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredReports.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-muted-foreground text-xs">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consultar estado por codigo (Moved to bottom) */}
      <Collapsible open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
        <Card className="border-dashed">
          <CollapsibleTrigger asChild>
            <CardHeader className="hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Seguimiento con código</CardTitle>
                    <CardDescription className="text-xs">
                      Consulta expedientes enviados de forma anónima o por terceros.
                    </CardDescription>
                  </div>
                </div>
                {isTrackingOpen ? (
                  <ChevronUp className="text-muted-foreground h-5 w-5" />
                ) : (
                  <ChevronDown className="text-muted-foreground h-5 w-5" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {trackingResult ? (
                <div className="space-y-4">
                  <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${statusConfig[trackingResult.status].bg}`}
                  >
                    {(() => {
                      const StatusIcon = statusConfig[trackingResult.status].icon;
                      return <StatusIcon className={`h-8 w-8 ${statusConfig[trackingResult.status].color}`} />;
                    })()}
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-muted-foreground text-sm">Codigo: {trackingCode.toUpperCase()}</p>
                    <p className={`mt-1 text-lg font-semibold ${statusConfig[trackingResult.status].color}`}>
                      {trackingResult.statusLabel}
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {trackingResult.status === "SUBMITTED" &&
                        "Tu denuncia ha sido recibida y esta pendiente de asignacion a un gestor."}
                      {trackingResult.status === "IN_REVIEW" &&
                        "Un gestor esta investigando los hechos descritos en tu denuncia."}
                      {trackingResult.status === "RESOLVED" &&
                        "La investigacion ha concluido y se ha tomado una resolucion."}
                      {trackingResult.status === "CLOSED" && "El expediente de esta denuncia ha sido cerrado."}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={resetTrackingForm}>
                    Consultar otra denuncia
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleTrackingSubmit} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="trackingCode">Codigo de seguimiento</Label>
                      <Input
                        id="trackingCode"
                        placeholder="WB-XXXXXXXX-XXXXX"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        className="font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accessCode">Codigo de acceso</Label>
                      <Input
                        id="accessCode"
                        placeholder="XXXXXXXX"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        className="font-mono uppercase"
                      />
                    </div>
                  </div>

                  {trackingError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                      {trackingError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    disabled={isChecking || !trackingCode || !accessCode}
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Consultar estado
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-slate-900/50">
        <p className="text-muted-foreground mx-auto max-w-3xl text-xs">
          Este canal cumple con la Ley 2/2023 y el Reglamento (UE) 2019/1937. Garantizamos la confidencialidad y la
          protección de datos personales conforme al RGPD.
        </p>
      </div>
    </div>
  );
}
