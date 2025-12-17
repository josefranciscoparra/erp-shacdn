"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Users, HardDrive, TrendingUp, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/validations/document";
import { useDocumentsStore, useGlobalDocumentStats } from "@/stores/documents-store";

export function DocumentStatsCards() {
  const stats = useGlobalDocumentStats();
  const { fetchAllDocuments, isLoadingGlobal } = useDocumentsStore();

  const handleRefresh = () => {
    fetchAllDocuments({ refresh: true });
  };

  // Usar límite real de la organización
  const storageLimit = stats.storageLimit;
  const hasStorageLimit = storageLimit > 0;

  // Calcular uso total incluyendo reservas (uploads en progreso)
  const totalUsage = stats.totalSize + stats.storageReserved;
  const storagePercentage = hasStorageLimit ? Math.min((totalUsage / storageLimit) * 100, 100) : 0;
  const usedPercentage = hasStorageLimit ? Math.min((stats.totalSize / storageLimit) * 100, 100) : 0;

  // Generar descripción del espacio
  const getStorageDescription = () => {
    if (!hasStorageLimit) {
      return "Sin límite configurado";
    }

    const baseDesc = `${storagePercentage.toFixed(1)}% de ${formatFileSize(storageLimit)}`;

    if (stats.storageReserved > 0) {
      return `${baseDesc} (+${formatFileSize(stats.storageReserved)} reservado)`;
    }

    return baseDesc;
  };

  const cards = [
    {
      title: "Total Documentos",
      value: stats.total.toLocaleString(),
      description: `${stats.currentPage} en esta página`,
      icon: FileText,
      iconStyles:
        "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-400",
    },
    {
      title: "Empleados",
      value: stats.uniqueEmployees.toLocaleString(),
      description: "Con documentos",
      icon: Users,
      iconStyles:
        "bg-green-50 border-green-200 text-green-600 dark:bg-green-950/50 dark:border-green-900 dark:text-green-400",
    },
    {
      title: "Espacio Usado",
      value: formatFileSize(stats.totalSize),
      description: getStorageDescription(),
      icon: HardDrive,
      iconStyles:
        "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-950/50 dark:border-purple-900 dark:text-purple-400",
      showProgress: hasStorageLimit,
      progressValue: usedPercentage,
      showReserved: stats.storageReserved > 0,
      reservedPercentage: hasStorageLimit ? (stats.storageReserved / storageLimit) * 100 : 0,
    },
    {
      title: "Último Subido",
      value: stats.lastUploaded ? format(new Date(stats.lastUploaded.createdAt), "dd/MM/yyyy", { locale: es }) : "N/A",
      description: stats.lastUploaded
        ? format(new Date(stats.lastUploaded.createdAt), "HH:mm", { locale: es })
        : "Sin documentos",
      icon: TrendingUp,
      iconStyles:
        "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/50 dark:border-orange-900 dark:text-orange-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resumen</h3>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoadingGlobal} className="gap-2">
          <RefreshCw className={cn("size-4", isLoadingGlobal && "animate-spin")} />
          {isLoadingGlobal ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  {card.title}
                  {card.showReserved && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      En procesamiento
                    </Badge>
                  )}
                </CardDescription>
                <div className="flex flex-col gap-2">
                  <h4 className="font-display text-2xl lg:text-3xl">{card.value}</h4>
                  <div className="text-muted-foreground flex flex-col gap-1.5 text-sm">
                    <span>{card.description}</span>
                    {card.showProgress && (
                      <div className="bg-primary/20 relative h-1.5 w-full overflow-hidden rounded-full">
                        {/* Barra de uso actual */}
                        <div
                          className="bg-primary absolute inset-y-0 left-0 transition-all"
                          style={{ width: `${card.progressValue}%` }}
                        />
                        {/* Barra de reservas (si hay) */}
                        {card.showReserved && card.reservedPercentage > 0 && (
                          <div
                            className="absolute inset-y-0 bg-amber-500/70 transition-all"
                            style={{
                              left: `${card.progressValue}%`,
                              width: `${Math.min(card.reservedPercentage, 100 - card.progressValue)}%`,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <CardAction>
                  <div className="flex gap-4">
                    <div
                      className={cn("flex size-12 items-center justify-center rounded-full border", card.iconStyles)}
                    >
                      <Icon className="size-5" />
                    </div>
                  </div>
                </CardAction>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
