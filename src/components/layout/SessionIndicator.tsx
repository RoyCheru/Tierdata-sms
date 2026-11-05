import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getSessionDeadline } from "@/lib/http";
import { cn } from "@/lib/cn";

/**
 * Quietly shows how long the sign-in has left, so the 30-minute limit never
 * comes as a surprise. It turns amber in the last five minutes (the countdown
 * dialog takes over for the final two).
 */
export function SessionIndicator({ className }: { className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const deadline = getSessionDeadline();
  if (deadline === null) return null;

  const minutes = Math.max(Math.ceil((deadline - now) / 60_000), 0);
  const soon = minutes <= 5;

  return (
    <span
      title="For your security, sessions end after 30 minutes. You'll be asked before it ends."
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
        soon ? "bg-status-amber-bg text-status-amber-text" : "bg-surface-sunken text-ink-500",
        className,
      )}
    >
      <Clock className="size-3.5" aria-hidden="true" />
      Session ends in {minutes} min
    </span>
  );
}
