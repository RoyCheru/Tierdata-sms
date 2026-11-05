import type {
  AppUser,
  AuditEvent,
  Campaign,
  CampaignApprover,
  Customer,
  Group,
  ImportRow,
  ImportSummary,
  Message,
  Schedule,
} from "@/types/entities";
import type { DemoDb } from "./types";

const DAY = 24 * 60 * 60 * 1000;

const FIRST_NAMES = [
  "Amina", "Brian", "Cynthia", "David", "Esther", "Felix", "Grace", "Hassan",
  "Irene", "James", "Kevin", "Lydia", "Martin", "Nancy", "Oscar", "Pauline",
  "Peter", "Rose", "Samuel", "Teresa", "Victor", "Winnie", "Yusuf", "Zainab",
];

const LAST_NAMES = [
  "Wanjiru", "Otieno", "Mwangi", "Kamau", "Achieng", "Mutua", "Okafor",
  "Kiptoo", "Njoroge", "Maina", "Chebet", "Were", "Kariuki", "Odhiambo",
  "Wambui", "Barasa", "Njeri", "Omondi", "Auma", "Kilonzo",
];

const FAILURE_REASONS = [
  "invalid_number",
  "insufficient_credit",
  "provider_timeout",
  "recipient_unreachable",
];

function iso(date: number): string {
  return new Date(date).toISOString();
}

function emailFor(name: string, index: number): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${index}@example.com`;
}

function buildCustomers(): Customer[] {
  return Array.from({ length: 40 }, (_, index) => {
    const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index * 3) % LAST_NAMES.length]}`;
    const inactive = index % 11 === 0;
    const optedOut = index % 7 === 0;
    const unsubscribed = index % 13 === 0;
    const hasEmail = index % 9 !== 0;
    const smsEligibility = unsubscribed ? "unsubscribed" : optedOut ? "opted_out" : "eligible";
    const status = inactive ? "inactive" : "active";
    return {
      id: `cus-${String(index + 1).padStart(3, "0")}`,
      name,
      phone: `+2547${String(12000000 + index * 137911).slice(0, 8)}`,
      email: hasEmail ? emailFor(name, index) : "",
      status,
      smsEligibility,
      canReceiveSms: status === "active" && smsEligibility === "eligible",
      canReceiveEmail: status === "active" && hasEmail,
    };
  });
}

function buildGroups(customers: Customer[]): { groups: Group[]; members: Record<string, string[]> } {
  const groups: Group[] = [
    { id: "grp-investors", name: "Investors", description: "Shareholders and investor relations contacts." },
    { id: "grp-vip", name: "VIP Customers", description: "High-value customers who get priority offers." },
    { id: "grp-dividend", name: "Q3 Dividend Recipients", description: "Customers receiving the Q3 dividend update." },
    { id: "grp-newsletter", name: "Newsletter", description: "People subscribed to the monthly product newsletter." },
    { id: "grp-partners", name: "Partners", description: "Agency and channel partners." },
  ];

  const members: Record<string, string[]> = {
    "grp-investors": customers.slice(0, 12).map((c) => c.id),
    "grp-vip": customers.slice(10, 20).map((c) => c.id),
    "grp-dividend": customers.slice(18, 30).map((c) => c.id),
    "grp-newsletter": customers.slice(28, 40).map((c) => c.id),
    "grp-partners": [2, 12, 22, 32, 38].map((i) => customers[i].id),
  };

  return { groups, members };
}

function buildUsers(): AppUser[] {
  return [
    { id: "demo-user", email: "demo@tierdata.app", phone: "+254700000001", role: "admin", status: "active" },
    { id: "usr-manager-1", email: "grace.mwangi@tierdata.app", phone: "+254700000002", role: "manager", status: "active" },
    { id: "usr-manager-2", email: "brian.otieno@tierdata.app", phone: "+254700000003", role: "manager", status: "active" },
    { id: "usr-comms-1", email: "faith.wanjiku@tierdata.app", phone: "+254700000004", role: "communicator", status: "active" },
    { id: "usr-viewer-1", email: "peter.kamau@tierdata.app", phone: "+254700000005", role: "viewer", status: "active" },
  ];
}

interface SeedCampaign {
  campaign: Campaign;
  daysAgo: number;
  audienceSize: number;
}

