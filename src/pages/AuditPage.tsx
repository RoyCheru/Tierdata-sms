import { useState } from "react";
import { auditApi } from "@/api/audit";
import type { AuditEvent } from "@/types/entities";
import { useListPage } from "@/hooks/useListPage";
import { Avatar } from "@/components/ui/Avatar";
import { actionLabel, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination } from "@/components/tables/TablePagination";

export function AuditPage() {
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");

  const { rows, pagination, loading, error, refetch, setPage } = useListPage<
    AuditEvent,
    { action?: string; targetType?: string }
  >({
    fetcher: auditApi.list,
    limit: 25,
    filters: { action: action || undefined, targetType: targetType || undefined },
  });

  const columns: Column<AuditEvent>[] = [
    {
      key: "occurredAt",
      header: "When",
      render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.occurredAt)}</span>,
    },
    {
      key: "actor",
      header: "Who",
      render: (row) =>
        row.actorLabel ? (
          <span className="flex items-center gap-2" title={row.actorId}>
            <Avatar label={row.actorLabel} size="sm" />
            <span className="max-w-56 truncate">{row.actorLabel}</span>
          </span>
        ) : (
          <span className="block max-w-40 truncate font-mono text-xs text-ink-500" title="Unknown actor">
            {row.actorId}
          </span>
        ),
    },
    {
      key: "action",
      header: "What",
      render: (row) => (
        <div>
          <p className="font-medium text-ink-900">{actionLabel(row.action)}</p>
          <p className="font-mono text-xs text-ink-400">{row.action}</p>
        </div>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (row) => (
        <div>
          <p>{row.targetType.replace(/_/g, " ")}</p>
          <p className="max-w-40 truncate font-mono text-xs text-ink-400" title={row.targetId}>
            {row.targetId}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit log" description="Every write action recorded across the system." />
      <Card>
        <TableToolbar
          filters={
            <>
              <div className="w-72">
                <Input
                  placeholder="Filter by action, e.g. campaign.approve…"
                  aria-label="Filter by action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                />
              </div>
              <div className="w-48">
                <Input
                  placeholder="Filter by target type…"
                  aria-label="Filter by target type"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                />
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
          emptyTitle="No audit events found"
          emptyDescription="Try adjusting your filters, or check back after the next write action."
        />
        <TablePagination pagination={pagination} onPageChange={setPage} />
      </Card>
    </div>
  );
}
