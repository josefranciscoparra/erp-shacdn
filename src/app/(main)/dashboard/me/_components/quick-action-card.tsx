"use client";

import Link from "next/link";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  icon: LucideIcon;
  href: string;
  className?: string;
}

export const QuickActionCard = ({ title, icon: Icon, href, className }: QuickActionCardProps) => {
  return (
    <Link href={href} className={cn("rounded-lg p-4 text-center transition-colors", className)}>
      <div className="flex flex-col items-center gap-2">
        <Icon className="h-6 w-6" />
        <span className="text-sm font-medium">{title}</span>
      </div>
    </Link>
  );
};
