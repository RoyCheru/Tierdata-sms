import type { CampaignFormDraft } from "@/api/campaignDraft";
import { ApiError } from "@/types/api";
import type { Pagination } from "@/types/api";
import type {
  AppUser,
  Campaign,
  CampaignApprovals,
  CampaignAttachment,
  CampaignChannel,
  CampaignPreview,
  CampaignRecipient,
  CampaignReport,
  ChannelStats,
  Customer,
  DashboardAnalytics,
  ImportRow,
  ImportSummary,
  Message,
  ReportCampaignRow,
  ReportFailure,
  ReportOverview,
  Role,
  Schedule,
  Session,
  CurrentUser,
  SmsEligibility,
} from "@/types/entities";
import { addAudit, getDb, newId, nowIso, saveDb } from "./db";
import { buildPdf } from "./pdf";
import type { DemoDb } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const attachmentBlobs = new Map<string, Blob>();

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Query = Record<string, string | number | boolean | undefined | null>;

interface Handled {
  data: unknown;
  pagination: Pagination | null;
}

function done<T>(data: T, pagination: Pagination | null = null): Handled {
  return { data, pagination };
}

function parsePath(path: string, query?: Query): { pathname: string; params: URLSearchParams } {
  const [rawPath, rawQuery] = path.split("?");
  const params = new URLSearchParams(rawQuery ?? "");
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
  }
  return { pathname: rawPath.replace(/\/+$/, "") || "/", params };
}

function pageOf<T>(items: T[], params: URLSearchParams): { data: T[]; pagination: Pagination } {
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1);
  const limit = Math.max(Number(params.get("limit") ?? 20) || 20, 1);
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / limit);
  return {
    data: items.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, totalCount, totalPages },
  };
}

