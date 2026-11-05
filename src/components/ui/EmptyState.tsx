import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-sunken text-ink-400">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ink-900">{title}</p>
        {description && <p className="text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
