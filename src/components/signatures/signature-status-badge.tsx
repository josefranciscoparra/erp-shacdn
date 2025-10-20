import { Badge } from "@/components/ui/badge";
import {
  signatureRequestStatusColors,
  signatureRequestStatusLabels,
  type SignatureRequestStatus,
} from "@/lib/validations/signature";

interface SignatureStatusBadgeProps {
  status: SignatureRequestStatus;
  className?: string;
}

export function SignatureStatusBadge({ status, className }: SignatureStatusBadgeProps) {
  const label = signatureRequestStatusLabels[status];
  const colorClass = signatureRequestStatusColors[status];

  return (
    <Badge variant="outline" className={`${colorClass} ${className ?? ""}`}>
      {label}
    </Badge>
  );
}
