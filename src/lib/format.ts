// Day-first, 24-hour dates ("25 Sep 2026, 13:51"): the format people here use,
// and unambiguous, unlike the browser default that shows 9/25/2026, 1:51 PM.
const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : dateTime.format(date);
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : dateOnly.format(date);
}

/** Two-letter initials from an email ("s.muiruri@x.co" -> "SM"), name, or phone. */
export function initialsFor(value: string | undefined | null): string {
  if (!value) return "?";
  const local = value.includes("@") ? value.split("@")[0] : value;
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const ACTION_LABELS: Record<string, string> = {
  "campaign.create": "Campaign created",
  "campaign.confirm": "Campaign confirmed",
  "campaign.approve": "Campaign approved",
  "campaign.dispatch": "Campaign sent",
  "campaign.attachment_add": "File attached to campaign",
  "campaign.attachment_remove": "File removed from campaign",
  "customer.create": "Customer added",
  "customer.update": "Customer updated",
  "customer.archive": "Customer archived",
  "customer.activate": "Customer reactivated",
  "customer.update_sms_eligibility": "SMS eligibility changed",
  "group.create": "Group created",
  "group.member_add": "Member added to group",
  "group.member_remove": "Member removed from group",
  "import.create": "Import uploaded",
  "import.apply": "Import applied",
  "provider.config_update": "Provider settings changed",
  "provider.test": "Provider connection tested",
  "provider.send_test": "Test message sent",
  "schedule.create": "Campaign scheduled",
  "schedule.cancel": "Schedule cancelled",
  "sender.create": "Sender ID added",
  "sender.deactivate": "Sender ID deactivated",
  "settings.update": "Settings changed",
  "user.create": "User added",
  "user.deactivate": "User deactivated",
  "user.role_update": "User role changed",
  "identity.login": "Signed in",
  "identity.logout": "Signed out",
  "identity.session_extend": "Session extended",
  "audit.read": "Audit log viewed",
};

/** A readable name for an audit action code; unknown codes fall back to a tidied version of the code. */
export function actionLabel(action: string): string {
  const known = ACTION_LABELS[action];
  if (known) return known;
  const tidy = action.replace(/[._]/g, " ").trim();
  return tidy.charAt(0).toUpperCase() + tidy.slice(1);
}
