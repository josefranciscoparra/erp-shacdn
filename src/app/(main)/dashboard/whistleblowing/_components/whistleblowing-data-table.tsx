"use client";

import { useRouter } from "next/navigation";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, ExternalLink, User, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WhistleblowingReportSummary } from "@/server/actions/whistleblowing";

interface WhistleblowingDataTableProps {
  reports: WhistleblowingReportSummary[];
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SUBMITTED: { label: "Pendiente", variant: "default" },
  IN_REVIEW: { label: "En investigación", variant: "secondary" },
  RESOLVED: { label: "Resuelta", variant: "outline" },
  CLOSED: { label: "Cerrada", variant: "outline" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: "Baja", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  MEDIUM: { label: "Media", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  HIGH: { label: "Alta", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  CRITICAL: { label: "Crítica", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const reporterTypeIcon: Record<string, typeof User> = {
  EMPLOYEE: User,
  EXTERNAL: ExternalLink,
  ANONYMOUS: UserX,
};

export function WhistleblowingDataTable({ reports }: WhistleblowingDataTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Código</TableHead>
            <TableHead>Título</TableHead>
            <TableHead className="w-[120px]">Categoría</TableHead>
            <TableHead className="w-[100px]">Tipo</TableHead>
            <TableHead className="w-[120px]">Estado</TableHead>
            <TableHead className="w-[100px]">Prioridad</TableHead>
            <TableHead className="w-[120px]">Fecha</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const status = statusConfig[report.status];
            const priority = priorityConfig[report.priority];
            const ReporterIcon = reporterTypeIcon[report.reporterType] ?? User;

            return (
              <TableRow
                key={report.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/dashboard/whistleblowing/${report.id}`)}
              >
                <TableCell className="font-mono text-sm">{report.trackingCode}</TableCell>
                <TableCell className="font-medium">{report.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{report.categoryName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <ReporterIcon className="text-muted-foreground h-4 w-4" />
                    <span className="text-muted-foreground text-sm">{report.reporterDisplayLabel}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priority.className}`}>
                    {priority.label}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(report.submittedAt), "dd MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