function buildCampaigns(users: AppUser[]): SeedCampaign[] {
  const admin = users[0];
  const communicator = users[3];
  const draft = (
    id: string,
    name: string,
    message: string,
    channel: Campaign["channel"],
    groupId: string | null,
    daysAgo: number,
    emailSubject?: string,
  ): SeedCampaign => ({
    daysAgo,
    audienceSize: 28,
    campaign: {
      id,
      name,
      message,
      senderId: "TIERDATA",
      audienceType: groupId ? "group" : "all",
      groupId,
      channel,
      emailSubject,
      status: "draft",
      createdBy: admin.id,
      createdByEmail: admin.email,
      greeting: "Dear",
      includeName: true,
    },
  });

  const confirmed = (
    id: string,
    name: string,
    message: string,
    channel: Campaign["channel"],
    groupId: string | null,
    daysAgo: number,
    waiting: boolean,
    emailSubject?: string,
  ): SeedCampaign => {
    const seed = draft(id, name, message, channel, groupId, daysAgo, emailSubject);
    seed.campaign.status = "confirmed";
    seed.campaign.approvalState = waiting ? "waiting" : "approved";
    seed.campaign.approvalsRequired = 1;
    seed.campaign.approvalsReceived = waiting ? 0 : 1;
    return seed;
  };

  const dispatched = (
    id: string,
    name: string,
    message: string,
    channel: Campaign["channel"],
    groupId: string | null,
    daysAgo: number,
    emailSubject?: string,
  ): SeedCampaign => {
    const seed = draft(id, name, message, channel, groupId, daysAgo, emailSubject);
    seed.campaign.status = "dispatched";
    seed.campaign.approvalState = "approved";
    seed.campaign.approvalsRequired = 1;
    seed.campaign.approvalsReceived = 1;
    return seed;
  };

  return [
    dispatched(
      "cmp-q3-dividend",
      "Q3 Dividend Announcement",
      "Your Q3 dividend is ready. Log in to the investor portal to view your statement and payout date.",
      "both",
      "grp-dividend",
      13,
      "Your Q3 dividend statement is ready",
    ),
    dispatched(
      "cmp-investor-briefing",
      "Investor Briefing Invite",
      "Join our investor briefing on Thursday at 10:00 to hear the latest results and outlook.",
      "email",
      "grp-investors",
      11,
      "You're invited: investor briefing this Thursday",
    ),
    dispatched(
      "cmp-mobile-upgrade",
      "Mobile Money Upgrade",
      "We have upgraded our mobile money integration. Payments are now faster and available 24/7.",
      "sms",
      null,
      9,
    ),
    dispatched(
      "cmp-newsletter",
      "Quarterly Newsletter",
      "In this issue: product updates, customer stories, and a preview of what is coming next quarter.",
      "email",
      "grp-newsletter",
      7,
      "The TierData quarterly newsletter",
    ),
    dispatched(
      "cmp-vip-day",
      "VIP Appreciation Day",
      "Thank you for being a valued customer. Visit any branch this Friday for a small token of our appreciation.",
      "sms",
      "grp-vip",
      5,
    ),
    dispatched(
      "cmp-agm",
      "Annual General Meeting",
      "The Annual General Meeting will be held on 28 November at 9:00. Please confirm your attendance.",
      "both",
      "grp-investors",
      3,
      "Notice of Annual General Meeting",
    ),
    dispatched(
      "cmp-savings",
      "Savings Challenge",
      "Take part in our 30-day savings challenge and stand a chance to win shopping vouchers.",
      "both",
      "grp-vip",
      6,
      "Join the 30-day savings challenge",
    ),
    dispatched(
      "cmp-payment-reminder",
      "Payment Reminder",
      "This is a friendly reminder that your account balance is due on Friday. Thank you for banking with us.",
      "sms",
      null,
      1,
    ),
    confirmed(
      "cmp-product-launch",
      "New Product Launch",
      "Our new business account is here. Enjoy zero monthly fees for the first three months.",
      "sms",
      null,
      2,
      false,
    ),
    confirmed(
      "cmp-feedback",
      "Customer Feedback Survey",
      "Tell us how we are doing. The survey takes two minutes and helps us improve your experience.",
      "email",
      "grp-newsletter",
      1,
      true,
      "We would love your feedback",
    ),
    draft(
      "cmp-holiday",
      "Holiday Offers Preview",
      "Get ready for the holiday season with exclusive offers on savings and loans.",
      "sms",
      null,
      0,
    ),
    draft(
      "cmp-partnership",
      "Partnership Update",
      "An update on our partnership programme, including new benefits and support channels.",
      "email",
      "grp-partners",
      0,
      "Partnership programme update",
    ),
    (() => {
      const seed = confirmed(
        "cmp-created-by-team",
        "Customer Appreciation",
        "We appreciate your continued trust. Here is a special offer just for you.",
        "sms",
        "grp-vip",
        0,
        false,
      );
      seed.campaign.createdBy = communicator.id;
      seed.campaign.createdByEmail = communicator.email;
      return seed;
    })(),
  ];
}

