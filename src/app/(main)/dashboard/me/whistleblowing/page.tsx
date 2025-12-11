"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, FileSearch, FileText, Loader2, Lock, Plus, Shield, UserX, XCircle } from "lucide-react";

import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyWhistleblowingReports, type MyWhistleblowingReport } from "@/server/actions/whistleblowing";

const statusConfig = {
  SUBMITTED: {
    label: "Pendiente",
    icon: Clock,
    variant: "outline" as const,
    color: "text-amber-600",
  },
  IN_REVIEW: {
    label: "En investigacion",
    icon: FileSearch,
    variant: "secondary" as const,
    color: "text-blue-600",
  },
  RESOLVED: {
    label: "Resuelta",
    icon: CheckCircle2,
    variant: "default" as const,
    color: "text-green-600",
  },
  CLOSED: {
    label: "Cerrada",
    icon: XCircle,
    variant: "outline" as const,
    color: "text-slate-600",
  },
};

export default function MyWhistleblowingPage() {
  const [reports, setReports] = useState<MyWhistleblowingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionHeader
        title="Canal de Denuncias"
        description="Presenta denuncias de forma confidencial y consulta su estado"
        icon={<Shield className="h-5 w-5" />}
      />

      {/* Informacion del canal */}
      <Card>
        <CardHeader>
          <CardTitle>Canal Interno de Informacion</CardTitle>
          <CardDescription>
            En cumplimiento de la Ley 2/2023, de 20 de febrero, reguladora de la proteccion de las personas que informen
            sobre infracciones normativas y de lucha contra la corrupcion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Caracteristicas */}
          <div className="grid gap-4 @lg/main:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Confidencialidad</p>
                <p className="text-muted-foreground text-xs">Tu identidad esta protegida por la ley</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <UserX className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Proteccion garantizada</p>
                <p className="text-muted-foreground text-xs">Garantizada proteccion contra represalias</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Cumplimiento legal</p>
                <p className="text-muted-foreground text-xs">Conforme a la normativa vigente</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900">
                <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Seguimiento</p>
                <p className="text-muted-foreground text-xs">Consulta el estado de tu denuncia</p>
              </div>
            </div>
          </div>

          {/* Boton nueva denuncia */}
          <div className="flex justify-center pt-2">
            <Button size="lg" asChild>
              <Link href="/dashboard/me/whistleblowing/new">
                <Plus className="mr-2 h-4 w-4" />
                Presentar una denuncia
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mis denuncias */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Mis denuncias</h2>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-12 w-12" />}
            title="No has enviado denuncias"
            description="Cuando presentes una denuncia, aparecera aqui para que puedas consultar su estado."
          />
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => {
              const status = statusConfig[report.status];
              const StatusIcon = status.icon;

              return (
                <Card key={report.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 @lg/main:flex-row @lg/main:items-center @lg/main:justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted rounded px-2 py-0.5 font-mono text-xs">{report.trackingCode}</code>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className={`h-3 w-3 ${status.color}`} />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="font-medium">{report.title}</p>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <span>{report.categoryName}</span>
                          <span>·</span>
                          <span>{format(new Date(report.submittedAt), "d MMM yyyy", { locale: es })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                          <p className="text-muted-foreground text-xs">Codigo de seguimiento</p>
                          <p className="font-mono text-sm font-bold">{report.trackingCode}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Nota legal */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-center text-xs">
            Este canal esta gestionado de acuerdo con la Ley 2/2023 y el Reglamento (UE) 2019/1937. Los datos personales
            se trataran conforme al RGPD y la LOPDGDD. La organizacion garantiza la proteccion del informante frente a
            cualquier tipo de represalia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
