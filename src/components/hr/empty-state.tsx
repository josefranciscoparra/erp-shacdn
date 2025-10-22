import { cloneElement, isValidElement, type ReactElement } from "react";

import Link from "next/link";

import { type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon | ReactElement;
  iconClassName?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  icon: Icon,
  iconClassName,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  const iconNode = (() => {
    if (!Icon) return null;

    if (typeof Icon === "function") {
      const IconComponent = Icon;
      return <IconComponent className={cn("h-16 w-16", iconClassName)} />;
    }

    if (isValidElement(Icon)) {
      return cloneElement(Icon, {
        className: cn("h-16 w-16", Icon.props.className, iconClassName),
      });
    }

    return null;
  })();

  return (
    <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
      {iconNode ? <div className="text-muted-foreground/50 mb-6">{iconNode}</div> : null}
      <h3 className="text-foreground mb-2 text-base font-semibold sm:text-lg">{title}</h3>
      {description ? <p className="text-muted-foreground mb-4 max-w-prose text-sm">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