function objectBody(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && !(body instanceof FormData)
    ? (body as Record<string, unknown>)
    : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requireSession(db: DemoDb): string {
  if (!db.sessionEmail) throw new ApiError(401, "Please sign in to continue.");
  return db.sessionEmail;
}

function demoUser(db: DemoDb): AppUser {
  return db.users.find((user) => user.id === "demo-user") ?? db.users[0];
}

function currentUser(db: DemoDb): CurrentUser {
  const email = requireSession(db);
  const user = demoUser(db);
  return {
    userId: user.id,
    email,
    phone: user.phone,
    role: "admin",
    status: "active",
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    expiresInSeconds: 30 * 60,
  };
}

function findCampaign(db: DemoDb, id: string): Campaign {
  const campaign = db.campaigns.find((item) => item.id === id);
  if (!campaign) throw new ApiError(404, "Campaign not found.");
  return campaign;
}

function findCustomer(db: DemoDb, id: string): Customer {
  const customer = db.customers.find((item) => item.id === id);
  if (!customer) throw new ApiError(404, "Customer not found.");
  return customer;
}

function audienceFor(db: DemoDb, campaign: Campaign): Customer[] {
  if (campaign.audienceType === "group" && campaign.groupId) {
    const ids = db.groupMembers[campaign.groupId] ?? [];
    return ids
      .map((id) => db.customers.find((customer) => customer.id === id))
      .filter((customer): customer is Customer => Boolean(customer));
  }
  return db.customers;
}

function deliveryFor(customer: Customer, channel: CampaignChannel): {
  sendSms: boolean;
  sendEmail: boolean;
  eligible: boolean;
  reason: string | null;
} {
  const smsOk = customer.status === "active" && customer.canReceiveSms && Boolean(customer.phone);
  const emailOk = customer.status === "active" && customer.canReceiveEmail && Boolean(customer.email);
  const sendSms = channel !== "email" && smsOk;
  const sendEmail = channel !== "sms" && emailOk;

  let reason: string | null = null;
  if (!sendSms && !sendEmail) {
    if (customer.status !== "active") reason = "customer_inactive";
    else if (channel !== "email" && customer.smsEligibility !== "eligible") reason = customer.smsEligibility;
    else if (channel !== "email" && !customer.phone) reason = "no_phone";
    else if (channel !== "sms" && !customer.email) reason = "no_email";
    else reason = "not_eligible";
  }

  return { sendSms, sendEmail, eligible: sendSms || sendEmail, reason };
}

function previewFor(db: DemoDb, campaign: Campaign): CampaignPreview {
  const audience = audienceFor(db, campaign);
  let eligibleCount = 0;
  const excludedReasons: Record<string, number> = {};

  for (const customer of audience) {
    const delivery = deliveryFor(customer, campaign.channel);
    if (delivery.eligible) eligibleCount += 1;
    else if (delivery.reason) excludedReasons[delivery.reason] = (excludedReasons[delivery.reason] ?? 0) + 1;
  }

  return {
    totalCandidates: audience.length,
    eligibleCount,
    excludedCount: audience.length - eligibleCount,
    excludedReasons,
  };
}

function recipientsFor(db: DemoDb, campaign: Campaign): CampaignRecipient[] {
  return audienceFor(db, campaign).map((customer) => {
    const delivery = deliveryFor(customer, campaign.channel);
    return {
      customerId: customer.id,
      phone: customer.phone,
      email: customer.email,
      eligible: delivery.eligible,
      reason: delivery.reason,
      sendSms: delivery.sendSms,
      sendEmail: delivery.sendEmail,
    };
  });
}

function approvalsFor(db: DemoDb, campaign: Campaign): CampaignApprovals {
  const approvers = db.campaignApprovals[campaign.id] ?? [];
  const required = campaign.approvalsRequired ?? db.settings.requiredApprovals;
  return {
    required,
    approved: approvers.length,
    satisfied: approvers.length >= required,
    approvers,
  };
}

function emptyStats(): ChannelStats {
  return { messages: 0, delivered: 0, sentUnconfirmed: 0, waiting: 0, failed: 0, opened: 0 };
}

function addToStats(stats: ChannelStats, message: Message): void {
  stats.messages += 1;
  if (message.status === "pending" || message.status === "processing") {
    stats.waiting += 1;
  } else if (message.status === "failed" || message.deliveryStatus === "failed") {
    stats.failed += 1;
  } else if (message.deliveryStatus === "delivered" || message.deliveryStatus === "read") {
    stats.delivered += 1;
  } else {
    stats.sentUnconfirmed += 1;
  }
  if (message.channel === "email" && message.openCount > 0) stats.opened += 1;
}

function statsFor(messages: Message[]): ReportOverview["channels"] {
  const sms = emptyStats();
  const email = emptyStats();
  const total = emptyStats();
  for (const message of messages) {
    addToStats(message.channel === "sms" ? sms : email, message);
    addToStats(total, message);
  }
  return { sms, email, total };
}

function failuresFor(messages: Message[]): ReportFailure[] {
  const counts = new Map<string, number>();
  for (const message of messages) {
    if (message.status !== "failed" || !message.lastError) continue;
    counts.set(message.lastError, (counts.get(message.lastError) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

function localDateKey(value: string | number | Date): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function campaignReportFor(db: DemoDb, campaignId: string): CampaignReport {
  const messages = db.messages.filter((message) => message.campaignId === campaignId);
  const report: CampaignReport = {
    campaignId,
    totalMessages: messages.length,
    pending: 0,
    sent: 0,
    failed: 0,
    deliveryDelivered: 0,
    deliveryFailed: 0,
    deliveryPending: 0,
    deliveryRead: 0,
    deliveryUnknown: 0,
  };
  for (const message of messages) {
    if (message.status === "pending" || message.status === "processing") report.pending += 1;
    else if (message.status === "failed") report.failed += 1;
    else report.sent += 1;

    if (message.deliveryStatus === "delivered") report.deliveryDelivered += 1;
    else if (message.deliveryStatus === "read") report.deliveryRead += 1;
    else if (message.deliveryStatus === "failed") report.deliveryFailed += 1;
    else if (message.deliveryStatus === "pending") report.deliveryPending += 1;
    else report.deliveryUnknown += 1;
  }
  return report;
}

function overviewFor(db: DemoDb, days: number): ReportOverview {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const from = startOfToday.getTime() - (days - 1) * DAY;
  const messages = db.messages.filter((message) => new Date(message.createdAt).getTime() >= from);
  const byCampaign = new Map<string, Message[]>();
  for (const message of messages) {
    const list = byCampaign.get(message.campaignId) ?? [];
    list.push(message);
    byCampaign.set(message.campaignId, list);
  }

  const rows: ReportCampaignRow[] = [];
  for (const [campaignId, list] of byCampaign) {
    const campaign = db.campaigns.find((item) => item.id === campaignId);
    if (!campaign) continue;
    const firstMessageAt = list.reduce(
      (earliest, message) => (message.createdAt < earliest ? message.createdAt : earliest),
      list[0].createdAt,
    );
    rows.push({
      id: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status,
      firstMessageAt,
      channels: statsFor(list),
    });
  }
  rows.sort((a, b) => b.firstMessageAt.localeCompare(a.firstMessageAt));

  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(from + index * DAY);
    return { date: localDateKey(date), delivered: 0, sentUnconfirmed: 0, waiting: 0, failed: 0 };
  });
  const dayIndex = new Map(daily.map((day, index) => [day.date, index]));
  for (const message of messages) {
    const index = dayIndex.get(localDateKey(message.createdAt));
    if (index === undefined) continue;
    const day = daily[index];
    if (message.status === "pending" || message.status === "processing") day.waiting += 1;
    else if (message.status === "failed" || message.deliveryStatus === "failed") day.failed += 1;
    else if (message.deliveryStatus === "delivered" || message.deliveryStatus === "read") day.delivered += 1;
    else day.sentUnconfirmed += 1;
  }

  return {
    from: localDateKey(from),
    to: localDateKey(now),
    days,
    campaigns: rows.length,
    channels: statsFor(messages),
    daily,
    failures: failuresFor(messages),
    rows,
    approvals: {
      waitingNow: db.campaigns.filter((campaign) => campaign.status === "confirmed" && campaign.approvalState === "waiting").length,
      averageMinutes: 18,
      sampleSize: Object.keys(db.campaignApprovals).length,
    },
  };
}

function campaignInsightsFor(db: DemoDb, id: string) {
  const campaign = findCampaign(db, id);
  const messages = db.messages.filter((message) => message.campaignId === id);
  const firstMessageAt = messages.reduce<string | null>(
    (earliest, message) => (earliest === null || message.createdAt < earliest ? message.createdAt : earliest),
    null,
  );
  const lastActivityAt = messages.reduce<string | null>(
    (latest, message) => (latest === null || message.updatedAt > latest ? message.updatedAt : latest),
    null,
  );
  const openCounts = new Map<string, number>();
  for (const message of messages) {
    if (message.channel !== "email" || message.openCount === 0) continue;
    const key = localDateKey(message.firstOpenedAt ?? message.createdAt);
    openCounts.set(key, (openCounts.get(key) ?? 0) + message.openCount);
  }
  const opensDaily = [...openCounts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    id: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
    status: campaign.status,
    createdByEmail: campaign.createdByEmail ?? "",
    createdAt: null,
    confirmedAt: null,
    firstMessageAt,
    lastActivityAt,
    channels: statsFor(messages),
    failures: failuresFor(messages),
    approvals: approvalsFor(db, campaign).approvers.map((approver) => ({
      email: approver.email,
      approvedAt: approver.approvedAt,
    })),
    approvalsRequired: campaign.approvalsRequired ?? db.settings.requiredApprovals,
    opensDaily,
  };
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function campaignCsv(db: DemoDb, campaignId: string): string {
  const campaign = findCampaign(db, campaignId);
  const messages = db.messages.filter((message) => message.campaignId === campaignId);
  const lines: (string | number)[][] = [
    ["Campaign", campaign.name],
    [],
    ["Recipient", "Channel", "Status", "Delivery", "Attempts", "Error", "Created"],
  ];
  for (const message of messages) {
    lines.push([
      message.channel === "email" ? message.email ?? "" : message.phone ?? "",
      message.channel,
      message.status,
      message.deliveryStatus,
      message.attempts,
      message.lastError ?? "",
      message.createdAt,
    ]);
  }
  return lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
}

function summaryPdf(db: DemoDb, days: number): Blob {
  const overview = overviewFor(db, days);
  const lines = [
    `Period: last ${days} days (${overview.from} to ${overview.to})`,
    "",
    "Totals",
    `Messages: ${overview.channels.total.messages}`,
    `Delivered: ${overview.channels.total.delivered}`,
    `Sent, not confirmed: ${overview.channels.total.sentUnconfirmed}`,
    `Waiting: ${overview.channels.total.waiting}`,
    `Failed: ${overview.channels.total.failed}`,
    `Emails opened: ${overview.channels.email.opened}`,
    "",
    "Campaigns",
    ...overview.rows.map(
      (row) =>
        `${row.name} | ${row.channel} | ${row.channels.total.messages} messages | ${row.channels.total.delivered} delivered | ${row.channels.total.failed} failed`,
    ),
    "",
    "Failure causes",
    ...(overview.failures.length > 0
      ? overview.failures.map((failure) => `${failure.reason}: ${failure.count}`)
      : ["No failures in this period."]),
  ];
  return buildPdf("TierData SMS - Summary Report", lines);
}

function campaignPdf(db: DemoDb, campaignId: string): Blob {
  const campaign = findCampaign(db, campaignId);
  const report = campaignReportFor(db, campaignId);
  const insights = campaignInsightsFor(db, campaignId);
  const lines = [
    `Channel: ${campaign.channel}`,
    `Status: ${campaign.status}`,
    "",
    "Outcome",
    `Total messages: ${report.totalMessages}`,
    `Sent: ${report.sent}`,
    `Waiting: ${report.pending}`,
    `Failed: ${report.failed}`,
    `Delivered: ${report.deliveryDelivered}`,
    `Read: ${report.deliveryRead}`,
    "",
    "Failure causes",
    ...(insights.failures.length > 0
      ? insights.failures.map((failure) => `${failure.reason}: ${failure.count}`)
      : ["No failures for this campaign."]),
    "",
    "Approvals",
    ...(insights.approvals.length > 0
      ? insights.approvals.map((approval) => `${approval.email} at ${approval.approvedAt}`)
      : ["No approvals recorded."]),
  ];
  return buildPdf(`TierData SMS - ${campaign.name}`, lines);
}

async function handle(path: string, method: Method, body: unknown, query?: Query): Promise<Handled> {
  const db = getDb();
  const { pathname, params } = parsePath(path, query);
  const input = objectBody(body);

  if (method === "POST" && pathname === "/auth/demo-login") {
    const identifier = str(input.identifier).trim().toLowerCase();
    if (!identifier || !identifier.includes("@")) {
      throw new ApiError(400, "Enter a valid email address.");
    }
    db.sessionEmail = identifier;
    const user = demoUser(db);
    user.role = "admin";
    user.status = "active";
    if (!db.users.some((item) => item.id !== user.id && item.email.toLowerCase() === identifier)) {
      user.email = identifier;
    }
    addAudit(db, "identity.login", "session", "demo-session");
    saveDb();
    const session: Session = {
      sessionId: "demo-session",
      userId: user.id,
      email: identifier,
      phone: user.phone,
      role: "admin",
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      expiresInSeconds: 30 * 60,
    };
    return done(session);
  }

  if (method === "GET" && pathname === "/auth/session") {
    return done(currentUser(db));
  }

  if (method === "POST" && pathname === "/auth/logout") {
    db.sessionEmail = null;
    saveDb();
    return done(null);
  }

  if (method === "POST" && pathname === "/auth/session/extend") {
    requireSession(db);
    addAudit(db, "identity.session_extend", "session", "demo-session");
    saveDb();
    return done({
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      expiresInSeconds: 30 * 60,
    });
  }

  requireSession(db);

  if (method === "GET" && pathname === "/analytics/dashboard") {
    const analytics: DashboardAnalytics = {
      customers: {
        total: db.customers.length,
        active: db.customers.filter((customer) => customer.status === "active").length,
        inactive: db.customers.filter((customer) => customer.status === "inactive").length,
        optedOut: db.customers.filter((customer) => customer.smsEligibility === "opted_out").length,
        unsubscribed: db.customers.filter((customer) => customer.smsEligibility === "unsubscribed").length,
      },
      groups: { total: db.groups.length },
      campaigns: {
        total: db.campaigns.length,
        draft: db.campaigns.filter((campaign) => campaign.status === "draft").length,
        confirmed: db.campaigns.filter((campaign) => campaign.status === "confirmed").length,
        dispatched: db.campaigns.filter((campaign) => campaign.status === "dispatched").length,
        waitingApproval: db.campaigns.filter(
          (campaign) => campaign.status === "confirmed" && campaign.approvalState === "waiting",
        ).length,
      },
      messages: {
        total: db.messages.length,
        pending: db.messages.filter((message) => message.status === "pending" || message.status === "processing").length,
        sent: db.messages.filter((message) => message.status === "sent").length,
        failed: db.messages.filter((message) => message.status === "failed").length,
        delivered: db.messages.filter(
          (message) => message.deliveryStatus === "delivered" || message.deliveryStatus === "read",
        ).length,
      },
      imports: {
        total: db.imports.length,
        applied: db.imports.filter((item) => item.status === "applied").length,
      },
      schedules: {
        total: db.schedules.length,
        pending: db.schedules.filter((schedule) => schedule.status === "pending").length,
        executed: db.schedules.filter((schedule) => schedule.status === "executed").length,
      },
      senders: { active: 1 },
    };
    return done(analytics);
  }

  if (method === "GET" && pathname === "/customers") {
    const search = (params.get("search") ?? "").toLowerCase();
    const status = params.get("status");
    const smsEligibility = params.get("smsEligibility");
    const items = db.customers.filter((customer) => {
      if (status && customer.status !== status) return false;
      if (smsEligibility && customer.smsEligibility !== smsEligibility) return false;
      if (!search) return true;
      return (
        customer.name.toLowerCase().includes(search) ||
        customer.phone.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search)
      );
    });
    const page = pageOf(items, params);
    return done(page.data, page.pagination);
  }

  if (method === "POST" && pathname === "/customers") {
    const name = str(input.name).trim();
    const phone = str(input.phone).trim();
    const email = str(input.email).trim();
    if (!name || !phone) throw new ApiError(400, "Name and phone number are required.");
    if (db.customers.some((customer) => customer.phone === phone)) {
      throw new ApiError(409, "A customer with this phone number already exists.");
    }
    const customer: Customer = {
      id: newId("cus"),
      name,
      phone,
      email,
      status: "active",
      smsEligibility: "eligible",
      canReceiveSms: true,
      canReceiveEmail: Boolean(email),
    };
    db.customers.unshift(customer);
    addAudit(db, "customer.create", "customer", customer.id);
    saveDb();
    return done(customer);
  }

  const customerMatch = pathname.match(/^\/customers\/([^/]+)$/);
  if (customerMatch && method === "GET") {
    return done(findCustomer(db, customerMatch[1]));
  }

  if (customerMatch && method === "PUT") {
    const customer = findCustomer(db, customerMatch[1]);
    const name = str(input.name).trim();
    const phone = str(input.phone).trim();
    const email = str(input.email).trim();
    if (!name || !phone) throw new ApiError(400, "Name and phone number are required.");
    if (db.customers.some((item) => item.id !== customer.id && item.phone === phone)) {
      throw new ApiError(409, "A customer with this phone number already exists.");
    }
    customer.name = name;
    customer.phone = phone;
    customer.email = email;
    customer.canReceiveEmail = customer.status === "active" && Boolean(email);
    addAudit(db, "customer.update", "customer", customer.id);
    saveDb();
    return done(customer);
  }

  const customerActionMatch = pathname.match(/^\/customers\/([^/]+)\/(archive|activate|sms-eligibility)$/);
  if (customerActionMatch && (method === "POST" || method === "PATCH")) {
    const customer = findCustomer(db, customerActionMatch[1]);
    const action = customerActionMatch[2];
    if (action === "archive") {
      customer.status = "inactive";
      customer.smsEligibility = "opted_out";
      customer.canReceiveSms = false;
      customer.canReceiveEmail = false;
      addAudit(db, "customer.archive", "customer", customer.id);
    } else if (action === "activate") {
      customer.status = "active";
      customer.canReceiveSms = customer.smsEligibility === "eligible";
      customer.canReceiveEmail = Boolean(customer.email);
      addAudit(db, "customer.activate", "customer", customer.id);
    } else {
      const eligibility = str(input.smsEligibility) as SmsEligibility;
      customer.smsEligibility = eligibility;
      customer.canReceiveSms = customer.status === "active" && eligibility === "eligible";
      addAudit(db, "customer.update_sms_eligibility", "customer", customer.id, { smsEligibility: eligibility });
    }
    saveDb();
    return done(customer);
  }

  if (method === "GET" && pathname === "/groups") {
    const search = (params.get("search") ?? "").toLowerCase();
    const items = db.groups.filter(
      (group) =>
        !search ||
        group.name.toLowerCase().includes(search) ||
        group.description.toLowerCase().includes(search),
    );
    const page = pageOf(items, params);
    return done(page.data, page.pagination);
  }

  if (method === "POST" && pathname === "/groups") {
    const name = str(input.name).trim();
    const description = str(input.description).trim();
    if (!name) throw new ApiError(400, "Group name is required.");
    const group = { id: newId("grp"), name, description };
    db.groups.unshift(group);
    db.groupMembers[group.id] = [];
    addAudit(db, "group.create", "group", group.id);
    saveDb();
    return done(group);
  }

  const groupMatch = pathname.match(/^\/groups\/([^/]+)$/);
  if (groupMatch && method === "GET") {
    const group = db.groups.find((item) => item.id === groupMatch[1]);
    if (!group) throw new ApiError(404, "Group not found.");
    return done(group);
  }

  const groupMembersMatch = pathname.match(/^\/groups\/([^/]+)\/members$/);
  if (groupMembersMatch) {
    const group = db.groups.find((item) => item.id === groupMembersMatch[1]);
    if (!group) throw new ApiError(404, "Group not found.");
    if (method === "GET") {
      const members = (db.groupMembers[group.id] ?? [])
        .map((id) => db.customers.find((customer) => customer.id === id))
        .filter((customer): customer is Customer => Boolean(customer))
        .map((customer) => ({ customerId: customer.id, name: customer.name, phone: customer.phone }));
      return done({ groupId: group.id, members, count: members.length });
    }
    if (method === "POST") {
      const customerId = str(input.customerId);
      findCustomer(db, customerId);
      const members = db.groupMembers[group.id] ?? [];
      if (!members.includes(customerId)) members.push(customerId);
      db.groupMembers[group.id] = members;
      addAudit(db, "group.member_add", "group", group.id, { customerId });
      saveDb();
      return done(null);
    }
  }

  const groupMemberMatch = pathname.match(/^\/groups\/([^/]+)\/members\/([^/]+)$/);
  if (groupMemberMatch && method === "DELETE") {
    const group = db.groups.find((item) => item.id === groupMemberMatch[1]);
    if (!group) throw new ApiError(404, "Group not found.");
    db.groupMembers[group.id] = (db.groupMembers[group.id] ?? []).filter((id) => id !== groupMemberMatch[2]);
    addAudit(db, "group.member_remove", "group", group.id, { customerId: groupMemberMatch[2] });
    saveDb();
    return done(null);
  }

  if (method === "POST" && pathname === "/imports") {
    if (!(body instanceof FormData)) throw new ApiError(400, "Choose a CSV file to import.");
    const file = body.get("file");
    const groupId = str(body.get("groupId"));
    if (!(file instanceof File)) throw new ApiError(400, "Choose a CSV file to import.");

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) throw new ApiError(400, "The file is empty.");

    const first = lines[0].toLowerCase();
    const hasHeader = first.includes("name") && first.includes("phone");
    const rowsToParse = hasHeader ? lines.slice(1) : lines;
    const rows: ImportRow[] = [];
    const seenPhones = new Set(db.customers.map((customer) => customer.phone));

    rowsToParse.forEach((line, index) => {
      const columns = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
      const name = columns[0] ?? "";
      const phone = (columns[1] ?? "").replace(/\s+/g, "");
      const email = columns[2] ?? "";
      const validPhone = /^\+?\d{9,15}$/.test(phone);
      const existing = db.customers.find((customer) => customer.phone === phone);
      if (!name || !validPhone) {
        rows.push({
          rowNumber: index + 1,
          name,
          phone,
          email,
          outcome: "invalid",
          reason: !name ? "missing_name" : "invalid_phone",
          customerId: null,
        });
      } else if (seenPhones.has(phone)) {
        rows.push({
          rowNumber: index + 1,
          name,
          phone,
          email,
          outcome: "duplicate",
          reason: "phone_already_exists",
          customerId: existing?.id ?? null,
        });
      } else {
        seenPhones.add(phone);
        rows.push({
          rowNumber: index + 1,
          name,
          phone,
          email,
          outcome: "valid",
          reason: null,
          customerId: null,
        });
      }
    });

    const summary: ImportSummary = {
      id: newId("imp"),
      filename: file.name,
      groupId: groupId || null,
      status: "validated",
      totalRows: rows.length,
      validRows: rows.filter((row) => row.outcome === "valid").length,
      invalidRows: rows.filter((row) => row.outcome === "invalid").length,
      duplicateRows: rows.filter((row) => row.outcome === "duplicate").length,
    };
    db.imports.unshift(summary);
    db.importRows[summary.id] = rows;
    addAudit(db, "import.create", "import", summary.id, { filename: file.name });
    saveDb();
    return done(summary);
  }

  const importMatch = pathname.match(/^\/imports\/([^/]+)$/);
  if (importMatch && method === "GET") {
    const summary = db.imports.find((item) => item.id === importMatch[1]);
    if (!summary) throw new ApiError(404, "Import not found.");
    return done(summary);
  }

  const importRowsMatch = pathname.match(/^\/imports\/([^/]+)\/rows$/);
  if (importRowsMatch && method === "GET") {
    return done(db.importRows[importRowsMatch[1]] ?? []);
  }

  const importApplyMatch = pathname.match(/^\/imports\/([^/]+)\/apply$/);
  if (importApplyMatch && method === "POST") {
    const summary = db.imports.find((item) => item.id === importApplyMatch[1]);
    if (!summary) throw new ApiError(404, "Import not found.");
    if (summary.status === "applied") return done(null);
    const rows = db.importRows[summary.id] ?? [];
    for (const row of rows) {
      if (row.outcome === "valid" && !db.customers.some((customer) => customer.phone === row.phone)) {
        const customer: Customer = {
          id: newId("cus"),
          name: row.name,
          phone: row.phone,
          email: row.email ?? "",
          status: "active",
          smsEligibility: "eligible",
          canReceiveSms: true,
          canReceiveEmail: Boolean(row.email),
        };
        db.customers.unshift(customer);
        row.customerId = customer.id;
      }
      const customerId =
        row.customerId ?? db.customers.find((customer) => customer.phone === row.phone)?.id ?? null;
      if (summary.groupId && customerId) {
        const members = db.groupMembers[summary.groupId] ?? [];
        if (!members.includes(customerId)) members.push(customerId);
        db.groupMembers[summary.groupId] = members;
      }
    }
    summary.status = "applied";
    addAudit(db, "import.apply", "import", summary.id);
    saveDb();
    return done(null);
  }

  if (method === "GET" && pathname === "/campaigns") {
    const search = (params.get("search") ?? "").toLowerCase();
    const items = db.campaigns.filter(
      (campaign) =>
        !search ||
        campaign.name.toLowerCase().includes(search) ||
        campaign.message.toLowerCase().includes(search),
    );
    const page = pageOf(items, params);
    return done(page.data, page.pagination);
  }

  if (method === "POST" && pathname === "/campaigns") {
    const channel = (str(input.channel) || "sms") as CampaignChannel;
    const campaign: Campaign = {
      id: newId("cmp"),
      name: str(input.name).trim(),
      message: str(input.message).trim(),
      senderId: "TIERDATA",
      audienceType: input.audienceType === "group" ? "group" : "all",
      groupId: str(input.groupId) || null,
      channel,
      emailSubject: channel === "sms" ? undefined : str(input.emailSubject),
      status: "draft",
      createdBy: demoUser(db).id,
      createdByEmail: db.sessionEmail ?? demoUser(db).email,
      greeting: str(input.greeting) || undefined,
      includeName: Boolean(input.includeName),
    };
    db.campaigns.unshift(campaign);
    addAudit(db, "campaign.create", "campaign", campaign.id);
    saveDb();
    return done(campaign);
  }

  const campaignMatch = pathname.match(/^\/campaigns\/([^/]+)$/);
  if (campaignMatch && method === "GET") {
    return done(findCampaign(db, campaignMatch[1]));
  }

  const campaignActionMatch = pathname.match(/^\/campaigns\/([^/]+)\/(preview|confirm|send|approve)$/);
  if (campaignActionMatch && method === "POST") {
    const campaign = findCampaign(db, campaignActionMatch[1]);
    const action = campaignActionMatch[2];

    if (action === "preview") return done(previewFor(db, campaign));

    if (action === "confirm") {
      if (campaign.status !== "draft") throw new ApiError(400, "This campaign has already been confirmed.");
      const summary = previewFor(db, campaign);
      const required = db.settings.requiredApprovals;
      const pool = db.users.filter(
        (user) =>
          user.id !== campaign.createdBy &&
          user.status === "active" &&
          (user.role === "admin" || user.role === "manager"),
      );
      const chosen = pool.slice(0, required);
      let synthetic = 1;
      while (chosen.length < required) {
        chosen.push({
          id: `usr-demo-approver-${synthetic}`,
          email: `approver${synthetic}@tierdata.app`,
          phone: "",
          role: "manager",
          status: "active",
        });
        synthetic += 1;
      }
      db.campaignApprovals[campaign.id] = chosen.map((user, index) => ({
        userId: user.id,
        email: user.email,
        approvedAt: new Date(Date.now() + index * 1000).toISOString(),
      }));
      campaign.status = "confirmed";
      campaign.approvalsRequired = required;
      campaign.approvalsReceived = chosen.length;
      campaign.approvalState = chosen.length >= required ? "approved" : "waiting";
      addAudit(db, "campaign.confirm", "campaign", campaign.id);
      saveDb();
      return done({ campaign, summary });
    }

    if (action === "approve") {
      if (campaign.status !== "confirmed") throw new ApiError(400, "Only confirmed campaigns can be approved.");
      if (campaign.createdBy === demoUser(db).id) {
        throw new ApiError(403, "You cannot approve a campaign you created.");
      }
      const approvers = db.campaignApprovals[campaign.id] ?? [];
      const email = db.sessionEmail ?? "";
      if (!approvers.some((approver) => approver.userId === demoUser(db).id)) {
        approvers.push({ userId: demoUser(db).id, email, approvedAt: nowIso() });
      }
      db.campaignApprovals[campaign.id] = approvers;
      campaign.approvalsReceived = approvers.length;
      campaign.approvalState = approvers.length >= (campaign.approvalsRequired ?? 1) ? "approved" : "waiting";
      addAudit(db, "campaign.approve", "campaign", campaign.id);
      saveDb();
      return done(approvalsFor(db, campaign));
    }

    if (action === "send") {
      if (campaign.status === "draft") throw new ApiError(400, "Confirm the audience before sending.");
      if (!approvalsFor(db, campaign).satisfied) {
        throw new ApiError(403, "This campaign still needs approval before it can be sent.");
      }
      if (campaign.status === "dispatched") return done(campaign);

      const recipients = recipientsFor(db, campaign).filter((recipient) => recipient.eligible);
      let offset = 0;
      for (const recipient of recipients) {
        const customer = findCustomer(db, recipient.customerId);
        const channels: Array<"sms" | "email"> = [];
        if (recipient.sendSms) channels.push("sms");
        if (recipient.sendEmail) channels.push("email");

        for (const channel of channels) {
          const roll = offset % 19;
          const failed = roll === 0;
          const read = channel === "email" && !failed && roll % 3 === 0;
          const delivered = !failed && roll % 5 !== 0;
          db.messages.unshift({
            id: newId("msg"),
            campaignId: campaign.id,
            customerId: customer.id,
            channel,
            phone: channel === "sms" ? customer.phone : undefined,
            email: channel === "email" ? customer.email : undefined,
            status: failed ? "failed" : "sent",
            attempts: failed ? 2 : 1,
            lastError: failed ? "provider_timeout" : null,
            providerMessageId: failed ? null : `TRD-${Date.now().toString(36).toUpperCase()}-${offset}`,
            deliveryStatus: failed ? "failed" : read ? "read" : delivered ? "delivered" : "unknown",
            firstOpenedAt: read ? nowIso() : undefined,
            openCount: read ? 1 : 0,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          });
          offset += 1;
        }
      }
      campaign.status = "dispatched";
      addAudit(db, "campaign.dispatch", "campaign", campaign.id);
      saveDb();
      return done(campaign);
    }
  }

  const campaignApprovalsMatch = pathname.match(/^\/campaigns\/([^/]+)\/approvals$/);
  if (campaignApprovalsMatch && method === "GET") {
    return done(approvalsFor(db, findCampaign(db, campaignApprovalsMatch[1])));
  }

  const campaignRecipientsMatch = pathname.match(/^\/campaigns\/([^/]+)\/recipients$/);
  if (campaignRecipientsMatch && method === "GET") {
    return done(recipientsFor(db, findCampaign(db, campaignRecipientsMatch[1])));
  }

  const campaignAttachmentsMatch = pathname.match(/^\/campaigns\/([^/]+)\/attachments$/);
  if (campaignAttachmentsMatch) {
    const campaign = findCampaign(db, campaignAttachmentsMatch[1]);
    if (method === "GET") {
      return done({ files: db.attachments[campaign.id] ?? [] });
    }
    if (method === "POST") {
      if (!(body instanceof FormData)) throw new ApiError(400, "Choose a file to attach.");
      const file = body.get("file");
      if (!(file instanceof File)) throw new ApiError(400, "Choose a file to attach.");
      const attachment: CampaignAttachment = {
        id: newId("att"),
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      };
      db.attachments[campaign.id] = [...(db.attachments[campaign.id] ?? []), attachment];
      attachmentBlobs.set(`${campaign.id}:${attachment.id}`, file);
      addAudit(db, "campaign.attachment_add", "campaign", campaign.id, { filename: file.name });
      saveDb();
      return done(attachment);
    }
  }

  const campaignAttachmentMatch = pathname.match(/^\/campaigns\/([^/]+)\/attachments\/([^/]+)$/);
  if (campaignAttachmentMatch && method === "DELETE") {
    const campaignId = campaignAttachmentMatch[1];
    const attachmentId = campaignAttachmentMatch[2];
    db.attachments[campaignId] = (db.attachments[campaignId] ?? []).filter((file) => file.id !== attachmentId);
    attachmentBlobs.delete(`${campaignId}:${attachmentId}`);
    addAudit(db, "campaign.attachment_remove", "campaign", campaignId);
    saveDb();
    return done(null);
  }

  if (method === "GET" && pathname === "/messages") {
    const campaignId = params.get("campaignId");
    const status = params.get("status");
    const search = (params.get("search") ?? "").toLowerCase();
    const items = db.messages
      .filter((message) => {
        if (campaignId && message.campaignId !== campaignId) return false;
        if (status && message.status !== status) return false;
        if (!search) return true;
        return (
          (message.phone ?? "").toLowerCase().includes(search) ||
          (message.email ?? "").toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = pageOf(items, params);
    return done(page.data, page.pagination);
  }

  if (method === "GET" && pathname === "/schedules") {
    const items = [...db.schedules].sort((a, b) => b.runAt.localeCompare(a.runAt));
    const page = pageOf(items, params);
    return done(page.data, page.pagination);
  }

  if (method === "POST" && pathname === "/schedules") {
    const campaignId = str(input.campaignId);
    findCampaign(db, campaignId);
    const schedule: Schedule = {
      id: newId("sch"),
      campaignId,
      runAt: str(input.runAt),
      status: "pending",
    };
    db.schedules.unshift(schedule);
    addAudit(db, "schedule.create", "schedule", schedule.id, { campaignId });
    saveDb();
    return done(schedule);
  }

  const scheduleMatch = pathname.match(/^\/schedules\/([^/]+)$/);
  if (scheduleMatch && method === "PATCH") {
    const schedule = db.schedules.find((item) => item.id === scheduleMatch[1]);
    if (!schedule) throw new ApiError(404, "Schedule not found.");
    schedule.runAt = str(input.runAt);
    saveDb();
    return done(schedule);
  }

  const scheduleCancelMatch = pathname.match(/^\/schedules\/([^/]+)\/cancel$/);
  if (scheduleCancelMatch && method === "POST") {
    const schedule = db.schedules.find((item) => item.id === scheduleCancelMatch[1]);
    if (!schedule) throw new ApiError(404, "Schedule not found.");
    schedule.status = "cancelled";
    addAudit(db, "schedule.cancel", "schedule", schedule.id);
    saveDb();
    return done(schedule);
  }

  if (method === "GET" && pathname === "/provider/tiara") {
    return done(db.provider);
  }

  if (method === "PUT" && pathname === "/provider/tiara") {
    db.provider.mode = input.mode === "live" ? "live" : "mock";
    db.provider.baseUrl = str(input.baseUrl);
    const apiKey = str(input.apiKey);
    if (apiKey) db.provider.apiKeyMasked = `•••• ${apiKey.slice(-4).toUpperCase()}`;
    db.provider.active = db.provider.mode === "mock" || Boolean(db.provider.baseUrl && db.provider.apiKeyMasked);
    addAudit(db, "provider.config_update", "provider", "tiara");
    saveDb();
    return done(db.provider);
  }

  if (method === "POST" && pathname === "/provider/tiara/test") {
    addAudit(db, "provider.test", "provider", "tiara");
    saveDb();
    return done({ success: true, balance: 12450.75, currency: "KES" });
  }

  if (method === "POST" && pathname === "/provider/tiara/test-sms") {
    addAudit(db, "provider.send_test", "provider", "tiara", { phone: str(input.phone) });
    saveDb();
    return done({
      success: true,
      providerMessageId: `TEST-${Date.now().toString(36).toUpperCase()}`,
      status: "submitted",
    });
  }

  if (method === "GET" && pathname === "/provider/email") {
    return done(db.email);
  }

  if (method === "PUT" && pathname === "/provider/email") {
    db.email = {
      ...db.email,
      host: str(input.host),
      port: Number(input.port) || 587,
      username: str(input.username),
      sender_email: str(input.sender_email),
      security_mode: "starttls",
      active: true,
      password_configured: Boolean(str(input.password)) || db.email.password_configured,
    };
    addAudit(db, "provider.config_update", "provider", "email");
    saveDb();
    return done(db.email);
  }

  if (method === "POST" && pathname === "/provider/email/test") {
    return done({ success: true });
  }

  if (method === "GET" && pathname === "/settings/sms-footer") {
    return done({ smsFooter: db.settings.smsFooter, maxLength: 60 });
  }

  if (method === "PUT" && pathname === "/settings/sms-footer") {
    db.settings.smsFooter = str(input.smsFooter).trim().slice(0, 60);
    addAudit(db, "settings.update", "settings", "sms-footer");
    saveDb();
    return done({ smsFooter: db.settings.smsFooter, maxLength: 60 });
  }

  if (method === "GET" && pathname === "/settings/approvals") {
    return done({
      requiredApprovals: db.settings.requiredApprovals,
      minApprovals: 1,
      maxApprovals: 10,
    });
  }

  if (method === "PUT" && pathname === "/settings/approvals") {
    const required = Math.min(Math.max(Number(input.requiredApprovals) || 1, 1), 10);
    db.settings.requiredApprovals = required;
    addAudit(db, "settings.update", "settings", "approvals", { requiredApprovals: required });
    saveDb();
    return done({ requiredApprovals: required, minApprovals: 1, maxApprovals: 10 });
  }

  if (method === "GET" && pathname === "/campaign-options") {
    return done({ smsFooter: db.settings.smsFooter, maxLength: 60 });
  }

  if (method === "GET" && pathname === "/users") {
    const search = (params.get("search") ?? "").toLowerCase();
    const items = db.users.filter(
      (user) =>
        !search ||
        user.email.toLowerCase().includes(search) ||
        user.phone.toLowerCase().includes(search),
    );
    const page = pageOf(items, params);
    return done(page.data, page.pagination);
  }

  if (method === "POST" && pathname === "/users") {
    const email = str(input.email).trim();
    const phone = str(input.phone).trim();
    const role = (str(input.role) || "viewer") as Role;
    if (!email && !phone) throw new ApiError(400, "At least one of email or phone is required.");
    const user: AppUser = {
      id: newId("usr"),
      email,
      phone,
      role,
      status: "active",
    };
    db.users.push(user);
    addAudit(db, "user.create", "user", user.id);
    saveDb();
    return done({ ...user, inviteSent: Boolean(email) });
  }

  const userActionMatch = pathname.match(/^\/users\/([^/]+)\/(invite|deactivate|role)$/);
  if (userActionMatch) {
    const user = db.users.find((item) => item.id === userActionMatch[1]);
    if (!user) throw new ApiError(404, "User not found.");
    const action = userActionMatch[2];
    if (action === "invite" && method === "POST") {
      if (!user.email) throw new ApiError(400, "This user has no email address.");
      return done(null);
    }
    if (action === "deactivate" && method === "POST") {
      user.status = "inactive";
      addAudit(db, "user.deactivate", "user", user.id);
      saveDb();
      return done(user);
    }
    if (action === "role" && method === "PATCH") {
      user.role = str(input.role) as Role;
      addAudit(db, "user.role_update", "user", user.id, { role: user.role });
      saveDb();
      return done(user);
    }
  }

  if (method === "GET" && pathname === "/audit/events") {
    const action = (params.get("action") ?? "").toLowerCase();
    const targetType = (params.get("targetType") ?? "").toLowerCase();
    const items = db.audit
      .filter((event) => {
        if (action && !event.action.toLowerCase().includes(action)) return false;
        if (targetType && !event.targetType.toLowerCase().includes(targetType)) return false;
        return true;
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    const page = pageOf(items, params);
    return done(page.data, page.pagination);
  }

  if (method === "GET" && pathname === "/reports/overview") {
    const days = Math.max(Number(params.get("days") ?? 30) || 30, 1);
    return done(overviewFor(db, days));
  }

  const insightsMatch = pathname.match(/^\/reports\/campaigns\/([^/]+)\/insights$/);
  if (insightsMatch && method === "GET") {
    return done(campaignInsightsFor(db, insightsMatch[1]));
  }

  const reportMatch = pathname.match(/^\/reports\/campaigns\/([^/]+)$/);
  if (reportMatch && method === "GET") {
    return done(campaignReportFor(db, reportMatch[1]));
  }

  if (pathname === "/me/campaign-draft") {
    if (method === "GET") return done(db.campaignDraft);
    if (method === "PUT") {
      const form = body as CampaignFormDraft;
      const blank = !(
        form.name.trim() ||
        form.message.trim() ||
        form.emailSubject.trim() ||
        form.customGreeting.trim() ||
        form.greetingChoice ||
        form.includeName
      );
      db.campaignDraft = blank ? null : { form, updatedAt: nowIso() };
      saveDb();
      return done(db.campaignDraft);
    }
    if (method === "DELETE") {
      db.campaignDraft = null;
      saveDb();
      return done(null);
    }
  }

  throw new ApiError(404, `No demo endpoint for ${method} ${pathname}.`);
}

export async function demoRequest<T>(
  path: string,
  method: Method,
  body?: unknown,
  query?: Query,
): Promise<T> {
  const result = await handle(path, method, body, query);
  return result.data as T;
}

export async function demoPaginated<T>(
  path: string,
  method: Method,
  query?: Query,
): Promise<{ data: T; pagination: Pagination | null }> {
  const result = await handle(path, method, undefined, query);
  return { data: result.data as T, pagination: result.pagination };
}

export async function demoRawRequest(
  path: string,
  method: Method,
  query?: Query,
): Promise<Response> {
  const db = getDb();
  const { pathname, params } = parsePath(path, query);
  requireSession(db);

  if (method === "GET" && pathname === "/reports/summary.pdf") {
    const days = Math.max(Number(params.get("days") ?? 30) || 30, 1);
    return new Response(summaryPdf(db, days), { headers: { "Content-Type": "application/pdf" } });
  }

  const campaignPdfMatch = pathname.match(/^\/reports\/campaigns\/([^/]+)\/report\.pdf$/);
  if (campaignPdfMatch && method === "GET") {
    return new Response(campaignPdf(db, campaignPdfMatch[1]), {
      headers: { "Content-Type": "application/pdf" },
    });
  }

  const campaignExportMatch = pathname.match(/^\/reports\/campaigns\/([^/]+)\/export$/);
  if (campaignExportMatch && method === "GET") {
    return new Response(campaignCsv(db, campaignExportMatch[1]), {
      headers: { "Content-Type": "text/csv;charset=utf-8" },
    });
  }

  const attachmentMatch = pathname.match(/^\/campaigns\/([^/]+)\/attachments\/([^/]+)$/);
  if (attachmentMatch && method === "GET") {
    const attachmentId = attachmentMatch[2];
    const blob =
      attachmentBlobs.get(`${attachmentMatch[1]}:${attachmentId}`) ??
      new Blob([`Demo attachment ${attachmentId}`], { type: "text/plain" });
    return new Response(blob);
  }

  throw new ApiError(404, `No demo download for ${method} ${pathname}.`);
}
