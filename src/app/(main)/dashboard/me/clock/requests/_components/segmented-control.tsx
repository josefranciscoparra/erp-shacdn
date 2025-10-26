"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T; badge?: number }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-600 hover:bg-white/50 dark:text-gray-400 dark:hover:bg-gray-700/50",
          )}
        >
          {option.label}
          {option.badge !== undefined && option.badge > 0 && (
            <Badge
              variant={value === option.value ? "default" : "secondary"}
              className="h-5 w-5 items-center justify-center rounded-full p-1 text-xs"
            >
              {option.badge}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
