import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function StatGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>{children}</div>;
}

export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-sunken p-3 text-center">
      <p className="text-lg font-semibold tabular-nums text-ink-900">{value.toLocaleString()}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}
