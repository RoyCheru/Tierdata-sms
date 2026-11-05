import { Mail, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CampaignChannel } from "@/types/entities";

const LABELS: Record<CampaignChannel, string> = { sms: "SMS", email: "Email", both: "SMS + Email" };

/** A single channel's icon: an SMS bubble or an envelope. */
export function ChannelIcon({ channel, className }: { channel: "sms" | "email"; className?: string }) {
  const Icon = channel === "email" ? Mail : MessageSquare;
  return <Icon className={cn("size-4 shrink-0 text-ink-400", className)} aria-hidden="true" />;
}

/** Icon(s) plus the channel name, for campaigns that use SMS, email, or both. */
export function ChannelBadge({ channel = "sms", className }: { channel?: CampaignChannel; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-ink-700", className)}>
      {channel !== "email" && <ChannelIcon channel="sms" />}
      {channel !== "sms" && <ChannelIcon channel="email" />}
      {LABELS[channel]}
    </span>
  );
}
