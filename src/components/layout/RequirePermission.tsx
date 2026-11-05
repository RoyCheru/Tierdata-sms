import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { can, type Permission } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShieldAlert } from "lucide-react";

export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { user } = useAuth();

  if (!can(user?.role, permission)) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-5 text-status-red-text" />}
        title="You don't have access to this page"
        description="Your role doesn't include permission to view this section. Contact an administrator if you believe this is a mistake."
      />
    );
  }

  return <>{children}</>;
}
