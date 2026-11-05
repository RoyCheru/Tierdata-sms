import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FieldLabel } from "@/components/ui/FieldLabel";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? props.name ?? generatedId;
    const hintId = hint || error ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={inputId} label={label} required={required} />}
        <div className="relative">
          {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={hintId}
            className={cn(
              "h-10 w-full rounded-lg border border-border-default bg-white px-3 text-sm text-ink-900",
              "placeholder:text-ink-400",
              "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400",
              "disabled:bg-surface-sunken disabled:text-ink-400",
              icon && "pl-9",
              error && "border-status-red-text focus:ring-status-red-text",
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <span id={hintId} className="text-xs text-status-red-text">
            {error}
          </span>
        ) : hint ? (
          <span id={hintId} className="text-xs text-ink-500">
            {hint}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
