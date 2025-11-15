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
  badge?: React.ReactNode;
  backButton?: {
    href: string;
    label: string;
  };
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
  badge,
  backButton,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {backButton && (
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href={backButton.href} className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            {backButton.label}
          </Link>
        </Button>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] leading-tight font-semibold">{title}</h1>
            {badge}
          </div>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
          {description ? <p className="text-muted-foreground mb-2 text-sm">{description}</p> : null}
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
    </div>
  );
}
