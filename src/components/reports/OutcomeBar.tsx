import type { ChannelStats } from "@/types/entities";
import { OUTCOMES, formatPct, pct } from "./palette";

/**
 * One horizontal bar split by outcome. Every message is in exactly one
 * segment, so the segments always fill the bar. 2px surface gaps separate them.
 */
export function OutcomeBar({ stats, height = 10 }: { stats: ChannelStats; height?: number }) {
  const summary = OUTCOMES.map((o) => `${o.label} ${stats[o.key]}`).join(", ");
  return (
    <div
      role="img"
      aria-label={stats.messages === 0 ? "No messages" : summary}
      className="flex w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken"
      style={{ height }}
      title={summary}
    >
      {OUTCOMES.map((o) => {
        const width = pct(stats[o.key], stats.messages);
        return width > 0 ? (
          <span key={o.key} style={{ width: `${width}%`, background: o.color }} />
        ) : null;
      })}
    </div>
  );
}

export function OutcomeRates({ stats }: { stats: ChannelStats }) {
  return (
    <span className="tabular-nums">
      {formatPct(pct(stats.delivered, stats.messages))} delivered
    </span>
  );
}
