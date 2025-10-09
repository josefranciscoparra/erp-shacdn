"use client";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  children?: React.ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
  actionIcon,
  onAction,
  children,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
        {children}
      </div>
      {actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref} className="whitespace-nowrap">
            {actionIcon}
            {actionIcon ? <span className="ml-2" /> : null}
            {actionLabel}
          </Link>
        </Button>
      ) : null}
      {!actionHref && actionLabel && onAction ? (
        <Button onClick={onAction} className="whitespace-nowrap">
          {actionIcon}
          {actionIcon ? <span className="ml-2" /> : null}
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
