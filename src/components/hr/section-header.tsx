"use client";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  description,
  actionHref,
  actionLabel,
  actionIcon,
  onAction,
  action,
  children,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-[20px] leading-tight font-semibold">{title}</h1>
        {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        {children}
      </div>
      {action ??
        (actionHref && actionLabel ? (
          <Button asChild>
            <Link href={actionHref} className="whitespace-nowrap">
              {actionIcon}
              {actionIcon ? <span className="ml-2" /> : null}
              {actionLabel}
            </Link>
          </Button>
        ) : !actionHref && actionLabel && onAction ? (
          <Button onClick={onAction} className="whitespace-nowrap">
            {actionIcon}
            {actionIcon ? <span className="ml-2" /> : null}
            {actionLabel}
          </Button>
        ) : null)}
    </div>
  );
}
