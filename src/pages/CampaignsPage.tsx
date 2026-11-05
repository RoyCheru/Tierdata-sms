import { Avatar } from "@/components/ui/Avatar";
import { ChannelBadge } from "@/components/ui/ChannelBadge";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { campaignsApi } from "@/api/campaigns";
import { groupsApi } from "@/api/groups";
import { useQuery } from "@/hooks/useApi";
import { audienceLabel } from "@/lib/audience";
import type { Campaign } from "@/types/entities";
import { useListPage } from "@/hooks/useListPage";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CampaignStatusBadge } from "@/components/ui/CampaignStatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination } from "@/components/tables/TablePagination";
import { CampaignFormModal } from "@/pages/campaigns/CampaignFormModal";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";

export function CampaignsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = can(user?.role, "campaigns:write");
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  const { rows, pagination, loading, error, refetch, setPage, search, onSearchChange } = useListPage<Campaign>({
    fetcher: campaignsApi.list,
  });

  // Look up the name of each group audience on this page (one small request per distinct group).
  const groupIds = useMemo(
    () => [...new Set((rows ?? []).map((row) => row.groupId).filter((id): id is string => Boolean(id)))],
    [rows],
  );
  const { data: groupNames } = useQuery(async () => {
    const entries = await Promise.all(
      groupIds.map(async (id) => {
        try {
          return [id, (await groupsApi.get(id)).name] as const;
        } catch {
          return [id, "Deleted group"] as const;
        }
      }),
    );
    return new Map<string, string>(entries);
  }, [groupIds.join(",")]);

  const columns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Campaign",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{row.name}</p>
          <p className="truncate text-xs text-ink-500">{row.message}</p>
        </div>
      ),
      className: "max-w-sm",
    },
    { key: "channel", header: "Channel", render: (row) => <ChannelBadge channel={row.channel} className="whitespace-nowrap" /> },
    { key: "audience", header: "Audience", render: (row) => <span className="block max-w-44 truncate" title={audienceLabel(row, row.groupId ? groupNames?.get(row.groupId) : undefined)}>{audienceLabel(row, row.groupId ? groupNames?.get(row.groupId) : undefined)}</span> },
    {
      key: "createdBy",
      header: "Created by",
      render: (row) =>
        row.createdByEmail ? (
          <span className="flex items-center gap-2">
            <Avatar label={row.createdByEmail} size="sm" />
            <span className="max-w-44 truncate">{row.createdByEmail}</span>
          </span>
        ) : (
          <span className="text-ink-300">-</span>
        ),
    },
    { key: "status", header: "Status", render: (row) => <CampaignStatusBadge campaign={row} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        description="Plan, approve and send SMS and email campaigns."
        action={
          canWrite && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              New campaign
            </Button>
          )
        }
      />

      <Card>
        <TableToolbar search={search} onSearchChange={onSearchChange} searchPlaceholder="Search campaigns…" />
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          onRowClick={(row) => navigate(`/campaigns/${row.id}`)}
          emptyTitle="No campaigns found"
          emptyDescription="Create a campaign to start reaching your customers."
          emptyAction={
            canWrite && (
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" />
                New campaign
              </Button>
            )
          }
        />
        <TablePagination pagination={pagination} onPageChange={setPage} />
      </Card>

      <CampaignFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(campaign, failedUploads) => {
          setFormOpen(false);
          if (failedUploads.length > 0) {
            toast.error(
              `Campaign created as a draft, but ${failedUploads.length} ${failedUploads.length === 1 ? "file" : "files"} could not be attached (${failedUploads.join("; ")}). You can add them on the campaign page.`,
            );
          } else {
            toast.success("Campaign created as a draft.");
          }
          refetch();
          navigate(`/campaigns/${campaign.id}`);
        }}
      />
    </div>
  );
}
