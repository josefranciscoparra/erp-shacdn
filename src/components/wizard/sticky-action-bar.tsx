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
    <div className={cn("fixed right-0 bottom-0 left-0 z-50 md:left-64", className)}>
      <div className="from-background/95 to-background/80 border-t backdrop-blur-lg">
        <div className="@container/main px-6 py-4">
          <div className="mx-auto flex max-w-(--breakpoint-lg) items-center justify-between gap-4">
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

              <Button type="submit" onClick={onNext} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
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
