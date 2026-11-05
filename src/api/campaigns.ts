import { http, request } from "@/lib/http";
import type {
  Campaign,
  CampaignConfirmResult,
  CampaignPreview,
  CampaignRecipient,
  CampaignApprovals,
  CampaignAttachment,
  AudienceType,
  CampaignChannel,
} from "@/types/entities";
import type { ListParams } from "@/types/api";

export const campaignsApi = {
  list: (params: ListParams = {}) => http.list<Campaign[]>("/campaigns/", { ...params }),
  get: (id: string) => http.get<Campaign>(`/campaigns/${id}`),
  // No senderId here - every campaign sends from the app's single fixed sender ID, set server-side.
  create: (input: {
    name: string;
    message: string;
    audienceType: AudienceType;
    groupId?: string;
    channel: CampaignChannel;
    emailSubject?: string;
    greeting?: string;
    includeName?: boolean;
  }) =>
    http.post<Campaign>("/campaigns/", input),
  preview: (id: string) => http.post<CampaignPreview>(`/campaigns/${id}/preview`),
  confirm: (id: string) => http.post<CampaignConfirmResult>(`/campaigns/${id}/confirm`),
  send: (id: string) => http.post<Campaign>(`/campaigns/${id}/send`),
  approvals: (id: string) => http.get<CampaignApprovals>(`/campaigns/${id}/approvals`),
  approve: (id: string) => http.post<CampaignApprovals>(`/campaigns/${id}/approve`),
  attachments: (id: string) => http.get<{ files: CampaignAttachment[] }>(`/campaigns/${id}/attachments`),
  // One file per request (multipart field "file"); the server checks type, size and contents.
  uploadAttachment: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post<CampaignAttachment>(`/campaigns/${id}/attachments`, form);
  },
  deleteAttachment: (id: string, attachmentId: string) => http.delete<null>(`/campaigns/${id}/attachments/${attachmentId}`),
  async downloadAttachment(id: string, attachmentId: string): Promise<Blob> {
    const response = await request<Response>(`/campaigns/${id}/attachments/${attachmentId}`, { raw: true });
    return response.blob();
  },
  recipients: (id: string) => http.get<CampaignRecipient[]>(`/campaigns/${id}/recipients`),
};
