import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error";

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = ++nextId.current;
      setToasts((prev) => [...prev, { id, variant, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-[calc(100vw-2rem)] max-w-sm items-start gap-2 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg",
                "toast-enter",
                toast.variant === "success" ? "border-status-green-bg" : "border-status-red-bg",
              )}
            >
              {toast.variant === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-green-text" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-status-red-text" aria-hidden="true" />
              )}
              <p className="flex-1 text-ink-900">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="text-ink-400 hover:text-ink-700"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