function buildApprovals(campaigns: SeedCampaign[], users: AppUser[]): Record<string, CampaignApprover[]> {
  const approvals: Record<string, CampaignApprover[]> = {};
  for (const { campaign, daysAgo } of campaigns) {
    if (campaign.status === "draft" || campaign.approvalState === "waiting") continue;
    const required = campaign.approvalsRequired ?? 1;
    const pool = users.filter(
      (u) => u.id !== campaign.createdBy && u.status === "active" && u.role !== "viewer",
    );
    approvals[campaign.id] = pool.slice(0, required).map((user, index) => ({
      userId: user.id,
      email: user.email,
      approvedAt: iso(Date.now() - daysAgo * DAY + index * 60_000),
    }));
  }
  return approvals;
}

function buildMessages(campaigns: SeedCampaign[], customers: Customer[], members: Record<string, string[]>): Message[] {
  const messages: Message[] = [];
  const now = Date.now();

  for (const { campaign, daysAgo, audienceSize } of campaigns) {
    if (campaign.status !== "dispatched") continue;

    const audienceIds = campaign.groupId ? members[campaign.groupId] ?? [] : customers.map((c) => c.id);
    const audience = audienceIds
      .map((id) => customers.find((c) => c.id === id))
      .filter((c): c is Customer => Boolean(c))
      .slice(0, audienceSize);

    const base = now - daysAgo * DAY;
    let offset = 0;

    for (const customer of audience) {
      const sendSms =
        campaign.channel !== "email" && customer.status === "active" && customer.canReceiveSms;
      const sendEmail =
        campaign.channel !== "sms" && customer.status === "active" && customer.canReceiveEmail;

      for (const channel of (["sms", "email"] as const)) {
        if (channel === "sms" && !sendSms) continue;
        if (channel === "email" && !sendEmail) continue;

        const roll = (offset + daysAgo) % 20;
        const failed = roll === 0;
        const read = channel === "email" && !failed && roll % 3 === 0;
        const delivered = !failed && roll % 5 !== 0;
        const createdAt = base + offset * 45_000;

        messages.push({
          id: `msg-${campaign.id}-${channel}-${customer.id}`,
          campaignId: campaign.id,
          customerId: customer.id,
          channel,
          phone: channel === "sms" ? customer.phone : undefined,
          email: channel === "email" ? customer.email : undefined,
          status: failed ? "failed" : "sent",
          attempts: failed ? 2 : 1,
          lastError: failed ? FAILURE_REASONS[(offset + daysAgo) % FAILURE_REASONS.length] : null,
          providerMessageId: failed ? null : `TRD-${campaign.id.slice(0, 4).toUpperCase()}-${offset + 1}`,
          deliveryStatus: failed ? "failed" : read ? "read" : delivered ? "delivered" : "unknown",
          firstOpenedAt: read ? iso(createdAt + 20 * 60_000) : undefined,
          openCount: read ? 1 + (roll % 3) : 0,
          createdAt: iso(createdAt),
          updatedAt: iso(createdAt + (failed ? 8 : 2) * 60_000),
        });
        offset += 1;
      }
    }
  }

  return messages;
}

