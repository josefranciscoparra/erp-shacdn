"use client";

import { CheckCircle2, Clock, FileSignature, Users, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BatchStatsCardsProps {
  totalRecipients: number;
  signedCount: number;
  pendingCount: number;
  rejectedCount: number;
  progressPercentage: number;
  daysUntilExpiration: number;
}

export function BatchStatsCards({
  totalRecipients,
  signedCount,
  pendingCount,
  rejectedCount,
  progressPercentage,
  daysUntilExpiration,
}: BatchStatsCardsProps) {
  const cards = [
    {
      key: "total",
      title: "Total destinatarios",
      description: "empleados en este lote",
      count: totalRecipients,
      icon: Users,
    },
    {
      key: "signed",
      title: "Firmados",
      description: "solicitudes completadas",
      count: signedCount,
      icon: CheckCircle2,
      countClassName: "text-green-600 dark:text-green-400",
    },
    {
      key: "pending",
      title: "Pendientes",
      description: "esperando firma",
      count: pendingCount,
      icon: Clock,
      countClassName: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "rejected",
      title: "Rechazados / Expirados",
      description: "rechazados o vencidos",
      count: rejectedCount,
      icon: XCircle,
      countClassName: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className="from-primary/5 to-card dark:bg-card @container/card bg-gradient-to-t shadow-xs"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>{card.title}</CardDescription>
                <Icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl ${card.countClassName ?? ""}`}
                >
                  {card.count}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progreso general */}
      <Card className="from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <FileSignature className="text-muted-foreground h-4 w-4" />
            <CardDescription>Progreso de firmas</CardDescription>
          </div>
          <span className="text-muted-foreground text-sm">
            {daysUntilExpiration > 0
              ? `${daysUntilExpiration} días restantes`
              : daysUntilExpiration === 0
                ? "Expira hoy"
                : "Expirado"}
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{progressPercentage}% completado</span>
              <span className="text-muted-foreground">
                {signedCount} de {totalRecipients}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
