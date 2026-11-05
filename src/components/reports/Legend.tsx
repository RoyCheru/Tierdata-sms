import { OUTCOMES } from "./palette";

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-700" aria-label="Legend">
      {OUTCOMES.map((o) => (
        <li key={o.key} className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[3px]" style={{ background: o.color }} aria-hidden="true" />
          {o.label}
        </li>
      ))}
    </ul>
  );
}
