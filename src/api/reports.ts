import { http } from "@/lib/http";
import { request } from "@/lib/http";
import type { CampaignInsights, CampaignReport, ReportOverview } from "@/types/entities";

export const reportsApi = {
  overview: (days: number) => http.get<ReportOverview>(`/reports/overview?days=${days}`),

  campaignInsights: (campaignId: string) =>
    http.get<CampaignInsights>(`/reports/campaigns/${campaignId}/insights`),

  campaignReport: (campaignId: string) => http.get<CampaignReport>(`/reports/campaigns/${campaignId}`),

  /** The PDF is built by the backend; this returns the finished file. */
  async downloadSummaryPdf(days: number): Promise<Blob> {
    const response = await request<Response>(`/reports/summary.pdf?days=${days}`, { raw: true });
    return response.blob();
  },

  async downloadCampaignPdf(campaignId: string): Promise<Blob> {
    const response = await request<Response>(`/reports/campaigns/${campaignId}/report.pdf`, { raw: true });
    return response.blob();
  },

  async downloadCampaignExport(campaignId: string): Promise<Blob> {
    const response = await request<Response>(`/reports/campaigns/${campaignId}/export`, { raw: true });
    return response.blob();
  },
};
