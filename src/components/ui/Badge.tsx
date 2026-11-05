import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "purple" | "green" | "blue" | "red" | "amber" | "gray";

const TONE_CLASSES: Record<BadgeTone, string> = {
  purple: "bg-status-purple-bg text-status-purple-text",
  green: "bg-status-green-bg text-status-green-text",
  blue: "bg-status-blue-bg text-status-blue-text",
  red: "bg-status-red-bg text-status-red-text",
  amber: "bg-status-amber-bg text-status-amber-text",
  gray: "bg-status-gray-bg text-status-gray-text",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  purple: "bg-status-purple-text",
  green: "bg-status-green-text",
  blue: "bg-status-blue-text",
  red: "bg-status-red-text",
  amber: "bg-status-amber-text",
  gray: "bg-status-gray-text",
};

export function Badge({ tone = "gray", dot = true, children }: { tone?: BadgeTone; dot?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
      )}
    >
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
