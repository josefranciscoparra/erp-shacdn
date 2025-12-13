"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { FileText, Loader2, Plus, ShieldAlert, UserPlus } from "lucide-react";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { EmptyState } from "@/components/hr/empty-state";
import { SectionHeader } from "@/components/hr/section-header";
import { Button } from "@/components/ui/button";
import { getPayslipBatches, type PayslipBatchListItem } from "@/server/actions/payslips";

import { BatchList } from "./_components/batch-list";
import { SinglePayslipUploadDialog } from "./_components/single-payslip-upload-dialog";

export default function PayslipsPage() {
  const [batches, setBatches] = useState<PayslipBatchListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSingleUploadDialog, setShowSingleUploadDialog] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPayslipBatches();
      if (result.success && result.batches) {
        setBatches(result.batches);
      } else {
        setError(result.error ?? "Error desconocido");
      }
    } catch {
      setError("Error al cargar lotes de nóminas");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Nóminas" subtitle="Gestión de subida masiva de nóminas" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Cargando lotes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionHeader title="Nóminas" subtitle="Gestión de subida masiva de nóminas" />
        <div className="text-destructive flex items-center justify-center py-12">
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  const hasBatches = batches.length > 0;

  return (
    <PermissionGuard
      permission="manage_organization"
      fallback={
        <div className="@container/main mx-auto flex w-full max-w-[1600px] flex-col gap-8">
          <SectionHeader title="Nóminas" subtitle="Gestión de subida masiva de nóminas" />
          <EmptyState
            icon={<ShieldAlert className="text-destructive mx-auto h-12 w-12" />}
            title="Acceso denegado"
            description="No tienes permisos para gestionar nóminas"
          />
        </div>
      }
    >
      <div className="@container/main mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <SectionHeader
          title="Nóminas"
          subtitle="Gestión de subida masiva de nóminas"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSingleUploadDialog(true)} className="h-9">
                <UserPlus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Subir individual</span>
              </Button>
              <Button size="sm" asChild className="h-9">
                <Link href="/dashboard/payslips/upload">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Subir lote</span>
                </Link>
              </Button>
            </div>
          }
        />

        {hasBatches ? (
          <BatchList batches={batches} onRefresh={loadBatches} />
        ) : (
          <EmptyState
            icon={<FileText className="mx-auto h-12 w-12" />}
            title="No hay lotes de nóminas"
            description="Sube tu primer lote de nóminas para comenzar"
            actionLabel="Subir nóminas"
            actionHref="/dashboard/payslips/upload"
          />
        )}

        {/* Diálogo de subida individual */}
        <SinglePayslipUploadDialog
          open={showSingleUploadDialog}
          onOpenChange={setShowSingleUploadDialog}
          onSuccess={() => {
            loadBatches();
          }}
        />
      </div>
    </PermissionGuard>
  );
}
