import { Link } from "react-router-dom";
import type { Message } from "@/types/entities";
import type { Column } from "@/components/tables/DataTable";
import { ChannelIcon } from "@/components/ui/ChannelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { deliveryStatusTone, messageStatusTone } from "@/lib/statusTones";
import { formatDateTime } from "@/lib/format";
import { formatRelativeTime } from "@/lib/relativeTime";

/**
 * Columns for a list of outbound messages, shared by the Messages page and a
 * campaign's own message list. Pass `campaignNames` to include a Campaign column.
 * Kept to six compact columns so the table fits without scrolling sideways.
 */
export function buildMessageColumns(options: { campaignNames?: Map<string, string> } = {}): Column<Message>[] {
  const { campaignNames } = options;

  const columns: Column<Message>[] = [
    {
      key: "recipient",
      header: "Recipient",
      render: (m) => (
        <span className="flex items-center gap-2">
          <ChannelIcon channel={m.channel} />
          <span className="max-w-52 truncate">{m.channel === "email" ? m.email : m.phone}</span>
        </span>
      ),
    },
  ];

  if (campaignNames) {
    columns.push({
      key: "campaign",
      header: "Campaign",
      render: (m) => (
        <Link
          to={`/campaigns/${m.campaignId}`}
          title={campaignNames.get(m.campaignId) ?? m.campaignId}
          className="block max-w-48 truncate text-brand-600 hover:underline"
        >
          {campaignNames.get(m.campaignId) ?? m.campaignId}
        </Link>
      ),
    });
  }

  columns.push(
    {
      key: "status",
      header: "Status",
      render: (m) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <StatusBadge status={m.status} toneMap={messageStatusTone} />
          {m.attempts > 0 && <span className="text-xs text-ink-400">{m.attempts} {m.attempts === 1 ? "try" : "tries"}</span>}
        </span>
      ),
    },
    {
      key: "delivery",
      header: "Delivery",
      render: (m) => (
        <span
          className="flex items-center gap-2 whitespace-nowrap"
          title={m.openCount > 0 ? `First opened ${formatDateTime(m.firstOpenedAt)}` : undefined}
        >
          <StatusBadge status={m.deliveryStatus} toneMap={deliveryStatusTone} />
          {m.openCount > 0 && <span className="text-xs text-ink-400">opened {m.openCount}×</span>}
        </span>
      ),
    },
    {
      key: "error",
      header: "Error",
      render: (m) =>
        m.lastError ? (
          <span title={m.lastError} className="block max-w-56 truncate text-status-red-text">
            {m.lastError}
          </span>
        ) : (
          <span className="text-ink-300">-</span>
        ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (m) => (
        <span title={formatDateTime(m.updatedAt)} className="whitespace-nowrap text-ink-500">
          {formatRelativeTime(m.updatedAt)}
        </span>
      ),
    },
  );

  return columns;
}
