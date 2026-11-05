import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
  /** "icon" renders a kebab trigger (default, for table rows). "button" renders a labeled trigger. */
  variant?: "icon" | "button";
  triggerLabel?: string;
}

const MENU_WIDTH = 192; // w-48
const MENU_GAP = 4;

export function ActionMenu({ items, label = "Actions", variant = "icon", triggerLabel = "More" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + MENU_GAP,
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) updatePosition();
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleReposition() {
      setOpen(false);
    }

    document.addEventListener("keydown", handleKey);
    // Any scroll (including inside a scrollable table wrapper) or resize
    // invalidates the computed position, so close rather than show it stale.
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  const visibleItems = items.filter((item) => !item.disabled);
  if (visibleItems.length === 0) return null;

  return (
    <>
      {variant === "icon" ? (
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={handleToggle}
          className="flex size-8 items-center justify-center rounded-md text-ink-500 hover:bg-surface-hover hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <MoreHorizontal className="size-4" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={handleToggle}
          className="flex h-8 items-center gap-1 rounded-lg border border-border-default px-3 text-sm text-ink-700 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          {triggerLabel}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      )}
      {open &&
        position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-90" onClick={() => setOpen(false)} />
            <div
              role="menu"
              style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
              className="fixed z-100 rounded-lg border border-border-subtle bg-white py-1 shadow-lg"
            >
              {visibleItems.map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  disabled={item.loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover disabled:opacity-50",
                    item.danger ? "text-status-red-text" : "text-ink-700",
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
