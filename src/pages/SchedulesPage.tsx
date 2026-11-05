import { useState } from "react";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { schedulesApi } from "@/api/schedules";
import { campaignsApi } from "@/api/campaigns";
import type { Schedule } from "@/types/entities";
import { useListPage } from "@/hooks/useListPage";
import { useMutation, useQuery } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TablePagination } from "@/components/tables/TablePagination";
import { scheduleStatusTone } from "@/lib/statusTones";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";

export function SchedulesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = can(user?.role, "schedules:write");
  const [cancelling, setCancelling] = useState<Schedule | null>(null);

  const { rows, pagination, loading, error, refetch, setPage } = useListPage<Schedule>({
    fetcher: schedulesApi.list,
    limit: 20,
  });

  // The schedule API only returns campaignId, not the campaign's name - look it up client-side.
  const { data: campaigns } = useQuery(() => campaignsApi.list({ limit: 200 }), []);
  const campaignNameById = new Map((campaigns ?? []).map((c) => [c.id, c.name]));

  const [cancel, cancelState] = useMutation((id: string) => schedulesApi.cancel(id));

  async function handleCancel() {
    if (!cancelling) return;
    await cancel(cancelling.id);
    toast.success("Schedule cancelled.");
    setCancelling(null);
    refetch();
  }

  const columns: Column<Schedule>[] = [
    {
      key: "campaignId",
      header: "Campaign",
      render: (row) => (
        <Link to={`/campaigns/${row.campaignId}`} className="text-brand-600 hover:underline">
          {campaignNameById.get(row.campaignId) ?? row.campaignId}
        </Link>
      ),
    },
    { key: "runAt", header: "Run at", render: (row) => formatDateTime(row.runAt) },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} toneMap={scheduleStatusTone} /> },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            headerClassName: "w-24",
            className: "text-right",
            render: (row: Schedule) =>
              row.status === "pending" && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Cancel this schedule"
                    onClick={() => setCancelling(row)}
                  >
                    <XCircle className="size-4 text-status-red-text" aria-hidden="true" />
                  </Button>
                </div>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Scheduled campaigns" description="Campaigns queued to dispatch automatically." />
      <Card>
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          emptyTitle="Nothing scheduled"
          emptyDescription="Schedule a confirmed campaign from its detail page."
        />
        <TablePagination pagination={pagination} onPageChange={setPage} />
      </Card>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={handleCancel}
        loading={cancelState.loading}
        tone="danger"
        title="Cancel this schedule?"
        description="The campaign will no longer dispatch automatically. You can schedule it again later."
        confirmLabel="Cancel schedule"
      />
    </div>
  );
}
