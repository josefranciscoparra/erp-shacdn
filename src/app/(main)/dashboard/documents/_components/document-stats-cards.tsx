"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Users,
  HardDrive,
  TrendingUp,
} from "lucide-react";
import { useGlobalDocumentStats } from "@/stores/documents-store";
import { formatFileSize } from "@/lib/validations/document";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function DocumentStatsCards() {
  const stats = useGlobalDocumentStats();

  const cards = [
    {
      title: "Total Documentos",
      value: stats.total.toLocaleString(),
      description: `${stats.currentPage} en esta página`,
      icon: FileText,
      gradient: "from-blue-500/5 to-card",
      iconColor: "text-blue-600",
    },
    {
      title: "Empleados",
      value: stats.uniqueEmployees.toLocaleString(),
      description: "Con documentos",
      icon: Users,
      gradient: "from-green-500/5 to-card",
      iconColor: "text-green-600",
    },
    {
      title: "Espacio Usado",
      value: formatFileSize(stats.totalSize),
      description: "En almacenamiento",
      icon: HardDrive,
      gradient: "from-purple-500/5 to-card",
      iconColor: "text-purple-600",
    },
    {
      title: "Último Subido",
      value: stats.lastUploaded
        ? format(new Date(stats.lastUploaded.createdAt), "dd/MM/yyyy", { locale: es })
        : "N/A",
      description: stats.lastUploaded
        ? format(new Date(stats.lastUploaded.createdAt), "HH:mm", { locale: es })
        : "Sin documentos",
      icon: TrendingUp,
      gradient: "from-orange-500/5 to-card",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 md:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`bg-gradient-to-t ${card.gradient} shadow-xs rounded-lg border`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold tracking-tight">
                      {card.value}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <div className={`rounded-lg bg-background p-3 ${card.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
