"use client";

import { useEffect, useMemo, useState } from "react";

import { Database, HardDrive, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getStorageUsageSummary } from "@/server/actions/storage";

type CategoryStats = {
  category: string;
  label: string;
  bytes: number;
  documents: number;
  protectedDocuments: number;
  legalHoldDocuments: number;
};

type StorageSummary = {
  usedBytes: number;
  limitBytes: number;
  usagePercentage: number;
  categories: CategoryStats[];
  protectedDocuments: number;
  legalHoldDocuments: number;
  pendingDeletion: number;
  lastUpdated: string;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

export function StorageTab() {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true);
      try {
        const result = await getStorageUsageSummary();
        if (result.success) {
          setSummary(result.summary);
        } else {
          toast.error(result.error ?? "No se pudieron cargar las métricas");
        }
      } catch (error) {
        console.error("Error loading storage summary:", error);
        toast.error("Error al cargar las métricas de almacenamiento");
      } finally {
        setIsLoading(false);
      }
    };

    void loadSummary();
  }, []);

  const usagePercent = useMemo(() => {
    if (!summary) return 0;
    if (summary.limitBytes === 0) return 0;
    return Math.min(100, Math.round(summary.usagePercentage));
  }, [summary]);

  if (isLoading || !summary) {
    return (
      <div className="space-y-4">
        <Card className="rounded-lg border p-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>
        <Card className="rounded-lg border p-6">
          <Skeleton className="h-6 w-64" />
          <div className="mt-4 grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-muted/30 space-y-2 rounded-lg border p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Uso total</h3>
              <p className="text-muted-foreground text-sm">Cada archivo legal cuenta en el almacenamiento</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-semibold">{formatBytes(summary.usedBytes)}</p>
              <p className="text-muted-foreground">de {formatBytes(summary.limitBytes)}</p>
              <span className="text-muted-foreground ml-auto text-sm">{usagePercent}% usado</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-muted-foreground text-xs">
              Última actualización: {new Date(summary.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Uso por categoría</h3>
              <p className="text-muted-foreground text-sm">Distribución del storage por tipo de documento</p>
            </div>
          </div>

          <div className="grid gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
            {summary.categories.length === 0 && (
              <div className="bg-muted/30 text-muted-foreground col-span-full rounded-lg border p-6 text-center text-sm">
                Todavía no hay archivos registrados en el sistema de storage.
              </div>
            )}

            {summary.categories.map((category) => (
              <div key={category.category} className="bg-card rounded-lg border p-4 shadow-xs">
                <p className="text-sm font-medium">{category.label}</p>
                <p className="text-2xl font-semibold">{formatBytes(category.bytes)}</p>
                <p className="text-muted-foreground text-xs">{category.documents} documentos</p>
                {category.protectedDocuments > 0 && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {category.protectedDocuments} protegidos · {category.legalHoldDocuments} en legal hold
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="rounded-lg border p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-primary h-5 w-5" />
            <div>
              <h3 className="font-semibold">Transparencia legal</h3>
              <p className="text-muted-foreground text-sm">La obligación legal prevalece sobre el botón “Eliminar”</p>
            </div>
          </div>

          <div className="grid gap-4 @xl/main:grid-cols-3">
            <div className="bg-muted/30 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm font-medium">Documentos protegidos</p>
              <p className="text-2xl font-semibold">{summary.protectedDocuments}</p>
              <p className="text-muted-foreground text-xs">Retención vigente por normativa</p>
            </div>
            <div className="bg-muted/30 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm font-medium">Legal hold activo</p>
              <p className="text-2xl font-semibold">{summary.legalHoldDocuments}</p>
              <p className="text-muted-foreground text-xs">Auditorías, juicios o inspecciones</p>
            </div>
            <div className="bg-muted/30 rounded-lg border p-4">
              <p className="text-muted-foreground text-sm font-medium">Pendientes de purga</p>
              <p className="text-2xl font-semibold">{summary.pendingDeletion}</p>
              <p className="text-muted-foreground text-xs">Se eliminarán automáticamente al expirar</p>
            </div>
          </div>

          <p className="text-muted-foreground text-sm">
            Algunos documentos (nóminas, contratos, control horario, denuncias...) no se pueden eliminar hasta que la
            ley lo permita. Estos archivos seguirán contando en el almacenamiento y justifican los límites y planes
            superiores.
          </p>
        </div>
      </Card>
    </div>
  );
}
