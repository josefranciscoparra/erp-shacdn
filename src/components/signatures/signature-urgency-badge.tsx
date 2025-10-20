import { Badge } from "@/components/ui/badge";
import { getUrgencyColor, getUrgencyLabel, urgencyColors } from "@/lib/validations/signature";

interface SignatureUrgencyBadgeProps {
  expiresAt: Date | string;
  className?: string;
}

export function SignatureUrgencyBadge({ expiresAt, className }: SignatureUrgencyBadgeProps) {
  const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;

  const urgencyType = getUrgencyColor(date);
  const label = getUrgencyLabel(date);
  const colorClass = urgencyColors[urgencyType];

  return (
    <Badge variant="outline" className={`${colorClass} ${className ?? ""}`}>
      {label}
    </Badge>
  );
}