function buildSchedules(campaigns: SeedCampaign[]): Schedule[] {
  const now = Date.now();
  const pendingCampaign = campaigns.find((c) => c.campaign.id === "cmp-product-launch")?.campaign;
  const executedCampaign = campaigns.find((c) => c.campaign.id === "cmp-newsletter")?.campaign;
  const cancelledCampaign = campaigns.find((c) => c.campaign.id === "cmp-agm")?.campaign;

  const schedules: Schedule[] = [];
  if (pendingCampaign) {
    schedules.push({
      id: "sch-pending-1",
      campaignId: pendingCampaign.id,
      runAt: iso(now + 2 * DAY),
      status: "pending",
    });
  }
  if (executedCampaign) {
    schedules.push({
      id: "sch-executed-1",
      campaignId: executedCampaign.id,
      runAt: iso(now - 7 * DAY),
      status: "executed",
    });
  }
  if (cancelledCampaign) {
    schedules.push({
      id: "sch-cancelled-1",
      campaignId: cancelledCampaign.id,
      runAt: iso(now - 2 * DAY),
      status: "cancelled",
    });
  }
  return schedules;
}

function buildImports(customers: Customer[]): { imports: ImportSummary[]; rows: Record<string, ImportRow[]> } {
  const summary: ImportSummary = {
    id: "imp-001",
    filename: "vip-customers-october.csv",
    groupId: "grp-vip",
    status: "applied",
    totalRows: 6,
    validRows: 4,
    invalidRows: 1,
    duplicateRows: 1,
  };

  const rows: ImportRow[] = [
    { rowNumber: 1, name: "Amina Wanjiru", phone: customers[10].phone, email: customers[10].email, outcome: "valid", reason: null, customerId: customers[10].id },
    { rowNumber: 2, name: "Brian Otieno", phone: "+254799000111", email: "brian.otieno@example.com", outcome: "valid", reason: null, customerId: "cus-import-1" },
    { rowNumber: 3, name: "Cynthia Mwangi", phone: "+254799000112", email: "", outcome: "valid", reason: null, customerId: "cus-import-2" },
    { rowNumber: 4, name: "David Kamau", phone: "+254799000113", email: "david.kamau@example.com", outcome: "valid", reason: null, customerId: "cus-import-3" },
    { rowNumber: 5, name: "Esther Achieng", phone: "not-a-phone", email: "", outcome: "invalid", reason: "invalid_phone", customerId: null },
    { rowNumber: 6, name: "Amina Wanjiru", phone: customers[10].phone, email: customers[10].email, outcome: "duplicate", reason: "phone_already_exists", customerId: customers[10].id },
  ];

  return {
    imports: [summary],
    rows: { "imp-001": rows },
  };
}

