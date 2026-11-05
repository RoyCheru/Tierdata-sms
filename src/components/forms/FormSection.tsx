import type { ReactNode } from "react";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</legend>
      {children}
    </fieldset>
  );
}
