import { Cog } from "lucide-react";
import { initialsFor } from "@/lib/format";
import { cn } from "@/lib/cn";

const SIZES = { sm: "size-7 text-[11px]", md: "size-8 text-xs", lg: "size-10 text-sm" };

/**
 * A round initials badge. `label` is what the initials are taken from (email,
 * name or phone). The label "System" (automated actions) gets a gear instead,
 * since "SY" would look like a person.
 */
export function Avatar({ label, size = "md", className }: { label?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const isSystem = label === "System";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        isSystem ? "bg-surface-sunken text-ink-500" : "bg-brand-100 text-brand-700",
        SIZES[size],
        className,
      )}
    >
      {isSystem ? <Cog className="size-3.5" /> : initialsFor(label)}
    </span>
  );
}
