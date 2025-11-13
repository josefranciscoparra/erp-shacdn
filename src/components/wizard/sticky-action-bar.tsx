"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  onCancel: () => void;
  onPrevious?: () => void;
  onNext: () => void;
  isLoading?: boolean;
  isLastStep?: boolean;
  isFirstStep?: boolean;
  nextLabel?: string;
  className?: string;
}

export function StickyActionBar({
  onCancel,
  onPrevious,
  onNext,
  isLoading = false,
  isLastStep = false,
  isFirstStep = false,
  nextLabel,
  className,
}: StickyActionBarProps) {
  const defaultNextLabel = isLastStep ? "Finalizar" : "Siguiente";
  const finalNextLabel = nextLabel ?? defaultNextLabel;

  return (
    <div className={cn("sticky bottom-0 z-50 mt-auto", className)}>
      <div className="wizard-action-bar bg-background border-t">
        <div className="@container/main mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Cancel */}
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>

            {/* Right: Previous + Next/Finish */}
            <div className="flex gap-3">
              {!isFirstStep && onPrevious && (
                <Button type="button" variant="outline" onClick={onPrevious} disabled={isLoading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
              )}

              <Button
                type="submit"
                onClick={onNext}
                disabled={isLoading}
                className="button-active-pressed transition-transform"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLastStep ? "Creando…" : "Guardando..."}
                  </>
                ) : (
                  <>
                    {isLastStep ? <Check className="mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    {finalNextLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
