"use client";

import { AlertCircle, Clock, PiggyBank } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TimeBankHeroCardProps {
  totalMinutes: number;
  maxPositive: number;
  maxNegative: number;
  todaysMinutes: number;
  pendingRequests: number;
  isLoading: boolean;
}

function formatMinutesLabel(minutes: number): string {
  const hours = minutes / 60;
  const prefix = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  return `${prefix}${Math.abs(hours).toFixed(1)}h`;
}

function formatMinutesToHours(minutes: number): string {
  const hours = Math.abs(minutes) / 60;
  return `${hours.toFixed(1)}h`;
}

export function TimeBankHeroCard({
  totalMinutes,
  maxPositive,
  maxNegative,
  pendingRequests,
  isLoading,
}: TimeBankHeroCardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="lg:bg-card border-none bg-transparent shadow-none lg:border lg:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isPositive = totalMinutes >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 1. Saldo Total */}
      <Card className="lg:bg-card border-none bg-transparent shadow-none lg:border lg:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Saldo Disponible</CardTitle>
          <PiggyBank className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-baseline gap-2">
            <div className={cn("text-2xl font-light tabular-nums", isPositive ? "text-emerald-600" : "text-red-600")}>
              {formatMinutesLabel(totalMinutes)}
            </div>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Acumulado total en bolsa</p>
        </CardContent>
      </Card>

      {/* 2. Límites */}
      <Card className="lg:bg-card border-none bg-transparent shadow-none lg:border lg:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Límites de Saldo</CardTitle>
          <AlertCircle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-baseline gap-3">
            <div className="text-foreground text-2xl font-light tabular-nums">+{formatMinutesToHours(maxPositive)}</div>
            <span className="text-muted-foreground text-sm font-light">/</span>
            <div className="text-foreground text-2xl font-light tabular-nums">-{formatMinutesToHours(maxNegative)}</div>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Máximo acumulable (+ / -)</p>
        </CardContent>
      </Card>

      {/* 3. Solicitudes Pendientes */}
      <Card className="lg:bg-card border-none bg-transparent shadow-none lg:border lg:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">En Revisión</CardTitle>
          <Clock className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-foreground text-2xl font-light tabular-nums">{pendingRequests}</div>
          <p className="text-muted-foreground mt-1 text-xs">Solicitudes pendientes de aprobar</p>
        </CardContent>
      </Card>
    </div>
  );
}
