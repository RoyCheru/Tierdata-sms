import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface TableToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function TableToolbar({ search, onSearchChange, searchPlaceholder = "Search...", filters, actions }: TableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-4">
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <div className="w-64">
            <Input
              icon={<Search className="size-4" />}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {filters}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
