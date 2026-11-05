import { http } from "@/lib/http";
import type { ApprovalSettings } from "@/types/entities";

export interface SmsFooterSettings {
  smsFooter: string;
  maxLength: number;
}

export const settingsApi = {
  getSmsFooter: () => http.get<SmsFooterSettings>("/settings/sms-footer"),
  saveSmsFooter: (smsFooter: string) => http.put<SmsFooterSettings>("/settings/sms-footer", { smsFooter }),
  getApprovals: () => http.get<ApprovalSettings>("/settings/approvals"),
  saveApprovals: (requiredApprovals: number) => http.put<ApprovalSettings>("/settings/approvals", { requiredApprovals }),
};
