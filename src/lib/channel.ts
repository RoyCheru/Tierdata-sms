import type { CampaignChannel } from "@/types/entities";

const LABELS: Record<CampaignChannel, string> = { sms: "SMS", email: "Email", both: "SMS + Email" };

export function channelLabel(channel: CampaignChannel | undefined): string {
  return LABELS[channel ?? "sms"];
}

/** Open-tracking summary for the messages tables; SMS has no open tracking. */
export function openedLabel(message: { channel: "sms" | "email"; openCount: number; firstOpenedAt?: string }): string {
  if (message.channel !== "email") return "-";
  if (message.openCount === 0 || !message.firstOpenedAt) return "Not opened";
  const times = message.openCount === 1 ? "1 open" : `${message.openCount} opens`;
  return `${times} · first ${new Date(message.firstOpenedAt).toLocaleString()}`;
}