function buildAudit(users: AppUser[], campaigns: SeedCampaign[]): AuditEvent[] {
  const now = Date.now();
  const events: Omit<AuditEvent, "id">[] = [
    { actorId: "usr-manager-1", actorLabel: "grace.mwangi@tierdata.app", action: "campaign.dispatch", targetType: "campaign", targetId: "cmp-payment-reminder", occurredAt: iso(now - 1 * DAY), metadata: "{}" },
    { actorId: "usr-manager-2", actorLabel: "brian.otieno@tierdata.app", action: "campaign.approve", targetType: "campaign", targetId: "cmp-payment-reminder", occurredAt: iso(now - 1 * DAY - 3_600_000), metadata: "{}" },
    { actorId: "demo-user", actorLabel: "demo@tierdata.app", action: "campaign.create", targetType: "campaign", targetId: "cmp-feedback", occurredAt: iso(now - 1 * DAY - 7_200_000), metadata: "{}" },
    { actorId: "usr-comms-1", actorLabel: "faith.wanjiku@tierdata.app", action: "customer.create", targetType: "customer", targetId: "cus-040", occurredAt: iso(now - 2 * DAY), metadata: "{}" },
    { actorId: "demo-user", actorLabel: "demo@tierdata.app", action: "group.create", targetType: "group", targetId: "grp-partners", occurredAt: iso(now - 2 * DAY - 86_400_000), metadata: "{}" },
    { actorId: "demo-user", actorLabel: "demo@tierdata.app", action: "settings.update", targetType: "settings", targetId: "approvals", occurredAt: iso(now - 3 * DAY), metadata: "{}" },
    { actorId: "usr-manager-1", actorLabel: "grace.mwangi@tierdata.app", action: "import.apply", targetType: "import", targetId: "imp-001", occurredAt: iso(now - 4 * DAY), metadata: "{}" },
    { actorId: "demo-user", actorLabel: "demo@tierdata.app", action: "import.create", targetType: "import", targetId: "imp-001", occurredAt: iso(now - 4 * DAY - 3_600_000), metadata: "{}" },
    { actorId: "usr-manager-2", actorLabel: "brian.otieno@tierdata.app", action: "campaign.confirm", targetType: "campaign", targetId: "cmp-product-launch", occurredAt: iso(now - 2 * DAY - 3_600_000), metadata: "{}" },
    { actorId: "usr-comms-1", actorLabel: "faith.wanjiku@tierdata.app", action: "schedule.create", targetType: "schedule", targetId: "sch-pending-1", occurredAt: iso(now - 2 * DAY - 1_800_000), metadata: "{}" },
    { actorId: "demo-user", actorLabel: "demo@tierdata.app", action: "provider.config_update", targetType: "provider", targetId: "tiara", occurredAt: iso(now - 5 * DAY), metadata: "{}" },
    { actorId: "demo-user", actorLabel: "demo@tierdata.app", action: "customer.update_sms_eligibility", targetType: "customer", targetId: "cus-007", occurredAt: iso(now - 5 * DAY - 7_200_000), metadata: "{}" },
    { actorId: "usr-manager-1", actorLabel: "grace.mwangi@tierdata.app", action: "campaign.approve", targetType: "campaign", targetId: "cmp-vip-day", occurredAt: iso(now - 5 * DAY - 3_600_000), metadata: "{}" },
    { actorId: "usr-manager-2", actorLabel: "brian.otieno@tierdata.app", action: "campaign.dispatch", targetType: "campaign", targetId: "cmp-vip-day", occurredAt: iso(now - 5 * DAY), metadata: "{}" },
    { actorId: "demo-user", actorLabel: "demo@tierdata.app", action: "user.role_update", targetType: "user", targetId: "usr-viewer-1", occurredAt: iso(now - 6 * DAY), metadata: "{}" },
    { actorId: "demo-user", actorLabel: "demo@tierdata.app", action: "identity.login", targetType: "session", targetId: "demo-session", occurredAt: iso(now - 7 * DAY), metadata: "{}" },
    { actorId: "usr-comms-1", actorLabel: "faith.wanjiku@tierdata.app", action: "campaign.attachment_add", targetType: "campaign", targetId: "cmp-newsletter", occurredAt: iso(now - 7 * DAY - 1_800_000), metadata: "{}" },
    { actorId: "usr-manager-1", actorLabel: "grace.mwangi@tierdata.app", action: "campaign.dispatch", targetType: "campaign", targetId: "cmp-newsletter", occurredAt: iso(now - 7 * DAY), metadata: "{}" },
  ];

  for (const { campaign, daysAgo } of campaigns) {
    if (campaign.status !== "draft") {
      events.push({
        actorId: campaign.createdBy ?? users[0].id,
        actorLabel: campaign.createdByEmail ?? users[0].email,
        action: "campaign.create",
        targetType: "campaign",
        targetId: campaign.id,
        occurredAt: iso(now - daysAgo * DAY - 6 * 3_600_000),
        metadata: "{}",
      });
    }
  }

  return events.map((event, index) => ({ ...event, id: `aud-${String(index + 1).padStart(3, "0")}` }));
}

export function buildSeed(): DemoDb {
  const customers = buildCustomers();
  const users = buildUsers();
  const { groups, members } = buildGroups(customers);
  const campaigns = buildCampaigns(users);
  const approvals = buildApprovals(campaigns, users);
  const messages = buildMessages(campaigns, customers, members);
  const schedules = buildSchedules(campaigns);
  const { imports, rows } = buildImports(customers);
  const audit = buildAudit(users, campaigns);

  return {
    version: 1,
    sessionEmail: null,
    customers,
    groups,
    groupMembers: members,
    imports,
    importRows: rows,
    campaigns: campaigns.map((seed) => seed.campaign),
    campaignApprovals: approvals,
    attachments: {},
    messages,
    schedules,
    provider: {
      mode: "mock",
      apiKeyMasked: "•••• 4F2A",
      baseUrl: "https://sandbox.tiara.example.com/send",
      active: true,
    },
    email: {
      id: "email-default",
      host: "smtp.mailtrap.io",
      port: 587,
      username: "tierdata-demo",
      sender_email: "no-reply@tierdata.app",
      security_mode: "starttls",
      active: true,
      password_configured: true,
    },
    users,
    audit,
    settings: {
      requiredApprovals: 1,
      smsFooter: "STOP *456*9*5#",
    },
    campaignDraft: null,
  };
}
