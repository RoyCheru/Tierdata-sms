import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SessionIndicator } from "@/components/layout/SessionIndicator";
import { resolvePageTitle } from "@/components/layout/pageTitle";

function roleLabel(role: string | undefined): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "";
}

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const title = resolvePageTitle(location.pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between sm:h-20 gap-3 border-b border-border-subtle bg-surface-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-hover sm:hidden"
        >
          <Menu className="size-5" />
        </button>
        {/* The page already has its own heading; the title here is only for phones, where the header is the only label. */}
        <h2 className="truncate text-base font-semibold text-ink-900 sm:hidden">{title}</h2>
        <div className="hidden sm:block">
          <SessionIndicator />
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover"
        >
          <Avatar label={user?.email || user?.phone} />
          <div className="hidden text-left leading-tight sm:block">
            <p className="max-w-60 truncate text-sm font-medium text-ink-900">{user?.email || user?.phone}</p>
            <Badge tone="gray" dot={false}>
              {roleLabel(user?.role)}
            </Badge>
          </div>
          <ChevronDown className="size-4 text-ink-400" aria-hidden="true" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-border-subtle bg-white py-1 shadow-lg"
            >
              <div className="border-b border-border-subtle px-3 py-2 sm:hidden">
                <p className="truncate text-sm font-medium text-ink-900">{user?.email || user?.phone}</p>
                <Badge tone="gray" dot={false}>
                  {roleLabel(user?.role)}
                </Badge>
              </div>
              <div className="border-b border-border-subtle px-3 py-2 sm:hidden">
                <SessionIndicator />
              </div>
              <button
                role="menuitem"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-surface-hover"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
