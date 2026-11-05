import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getSessionDeadline } from "@/lib/http";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

// How long before the session ends the user is asked whether to continue.
const WARNING_MS = 2 * 60 * 1000;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Sessions are short because the data is sensitive, and activity does not
 * extend them. Shortly before one ends this asks the user to continue (which
 * the server records in the audit log) or sign out; if nobody answers, they
 * are signed out when time runs out.
 */
export function SessionTimeoutDialog() {
  const { logout, extendSession } = useAuth();
  const toast = useToast();
  const [now, setNow] = useState(() => Date.now());
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loggingOut = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Read every render (not cached in state) so an extension made in another
  // tab is picked up on the next tick.
  const deadline = getSessionDeadline();
  const remaining = deadline === null ? null : deadline - now;

  async function signOut(message: string) {
    if (loggingOut.current) return;
    loggingOut.current = true;
    toast.error(message);
    try {
      await logout();
    } catch {
      // The session may already be gone server-side; the local state is cleared regardless.
    }
  }

  useEffect(() => {
    if (remaining !== null && remaining <= 0) {
      void signOut("You were signed out because your session expired.");
    }
  }, [remaining]);

  async function handleContinue() {
    setExtending(true);
    setError(null);
    try {
      await extendSession();
      toast.success("Session extended.");
    } catch {
      setError("Couldn't extend your session. Please sign in again.");
      await signOut("Your session could not be extended. Please sign in again.");
    } finally {
      setExtending(false);
    }
  }

  const open = remaining !== null && remaining > 0 && remaining <= WARNING_MS;

  return (
    <Modal
      open={open}
      // Deliberately not dismissable: the user must choose to continue or sign out.
      onClose={() => {}}
      title="Are you still there?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => void signOut("You have been signed out.")} disabled={extending}>
            Sign out
          </Button>
          <Button loading={extending} onClick={() => void handleContinue()} autoFocus>
            Continue session
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-amber-bg text-status-amber-text">
            <Clock className="size-4.5" aria-hidden="true" />
          </span>
          <p className="text-sm text-ink-700">
            For your security, your session ends in{" "}
            <span className="font-semibold tabular-nums text-ink-900">{formatRemaining(remaining ?? 0)}</span>. Do you
            want to continue?
          </p>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </Modal>
  );
}
