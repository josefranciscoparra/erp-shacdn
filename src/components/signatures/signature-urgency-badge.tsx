import { Badge } from "@/components/ui/badge";
import { getUrgencyColor, getUrgencyLabel, urgencyColors } from "@/lib/validations/signature";

interface SignatureUrgencyBadgeProps {
  expiresAt: Date | string;
  urgencyLevel?: "HIGH" | "MEDIUM" | "NORMAL";
  className?: string;
}

export function SignatureUrgencyBadge({ expiresAt, urgencyLevel, className }: SignatureUrgencyBadgeProps) {
  const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;

  let urgencyType: keyof typeof urgencyColors;

  if (urgencyLevel) {
    switch (urgencyLevel) {
      case "HIGH":
        urgencyType = "urgent";
        break;
      case "MEDIUM":
        urgencyType = "warning";
        break;
      case "NORMAL":
      default:
        urgencyType = "normal";
        break;
    }
    // Si ya ha expirado, forzar expired independientemente del nivel calculado previamente
    if (date.getTime() < Date.now()) {
      urgencyType = "expired";
    }
  } else {
    urgencyType = getUrgencyColor(date);
  }

  const label = getUrgencyLabel(date);
  const colorClass = urgencyColors[urgencyType];

  return (
    <Badge variant="outline" className={`${colorClass} ${className ?? ""}`}>
      {label}
    </Badge>
  );
}
