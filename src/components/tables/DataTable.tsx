import type { KeyboardEvent, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTableRows } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | null;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription = "There's nothing to show here yet.",
  emptyAction,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) return <SkeletonTableRows columns={columns.length} />;

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="size-5 text-status-red-text" />}
        title="Couldn't load data"
        description={error}
        action={
          onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )
        }
      />
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!onRowClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs font-medium uppercase tracking-wide text-ink-400">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={cn("px-4 py-3 font-medium", col.headerClassName)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => handleKeyDown(e, row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              className={cn(
                "border-b border-border-subtle last:border-0",
                onRowClick &&
                  "cursor-pointer hover:bg-surface-hover focus-visible:outline-none focus-visible:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400",
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 align-middle text-ink-700", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
