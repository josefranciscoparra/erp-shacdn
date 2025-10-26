"use client";

import { type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "green" | "amber" | "gray";
}

const colorClasses = {
  green: {
    bg: "bg-green-500/10",
    icon: "text-green-600",
    dot: "bg-green-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    icon: "text-amber-600",
    dot: "bg-amber-500",
  },
  gray: {
    bg: "bg-gray-500/10",
    icon: "text-gray-600",
    dot: "bg-gray-500",
  },
};

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const classes = colorClasses[color];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", classes.bg)}>
          <Icon className={cn("h-6 w-6", classes.icon)} />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}
