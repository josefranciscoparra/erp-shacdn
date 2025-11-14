"use client";

import { TrendingDown, TrendingUp, Wallet, Clock, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.name} className="gap-2">
          <CardHeader>
            <CardTitle className="font-display text-xl">{metric.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border">
                {getIcon(metric.icon)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{metric.value}</p>
                <p className="text-muted-foreground text-sm">
                  {metric.change && metric.changeType !== "neutral" && (
                    <>
                      <span
                        className={
                          metric.changeType === "positive"
                            ? "text-green-600 dark:text-green-500"
                            : "text-red-600 dark:text-red-500"
                        }
                      >
                        {metric.changeType === "positive" ? (
                          <TrendingDown className="inline size-3" />
                        ) : (
                          <TrendingUp className="inline size-3" />
                        )}{" "}
                        {metric.change}
                      </span>
                      {metric.subtitle && " · "}
                    </>
                  )}
                  {metric.subtitle}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
