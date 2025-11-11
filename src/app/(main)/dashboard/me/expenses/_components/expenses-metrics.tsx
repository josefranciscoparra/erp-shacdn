"use client";

import { TrendingDown, TrendingUp, Wallet, Clock, CheckCircle2 } from "lucide-react";

import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ExpenseMetric {
  name: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: string;
  icon: "total" | "pending" | "review";
}

interface ExpensesMetricsProps {
  metrics: ExpenseMetric[];
}

export function ExpensesMetrics({ metrics }: ExpensesMetricsProps) {
  const getIcon = (iconType: ExpenseMetric["icon"]) => {
    switch (iconType) {
      case "total":
        return <Wallet className="size-5" />;
      case "pending":
        return <CheckCircle2 className="size-5" />;
      case "review":
        return <Clock className="size-5" />;
    }
  };

  const getIconStyles = (iconType: ExpenseMetric["icon"]) => {
    switch (iconType) {
      case "total":
        return "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-400";
      case "pending":
        return "bg-green-50 border-green-200 text-green-600 dark:bg-green-950/50 dark:border-green-900 dark:text-green-400";
      case "review":
        return "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/50 dark:border-orange-900 dark:text-orange-400";
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.name}>
          <CardHeader>
            <CardDescription>{metric.name}</CardDescription>
            <div className="flex flex-col gap-2">
              <h4 className="font-display text-2xl lg:text-3xl">{metric.value}</h4>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                {metric.change && metric.changeType !== "neutral" && (
                  <span
                    className={
                      metric.changeType === "positive"
                        ? "text-green-600 dark:text-green-500"
                        : "text-red-600 dark:text-red-500"
                    }
                  >
                    {metric.changeType === "positive" ? (
                      <TrendingDown className="inline size-4" />
                    ) : (
                      <TrendingUp className="inline size-4" />
                    )}{" "}
                    {metric.change}
                  </span>
                )}
                {metric.subtitle && <span>{metric.subtitle}</span>}
              </div>
            </div>
            <CardAction>
              <div className="flex gap-4">
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full border",
                    getIconStyles(metric.icon),
                  )}
                >
                  {getIcon(metric.icon)}
                </div>
              </div>
            </CardAction>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
