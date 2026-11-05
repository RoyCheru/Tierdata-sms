import { http } from "@/lib/http";

export interface CampaignOptions {
  // The line added to the end of every campaign SMS (never emails); "" when switched off.
  smsFooter: string;
  maxLength: number;
}

export const campaignOptionsApi = {
  // Readable by anyone who works on campaigns, not only admins.
  get: () => http.get<CampaignOptions>("/campaign-options"),
};
