import { CheckCircle2 } from "lucide-react";
import type { ReportFailure } from "@/types/entities";

/** Failure causes, biggest first, each with a meter relative to the largest. */
export function Failures({ failures }: { failures: ReportFailure[] }) {
  if (failures.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-700">
        <CheckCircle2 className="size-4 text-status-green-text" aria-hidden="true" />
        No failures in this period.
      </p>
    );
  }
  const max = failures[0].count;
  return (
    <ul className="flex flex-col gap-3">
      {failures.map((f) => (
        <li key={f.reason}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 break-words text-ink-900">{f.reason}</span>
            <span className="shrink-0 tabular-nums text-ink-700">{f.count.toLocaleString()}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-surface-sunken">
            <div className="h-full rounded-full" style={{ width: `${(f.count / max) * 100}%`, background: "#d13f4c" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
