"use client";

import { useEffect } from "react";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

interface EmployeeSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  minChars?: number;
  debounceMs?: number;
  disabled?: boolean;
  showHint?: boolean;
  className?: string;
}

export function EmployeeSearchInput({
  value,
  onValueChange,
  onSearch,
  placeholder = "Buscar por nombre o email...",
  minChars = 2,
  debounceMs = 300,
  disabled = false,
  showHint = true,
  className,
}: EmployeeSearchInputProps) {
  const debouncedValue = useDebouncedValue(value, debounceMs);
  const normalized = value.trim();
  const shouldShowHint = showHint && normalized.length > 0 && normalized.length < minChars;

  useEffect(() => {
    const normalizedSearch = debouncedValue.trim();
    const hasEnoughChars = normalizedSearch.length >= minChars;
    const shouldSearch = normalizedSearch.length === 0 || hasEnoughChars;

    if (!shouldSearch) {
      onSearch("");
      return;
    }

    onSearch(normalizedSearch);
  }, [debouncedValue, minChars, onSearch]);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={disabled}
          className="pr-10 pl-9"
        />
        {value.length > 0 && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onValueChange("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 size-7 -translate-y-1/2"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {shouldShowHint && <span className="text-muted-foreground text-xs">Escribe al menos {minChars} caracteres</span>}
    </div>
  );
}
