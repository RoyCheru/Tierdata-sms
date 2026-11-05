import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination } from "@/types/api";
import { Button } from "@/components/ui/Button";

interface TablePaginationProps {
  pagination: Pagination | null;
  onPageChange: (page: number) => void;
}

export function TablePagination({ pagination, onPageChange }: TablePaginationProps) {
  if (!pagination || pagination.totalCount === 0) return null;

  const { page, totalPages, totalCount, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalCount);

  return (
    <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3">
      <span className="text-sm text-ink-500">
        Showing {start}–{end} of {totalCount}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="text-sm text-ink-500">
          Page {page} of {totalPages || 1}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
