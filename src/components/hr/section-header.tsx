"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  children?: React.ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
  actionIcon,
  children,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
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
    </div>
  );
}

