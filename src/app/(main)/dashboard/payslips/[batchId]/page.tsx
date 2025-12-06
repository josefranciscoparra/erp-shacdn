"use client";

import { use, useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { getBatchWithItems, type PayslipBatchListItem, type PayslipUploadItemDetail } from "@/server/actions/payslips";

import { BatchSummary } from "../_components/batch-summary";
import { ReviewTable } from "../_components/review-table";

interface Props {
  params: Promise<{ batchId: string }>;
}

export default function PayslipBatchDetailPage({ params }: Props) {
  const { batchId } = use(params);
  const [batch, setBatch] = useState<PayslipBatchListItem | null>(null);
  const [items, setItems] = useState<PayslipUploadItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getBatchWithItems(batchId, {
        status: statusFilter,
        page,
        pageSize: 50,
      });
      if (result.success && result.batch && result.items) {
        setBatch(result.batch);
        setItems(result.items);
        setTotal(result.total ?? 0);
      } else {
        setError(result.error ?? "Error desconocido");
      }
    } catch {
      setError("Error al cargar el lote");
    } finally {
      setIsLoading(false);
    }
  }, [batchId, statusFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !batch) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Detalle del Lote" subtitle="Cargando..." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando lote...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title="Detalle del Lote"
          subtitle="Error"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/payslips">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
          }
        />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!batch) {
    return null;
  }

  return (
    <PermissionGuard
      permission="manage_organization"
      fallback={
        <div className="@container/main flex flex-col gap-4 md:gap-6">
          <SectionHeader title="Detalle del Lote" subtitle="Acceso denegado" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para gestionar nóminas"
          />
        </div>
      }
    >
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader
          title={batch.originalFileName}
          subtitle={`Lote de nóminas - ${batch.status}`}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/payslips">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a lotes
              </Link>
            </Button>
          }
        />

        <BatchSummary batch={batch} />

        <ReviewTable
          items={items}
          total={total}
          page={page}
          statusFilter={statusFilter}
          onStatusFilterChange={(status) => {
            setStatusFilter(status);
            setPage(1);
          }}
          onPageChange={setPage}
          onRefresh={loadData}
          isLoading={isLoading}
        />
      </div>
    </PermissionGuard>
  );
}
