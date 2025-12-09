"use client";

import type { SignatureBatchStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BatchStatusBadgeProps {
  status: SignatureBatchStatus;
  className?: string;
}

const statusConfig: Record<
  SignatureBatchStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  DRAFT: {
    label: "Borrador",
    variant: "outline",
    className: "border-muted-foreground/40 text-muted-foreground",
  },
  ACTIVE: {
    label: "Activo",
    variant: "default",
    className: "bg-blue-500 hover:bg-blue-600",
  },
  COMPLETED: {
    label: "Completado",
    variant: "default",
    className: "bg-green-500 hover:bg-green-600",
  },
  CANCELLED: {
    label: "Cancelado",
    variant: "destructive",
    className: "",
  },
  EXPIRED: {
    label: "Expirado",
    variant: "secondary",
    className: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  },
};

export function BatchStatusBadge({ status, className }: BatchStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
