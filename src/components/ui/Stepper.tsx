import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepperStep {
  key: string;
  label: string;
}

export function Stepper({ steps, activeIndex }: { steps: StepperStep[]; activeIndex: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Campaign progress">
      {steps.map((step, index) => {
        const isComplete = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  isComplete && "bg-brand-600 text-white",
                  isActive && "bg-brand-50 text-brand-600 ring-2 ring-brand-500",
                  !isComplete && !isActive && "bg-surface-sunken text-ink-400",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn("text-sm font-medium", isActive || isComplete ? "text-ink-900" : "text-ink-400")}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className={cn("h-px w-8 shrink-0", isComplete ? "bg-brand-600" : "bg-border-default")} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
