import { http } from "@/lib/http";

/** The new-campaign form as typed so far. Kept on the server, private to the person typing it. */
export interface CampaignFormDraft {
  name: string;
  message: string;
  audienceType: string;
  groupId: string;
  channel: string;
  emailSubject: string;
  greetingChoice: string;
  customGreeting: string;
  includeName: boolean;
}

export interface SavedCampaignDraft {
  form: CampaignFormDraft;
  updatedAt: string;
}

export const campaignDraftApi = {
  // null when nothing is saved.
  get: () => http.get<SavedCampaignDraft | null>("/me/campaign-draft"),
  // Saving a blank form clears the draft (the server returns null then).
  save: (form: CampaignFormDraft) => http.put<SavedCampaignDraft | null>("/me/campaign-draft", form),
  remove: () => http.delete<null>("/me/campaign-draft"),
};
