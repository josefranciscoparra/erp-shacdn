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
    variant: "warning",
  },
  APPROVED: {
    label: "Aprobado",
    variant: "default",
  },
  REJECTED: {
    label: "Rechazado",
    variant: "destructive",
  },
  REIMBURSED: {
    label: "Reembolsado",
    variant: "success",
  },
};

export function ExpenseStatusBadge({ status }: ExpenseStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
