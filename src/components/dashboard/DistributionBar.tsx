import type { BadgeTone } from "@/components/ui/Badge";

export interface DistributionSegment {
  label: string;
  value: number;
  tone: BadgeTone;
}

const BAR_TONE_CLASSES: Record<BadgeTone, string> = {
  purple: "bg-status-purple-text",
  green: "bg-status-green-text",
  blue: "bg-status-blue-text",
  red: "bg-status-red-text",
  amber: "bg-status-amber-text",
  gray: "bg-status-gray-text",
};

const DOT_TONE_CLASSES = BAR_TONE_CLASSES;

export function DistributionBar({ segments: rawSegments }: { segments: DistributionSegment[] }) {
  // A missing or non-numeric count (e.g. a field an older API does not send yet) shows as 0 instead of crashing the page.
  const segments = rawSegments.map((s) => ({ ...s, value: Number.isFinite(s.value) ? s.value : 0 }));
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <div className="h-2.5 w-full rounded-full bg-surface-sunken" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              className={BAR_TONE_CLASSES[s.tone]}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-ink-500">
            <span className={`size-2 shrink-0 rounded-full ${DOT_TONE_CLASSES[s.tone]}`} aria-hidden="true" />
            <span className="text-ink-700">{s.label}</span>
            <span className="tabular-nums text-ink-500">{s.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
