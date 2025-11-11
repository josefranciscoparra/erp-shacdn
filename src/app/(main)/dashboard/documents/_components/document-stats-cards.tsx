"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Users, HardDrive, TrendingUp } from "lucide-react";

import { Card, CardAction, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/validations/document";
import { useGlobalDocumentStats } from "@/stores/documents-store";

export function DocumentStatsCards() {
  const stats = useGlobalDocumentStats();

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
      description: "En almacenamiento",
      icon: HardDrive,
      iconStyles:
        "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-950/50 dark:border-purple-900 dark:text-purple-400",
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <div className="flex flex-col gap-2">
                <h4 className="font-display text-2xl lg:text-3xl">{card.value}</h4>
                <div className="text-muted-foreground text-sm">
                  <span>{card.description}</span>
                </div>
              </div>
              <CardAction>
                <div className="flex gap-4">
                  <div className={cn("flex size-12 items-center justify-center rounded-full border", card.iconStyles)}>
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardAction>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
