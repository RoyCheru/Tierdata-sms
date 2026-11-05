import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { campaignsApi } from "@/api/campaigns";
import { reportsApi } from "@/api/reports";
import { useMutation, useQuery } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { downloadText, saveBlob, summaryCsv } from "@/lib/reportDocument";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const PERIODS = [7, 30, 90];

export function ReportsPage() {
  const [days, setDays] = useState(30);
  const [campaignId, setCampaignId] = useState("");
  const { data: campaigns } = useQuery(() => campaignsApi.list({ limit: 200 }), []);

  const [summaryPdf, summaryPdfState] = useMutation(async () => {
    saveBlob(`tierdata-report-last-${days}-days.pdf`, await reportsApi.downloadSummaryPdf(days));
  });
  const [summaryCsvDownload, summaryCsvState] = useMutation(async () => {
    downloadText(`tierdata-report-last-${days}-days.csv`, summaryCsv(await reportsApi.overview(days)));
  });
  const [campaignPdf, campaignPdfState] = useMutation(async () => {
    saveBlob(`campaign-${campaignId}-report.pdf`, await reportsApi.downloadCampaignPdf(campaignId));
  });
  const [messagesCsv, messagesCsvState] = useMutation(async () => {
    saveBlob(`campaign-${campaignId}-messages.csv`, await reportsApi.downloadCampaignExport(campaignId));
  });

  const error = summaryPdfState.error ?? summaryCsvState.error ?? campaignPdfState.error ?? messagesCsvState.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Download a report to share or keep. The live charts are on the Dashboard."
      />
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary report</CardTitle>
            <CardDescription>
              All campaigns for a period: totals, delivery rate, failure causes, each campaign and every day.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div role="group" aria-label="Period" className="inline-flex self-start rounded-lg bg-surface-sunken p-0.5">
              {PERIODS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    days === d ? "bg-surface-card text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700",
                  )}
                >
                  Last {d} days
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button loading={summaryPdfState.loading} onClick={() => void summaryPdf()}>
                <FileText className="size-4" />
                Download PDF
              </Button>
              <Button variant="secondary" loading={summaryCsvState.loading} onClick={() => void summaryCsvDownload()}>
                <FileSpreadsheet className="size-4" />
                Download Excel (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign report</CardTitle>
            <CardDescription>
              One campaign: outcome by channel, failure causes and who approved it. The CSV lists every message.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Select label="Campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">Select a campaign</option>
              {(campaigns ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!campaignId} loading={campaignPdfState.loading} onClick={() => void campaignPdf()}>
                <FileText className="size-4" />
                Download PDF
              </Button>
              <Button variant="secondary" disabled={!campaignId} loading={messagesCsvState.loading} onClick={() => void messagesCsv()}>
                <Download className="size-4" />
                All messages (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
