"use client";

import { cn } from "@/lib/utils";

interface PulseLoaderProps {
  className?: string;
}

export function PulseLoader({ className }: PulseLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <div className="bg-primary size-3 animate-pulse rounded-full" style={{ animationDelay: "0ms", animationDuration: "1.4s" }} />
      <div className="bg-primary size-3 animate-pulse rounded-full" style={{ animationDelay: "200ms", animationDuration: "1.4s" }} />
      <div className="bg-primary size-3 animate-pulse rounded-full" style={{ animationDelay: "400ms", animationDuration: "1.4s" }} />
    </div>
  );
}
