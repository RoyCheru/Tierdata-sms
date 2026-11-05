import type { CampaignFormDraft } from "@/api/campaignDraft";
import type {
  AppUser,
  AuditEvent,
  Campaign,
  CampaignApprover,
  CampaignAttachment,
  Customer,
  EmailConfig,
  Group,
  ImportRow,
  ImportSummary,
  Message,
  ProviderConfig,
  Schedule,
} from "@/types/entities";

export interface DemoSettings {
  requiredApprovals: number;
  smsFooter: string;
}

export interface DemoDb {
  version: number;
  sessionEmail: string | null;
  customers: Customer[];
  groups: Group[];
  groupMembers: Record<string, string[]>;
  imports: ImportSummary[];
  importRows: Record<string, ImportRow[]>;
  campaigns: Campaign[];
  campaignApprovals: Record<string, CampaignApprover[]>;
  attachments: Record<string, CampaignAttachment[]>;
  messages: Message[];
  schedules: Schedule[];
  provider: ProviderConfig;
  email: EmailConfig;
  users: AppUser[];
  audit: AuditEvent[];
  settings: DemoSettings;
  campaignDraft: { form: CampaignFormDraft; updatedAt: string } | null;
}
