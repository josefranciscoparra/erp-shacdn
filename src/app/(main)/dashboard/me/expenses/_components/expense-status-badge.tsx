import { Badge } from "@/components/ui/badge";
import type { ExpenseStatus } from "@/stores/expenses-store";

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus;
}

const statusConfig: Record<
  ExpenseStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "success" | "destructive" | "warning";
  }
> = {
  DRAFT: {
    label: "Borrador",
    variant: "secondary",
  },
  SUBMITTED: {
    label: "Enviado",
    variant: "default",
  },
  APPROVED: {
    label: "Aprobado",
    variant: "success",
  },
  REJECTED: {
    label: "Rechazado",
    variant: "destructive",
  },
  REIMBURSED: {
    label: "Reembolsado",
    variant: "outline",
  },
};

export function ExpenseStatusBadge({ status }: ExpenseStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
