"use client";

import { CheckCircle2, Clock, FileText, Loader2, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

interface SignaturesSummary {
  total: number;
  byStatus: {
    PENDING: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    REJECTED: number;
    EXPIRED: number;
  };
}

interface SummaryCardsProps {
  summary: SignaturesSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      key: "PENDING",
      title: "Pendientes",
      description: "solicitudes por firmar",
      count: summary.byStatus.PENDING,
      icon: FileText,
    },
    {
      key: "IN_PROGRESS",
      title: "En progreso",
      description: "firmándose actualmente",
      count: summary.byStatus.IN_PROGRESS,
      icon: Loader2,
    },
    {
      key: "COMPLETED",
      title: "Completadas",
      description: "firmadas y finalizadas",
      count: summary.byStatus.COMPLETED,
      icon: CheckCircle2,
    },
    {
      key: "REJECTED",
      title: "Rechazadas",
      description: "rechazadas por firmantes",
      count: summary.byStatus.REJECTED,
      icon: XCircle,
    },
    {
      key: "EXPIRED",
      title: "Expiradas",
      description: "fuera de plazo",
      count: summary.byStatus.EXPIRED,
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
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
              <div className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{card.count}</div>
              <p className="text-muted-foreground mt-1 text-xs">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
