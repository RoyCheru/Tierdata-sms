export type Role = "admin" | "manager" | "communicator" | "viewer";
export type UserStatus = "active" | "inactive";

export interface AppUser {
  id: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
}

export interface Session {
  sessionId: string;
  userId: string;
  email: string;
  phone: string;
  role: Role;
  expiresAt: string;
  expiresInSeconds: number;
}

export interface CurrentUser {
  userId: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  expiresAt: string;
  expiresInSeconds: number;
}

export type CustomerStatus = "active" | "inactive";
export type SmsEligibility = "eligible" | "opted_out" | "unsubscribed";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: CustomerStatus;
  smsEligibility: SmsEligibility;
  canReceiveSms: boolean;
  canReceiveEmail: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
}

export interface GroupMember {
  customerId: string;
  name: string;
  phone: string;
}

export interface GroupMembers {
  groupId: string;
  members: GroupMember[];
  count: number;
}

export type ImportStatus = "validated" | "applied";
export type ImportRowOutcome = "valid" | "invalid" | "duplicate";

export interface ImportSummary {
  id: string;
  filename: string;
  groupId: string | null;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
}

export interface ImportRow {
  rowNumber: number;
  name: string;
  phone: string;
  email?: string;
  outcome: ImportRowOutcome;
  reason: string | null;
  customerId: string | null;
}

export type ProviderMode = "mock" | "live";

export interface ProviderConfig {
  mode: ProviderMode;
  apiKeyMasked: string;
  baseUrl: string;
  active: boolean;
}

export interface ProviderTestResult {
  success: boolean;
  balance?: number;
  currency?: string;
}

export interface SendTestMessageResult {
  success: boolean;
  providerMessageId: string;
  status: string;
}

export type EmailSecurityMode = "starttls";

export interface EmailConfig {
  id: string;
  host: string;
  port: number;
  username: string;
  sender_email: string;
  security_mode: EmailSecurityMode;
  active: boolean;
  password_configured: boolean;
}

export interface EmailConfigInput {
  host: string;
  port: number;
  username: string;
  password: string;
  sender_email: string;
  security_mode: EmailSecurityMode;
}

export interface EmailTestResult {
  success: boolean;
}

export type AudienceType = "all" | "group";
export type CampaignStatus = "draft" | "confirmed" | "dispatched";

export type CampaignChannel = "sms" | "email" | "both";

export interface Campaign {
  id: string;
  name: string;
  message: string;
  senderId: string;
  audienceType: AudienceType;
  groupId: string | null;
  channel: CampaignChannel;
  emailSubject?: string;
  status: CampaignStatus;
  createdBy?: string;
  createdByEmail?: string;
  greeting?: string;
  includeName?: boolean;
  // Set for a confirmed campaign: "waiting" until it has enough approvals, then "approved".
  approvalState?: "waiting" | "approved";
  approvalsRequired?: number;
  approvalsReceived?: number;
}

export interface CampaignPreview {
  totalCandidates: number;
  eligibleCount: number;
  excludedCount: number;
  excludedReasons: Record<string, number>;
}

export interface CampaignConfirmResult {
  campaign: Campaign;
  summary: CampaignPreview;
}

export interface CampaignRecipient {
  customerId: string;
  phone: string;
  email?: string;
  eligible: boolean;
  reason: string | null;
  sendSms: boolean;
  sendEmail: boolean;
}

export type MessageStatus = "pending" | "processing" | "sent" | "failed";
// "read" is email only: the recipient opened it (tracking pixel loaded).
export type DeliveryStatus = "unknown" | "pending" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  campaignId: string;
  customerId: string;
  channel: "sms" | "email";
  phone?: string;
  email?: string;
  status: MessageStatus;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
  deliveryStatus: DeliveryStatus;
  firstOpenedAt?: string;
  openCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleStatus = "pending" | "executed" | "cancelled";

export interface Schedule {
  id: string;
  campaignId: string;
  runAt: string;
  status: ScheduleStatus;
}

export interface CampaignReport {
  campaignId: string;
  totalMessages: number;
  pending: number;
  sent: number;
  failed: number;
  deliveryDelivered: number;
  deliveryFailed: number;
  deliveryPending: number;
  deliveryRead: number;
  deliveryUnknown: number;
}

export interface DashboardAnalytics {
  customers: { total: number; active: number; inactive: number; optedOut: number; unsubscribed: number };
  groups: { total: number };
  campaigns: { total: number; draft: number; confirmed: number; dispatched: number; waitingApproval: number };
  messages: { total: number; pending: number; sent: number; failed: number; delivered: number };
  imports: { total: number; applied: number };
  schedules: { total: number; pending: number; executed: number };
  senders: { active: number };
}

export interface AuditEvent {
  id: string;
  actorId: string;
  // Email/phone of the actor, "System" for automated actions, empty if unknown.
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string;
  occurredAt: string;
  metadata: string;
}

export interface CampaignApprover {
  userId: string;
  email: string;
  approvedAt: string;
}

export interface CampaignApprovals {
  required: number;
  approved: number;
  satisfied: boolean;
  approvers: CampaignApprover[];
}

export interface ApprovalSettings {
  requiredApprovals: number;
  minApprovals: number;
  maxApprovals: number;
}

export interface CampaignAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface ChannelStats {
  messages: number;
  delivered: number;
  sentUnconfirmed: number;
  waiting: number;
  failed: number;
  opened: number;
}

export interface ReportChannels {
  sms: ChannelStats;
  email: ChannelStats;
  total: ChannelStats;
}

export interface ReportDay {
  date: string;
  delivered: number;
  sentUnconfirmed: number;
  waiting: number;
  failed: number;
}

export interface ReportFailure {
  reason: string;
  count: number;
}

export interface ReportCampaignRow {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: string;
  firstMessageAt: string;
  channels: ReportChannels;
}

export interface ReportOverview {
  from: string;
  to: string;
  days: number;
  campaigns: number;
  channels: ReportChannels;
  daily: ReportDay[];
  failures: ReportFailure[];
  rows: ReportCampaignRow[];
  approvals: { waitingNow: number; averageMinutes: number; sampleSize: number };
}

export interface CampaignInsights {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: string;
  createdByEmail: string;
  createdAt: string | null;
  confirmedAt: string | null;
  firstMessageAt: string | null;
  lastActivityAt: string | null;
  channels: ReportChannels;
  failures: ReportFailure[];
  approvals: { email: string; approvedAt: string }[];
  approvalsRequired: number;
  opensDaily: { date: string; count: number }[];
}
