/**
 * Outcome colours, validated as a set with the dataviz palette checker
 * (colour-blind separation + contrast). Order is fixed: it is also the legend
 * and stack order. Text never wears these; a swatch beside the label does.
 */
export const OUTCOMES = [
  { key: "delivered", label: "Delivered", color: "#1c9a5b" },
  { key: "waiting", label: "Waiting to send", color: "#b3781b" },
  { key: "sentUnconfirmed", label: "Sent, not yet confirmed", color: "#2f6fd1" },
  { key: "failed", label: "Failed", color: "#d13f4c" },
] as const;

export type OutcomeKey = (typeof OUTCOMES)[number]["key"];

export const pct = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);
export const formatPct = (value: number): string => `${value >= 10 || value === 0 ? Math.round(value) : value.toFixed(1)}%`;
