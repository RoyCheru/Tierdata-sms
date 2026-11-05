const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatRelativeTime(isoDate: string): string {
  const diffSeconds = (new Date(isoDate).getTime() - Date.now()) / 1000;
  for (const [unit, secondsInUnit] of UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return formatter.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }
  return formatter.format(Math.round(diffSeconds), "second");
}
