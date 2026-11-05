import type { ReportOverview } from "@/types/entities";

const csvCell = (v: string | number): string => `"${String(v).replace(/"/g, '""')}"`;

export function summaryCsv(o: ReportOverview): string {
  const lines: (string | number)[][] = [["Campaign", "Channel", "Started", "Messages", "Delivered", "Sent not confirmed", "Waiting", "Failed", "Emails opened"]];
  for (const r of o.rows) {
    const t = r.channels.total;
    lines.push([r.name, r.channel, r.firstMessageAt, t.messages, t.delivered, t.sentUnconfirmed, t.waiting, t.failed, t.opened]);
  }
  lines.push([], ["Day", "Delivered", "Sent not confirmed", "Waiting", "Failed"]);
  for (const d of o.daily) lines.push([d.date, d.delivered, d.sentUnconfirmed, d.waiting, d.failed]);
  lines.push([], ["Failure cause", "Messages"]);
  for (const f of o.failures) lines.push([f.reason, f.count]);
  return lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob(["﻿", content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
