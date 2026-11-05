import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { FieldLabel } from "@/components/ui/FieldLabel";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, required, children, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? props.name ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={inputId} label={label} required={required} />}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={Boolean(error)}
            className={cn(
              "h-10 w-full appearance-none rounded-lg border border-border-default bg-white px-3 pr-9 text-sm text-ink-900",
              "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400",
              "disabled:bg-surface-sunken disabled:text-ink-400",
              error && "border-status-red-text focus:ring-status-red-text",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        </div>
        {error ? (
          <span className="text-xs text-status-red-text">{error}</span>
        ) : hint ? (
          <span className="text-xs text-ink-500">{hint}</span>
        ) : null}
      </div>
    );
  },
);
Select.displayName = "Select";
