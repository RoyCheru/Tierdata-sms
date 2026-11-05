import { useState } from "react";
import type { ReportDay } from "@/types/entities";
import { OUTCOMES } from "./palette";

const W = 720;
const H = 220;
const PAD = { top: 10, right: 8, bottom: 26, left: 40 };

const total = (d: ReportDay) => d.delivered + d.waiting + d.sentUnconfirmed + d.failed;
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

/** Messages per day, stacked by outcome. Has hover tooltips and a table view. */
export function DailyChart({ days }: { days: ReportDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const max = niceMax(Math.max(...days.map(total), 0));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / days.length;
  const barW = Math.min(24, slot * 0.7);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const labelEvery = Math.ceil(days.length / 8);

  if (asTable) {
    return (
      <div>
        <ChartToggle asTable onChange={setAsTable} />
        <div className="max-h-72 overflow-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-sunken text-left text-xs text-ink-500">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                {OUTCOMES.map((o) => (
                  <th key={o.key} className="px-3 py-2 text-right font-medium">{o.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.date} className="border-t border-border-subtle tabular-nums">
                  <td className="px-3 py-1.5">{dayLabel(d.date)}</td>
                  {OUTCOMES.map((o) => (
                    <td key={o.key} className="px-3 py-1.5 text-right">{d[o.key].toLocaleString()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const hovered = hover === null ? null : days[hover];

  return (
    <div>
      <ChartToggle asTable={false} onChange={setAsTable} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Messages per day by outcome">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border-subtle" strokeWidth="1" />
              <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-ink-500 tabular-nums">
                {t.toLocaleString()}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = PAD.left + slot * i + (slot - barW) / 2;
            let base = 0;
            const segments = OUTCOMES.map((o) => {
              const value = d[o.key];
              const top = y(base + value);
              const bottom = y(base);
              base += value;
              return { o, value, top, height: bottom - top };
            }).filter((s) => s.value > 0);
            const last = segments.length - 1;
            return (
              <g key={d.date}>
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
                {segments.map((s, j) => (
                  <rect
                    key={s.o.key}
                    x={x}
                    y={s.top}
                    width={barW}
                    height={Math.max(s.height - (j < last ? 2 : 0), 1)}
                    rx={j === last ? 4 : 0}
                    fill={s.o.color}
                    opacity={hover === null || hover === i ? 1 : 0.55}
                    pointerEvents="none"
                  />
                ))}
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" className="fill-ink-500">
                    {dayLabel(d.date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-lg border border-border-subtle bg-surface-card p-2.5 text-xs shadow-lg"
            style={{ left: `${Math.min(Math.max(((PAD.left + slot * (hover + 0.5)) / W) * 100, 15), 85)}%`, transform: "translateX(-50%)" }}
          >
            <p className="mb-1 font-semibold text-ink-900">{dayLabel(hovered.date)} · {total(hovered).toLocaleString()} messages</p>
            {OUTCOMES.map((o) => (
              <p key={o.key} className="flex items-center justify-between gap-4 text-ink-700">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-[2px]" style={{ background: o.color }} aria-hidden="true" />
                  {o.label}
                </span>
                <span className="tabular-nums">{hovered[o.key].toLocaleString()}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartToggle({ asTable, onChange }: { asTable: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="mb-2 flex justify-end">
      <button
        type="button"
        onClick={() => onChange(!asTable)}
        className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-surface-sunken"
      >
        {asTable ? "Show chart" : "Show as table"}
      </button>
    </div>
  );
}
