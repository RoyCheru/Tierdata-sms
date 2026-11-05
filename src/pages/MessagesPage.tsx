import { useState } from "react";
import { messagesApi } from "@/api/messages";
import { campaignsApi } from "@/api/campaigns";
import type { Message, MessageStatus } from "@/types/entities";
import { useListPage } from "@/hooks/useListPage";
import { useQuery } from "@/hooks/useApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/tables/DataTable";
import { buildMessageColumns } from "@/components/tables/messageColumns";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination } from "@/components/tables/TablePagination";

export function MessagesPage() {
  const [status, setStatus] = useState<MessageStatus | "">("");
  const [campaignId, setCampaignId] = useState("");

  const { rows, pagination, loading, error, refetch, setPage } = useListPage<
    Message,
    { status?: MessageStatus; campaignId?: string }
  >({
    fetcher: messagesApi.list,
    limit: 20,
    filters: { status: status || undefined, campaignId: campaignId || undefined },
  });

  // The message API only returns campaignId, not the campaign's name - look it up client-side.
  const { data: campaigns } = useQuery(() => campaignsApi.list({ limit: 200 }), []);
  const campaignNameById = new Map((campaigns ?? []).map((c) => [c.id, c.name]));

  const columns = buildMessageColumns({ campaignNames: campaignNameById });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Messages" description="Every SMS and email sent by your campaigns, with delivery and read status." />

      <Card>
        <TableToolbar
          filters={
            <>
              <div className="w-64">
                <Select aria-label="Filter by campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                  <option value="">All campaigns</option>
                  {(campaigns ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-44">
                <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as MessageStatus | "")}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                </Select>
              </div>
            </>
          }
        />
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          emptyTitle="No messages found"
          emptyDescription="Messages appear here once a campaign is dispatched."
        />
        <TablePagination pagination={pagination} onPageChange={setPage} />
      </Card>
    </div>
  );
}
