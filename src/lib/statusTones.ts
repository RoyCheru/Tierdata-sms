import type { BadgeTone } from "@/components/ui/Badge";
import type {
  CampaignStatus,
  CustomerStatus,
  DeliveryStatus,
  ImportStatus,
  MessageStatus,
  ScheduleStatus,
  SmsEligibility,
  UserStatus,
} from "@/types/entities";

export const customerStatusTone: Record<CustomerStatus, BadgeTone> = {
  active: "green",
  inactive: "gray",
};

export const smsEligibilityTone: Record<SmsEligibility, BadgeTone> = {
  eligible: "green",
  opted_out: "amber",
  unsubscribed: "red",
};

export const userStatusTone: Record<UserStatus, BadgeTone> = {
  active: "green",
  inactive: "gray",
};

export const campaignStatusTone: Record<CampaignStatus, BadgeTone> = {
  draft: "gray",
  confirmed: "blue",
  dispatched: "purple",
};

export const messageStatusTone: Record<MessageStatus, BadgeTone> = {
  pending: "amber",
  processing: "blue",
  sent: "purple",
  failed: "red",
};

export const deliveryStatusTone: Record<DeliveryStatus, BadgeTone> = {
  unknown: "gray",
  pending: "amber",
  delivered: "green",
  read: "blue",
  failed: "red",
};

export const scheduleStatusTone: Record<ScheduleStatus, BadgeTone> = {
  pending: "blue",
  executed: "green",
  cancelled: "gray",
};

export const importStatusTone: Record<ImportStatus, BadgeTone> = {
  validated: "amber",
  applied: "green",
};

/** "opted_out" -> "Opted out": sentence case, so labels read naturally next to running text. */
export function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
