import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_SECTIONS } from "@/components/layout/nav";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/cn";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile, collapsed, onToggleCollapsed }: SidebarProps) {
  const { user } = useAuth();

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(user?.role, item.permission)),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink-900/40 sm:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}
      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col gap-1 border-r border-border-subtle bg-surface-card pb-4 transition-[width,transform] duration-200",
          "sm:static sm:translate-x-0",
          collapsed ? "sm:w-18" : "sm:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/*
          Same height as the page header (h-16, h-20 on desktop) with its own bottom border, so the
          two borders read as one continuous line across the top of the screen and the
          logo sits centred in its own band instead of crowding the header line.
        */}
        <div
          className={cn(
            "mb-4 flex h-16 shrink-0 items-center border-b sm:h-20 border-border-subtle px-5",
            collapsed && "sm:justify-center sm:px-0",
          )}
        >
          {/* Mobile drawer always has room for the full logo; the desktop rail swaps to the mark when collapsed. */}
          <img src="/tierdata-logo.png" alt="TierData" className={cn("h-12 w-auto object-contain sm:h-16", collapsed && "sm:hidden")} />
          <img
            src="/tierdata-mark.png"
            alt="TierData"
            className={cn("hidden size-8 shrink-0 object-contain", collapsed && "sm:block")}
          />
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 sm:px-2">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <span
                className={cn(
                  "px-2 pb-1 text-xs font-medium uppercase tracking-wide text-ink-400",
                  collapsed && "sm:hidden",
                )}
              >
                {section.label}
              </span>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobile}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-ink-500 transition-colors",
                      "hover:bg-surface-hover hover:text-ink-700",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                      collapsed && "sm:w-10 sm:justify-center sm:px-0",
                      isActive && "bg-brand-50 font-medium text-brand-600",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-600 sm:block"
                          aria-hidden="true"
                        />
                      )}
                      <item.icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className={cn(collapsed && "sm:hidden")}>{item.label}</span>
                      {collapsed && (
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block"
                        >
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="hidden px-2 sm:block">
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-ink-500 hover:bg-surface-hover hover:text-ink-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-5 shrink-0" aria-hidden="true" /> : <PanelLeftClose className="size-5 shrink-0" aria-hidden="true" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}
