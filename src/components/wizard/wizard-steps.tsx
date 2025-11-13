"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface WizardStep {
  label: string;
  description?: string;
}

interface WizardStepsProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: number[];
}

export function WizardSteps({ steps, currentStep, completedSteps }: WizardStepsProps) {
  return (
    <div className="w-full py-4">
      <div className="mx-auto max-w-2xl">
        {/* Desktop: Horizontal stepper */}
        <div className="hidden items-center justify-center gap-8 md:flex">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = completedSteps.includes(stepNumber);
            const isCurrent = stepNumber === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <div key={stepNumber} className="flex items-center gap-8">
                {/* Step circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                      isCurrent && !isCompleted && "border-primary bg-primary text-white",
                      !isCurrent && !isCompleted && "border-muted-foreground/30 bg-background text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <span className="font-semibold">{stepNumber}</span>}
                  </div>

                  {/* Step label */}
                  <div className="mt-2 flex flex-col items-center">
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isCurrent ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                    {step.description && (
                      <span className="text-muted-foreground mt-0.5 text-xs">{step.description}</span>
                    )}
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="w-24">
                    <div
                      className={cn(
                        "h-0.5 transition-all duration-300",
                        isCompleted ? "bg-emerald-500" : "bg-muted-foreground/30",
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: Compact stepper */}
        <div className="md:hidden">
          <div className="flex items-center justify-center gap-2">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = completedSteps.includes(stepNumber);
              const isCurrent = stepNumber === currentStep;

              return (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                      isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                      isCurrent && !isCompleted && "border-primary bg-primary text-white",
                      !isCurrent && !isCompleted && "border-muted-foreground/30 bg-background text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                  </div>

                  {index < steps.length - 1 && <div className="bg-muted-foreground/30 mx-1 h-0.5 w-6" />}
                </div>
              );
            })}
          </div>

          {/* Current step info */}
          <div className="mt-4 text-center">
            <p className="text-foreground text-sm font-medium">{steps[currentStep - 1]?.label}</p>
            <p className="text-muted-foreground text-xs">
              Paso {currentStep} de {steps.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
