import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type AlertVariant = "info" | "success" | "warning" | "error";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: "bg-status-blue-bg text-status-blue-text",
  success: "bg-status-green-bg text-status-green-text",
  warning: "bg-status-amber-bg text-status-amber-text",
  error: "bg-status-red-bg text-status-red-text",
};

const VARIANT_ICONS: Record<AlertVariant, ReactNode> = {
  info: <Info className="size-4" />,
  success: <CheckCircle2 className="size-4" />,
  warning: <AlertTriangle className="size-4" />,
  error: <XCircle className="size-4" />,
};

export function Alert({ variant = "info", children }: { variant?: AlertVariant; children: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm", VARIANT_CLASSES[variant])}>
      {VARIANT_ICONS[variant]}
      <div className="flex-1">{children}</div>
    </div>
  );
}
