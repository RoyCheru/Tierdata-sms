import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, Lock, Mail, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ApiError } from "@/types/api";

const HIGHLIGHTS = [
  { icon: Send, text: "SMS and email campaigns in one place" },
  { icon: ShieldCheck, text: "Approvals and a full audit trail" },
  { icon: Activity, text: "Live delivery and read tracking" },
];

export function LoginPage() {
  const { signInDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInDemo(email);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open the demo. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-surface-app lg:grid-cols-[1.1fr_1fr]">
      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-end overflow-hidden bg-brand-900 bg-cover bg-[position:50%_12%] lg:flex lg:bg-[url('/login-hero.jpg')]"
      >
        <div className="absolute inset-0 bg-linear-to-t from-brand-900 via-brand-900/55 to-transparent" />
        <div className="relative flex max-w-xl flex-col gap-6 p-12 text-white xl:p-16">
          <div className="flex flex-col gap-3">
            <p className="text-balance text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Reach every customer and investor, on every channel.
            </p>
            <p className="text-base text-white/80">
              Plan, approve and send SMS and email campaigns, then watch how they perform as it happens.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex flex-1 items-start justify-center pt-[max(2rem,calc((100vh_-_30rem)/2))]">
          <div className="w-full max-w-md">
            <img src="/tierdata-logo.png" alt="TierData" className="mb-10 h-28 w-auto object-contain" />

            <div className="motion-safe:animate-fade-up">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Welcome to the demo</h1>
              <p className="mt-2 text-sm text-ink-500">
                Enter any email address to explore a fully populated SMS CRM with sample data. No password or OTP
                required.
              </p>

              <div className={error ? "mt-6" : "contents"} aria-live="polite">
                {error && <Alert variant="error">{error}</Alert>}
              </div>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@company.com"
                  icon={<Mail className="size-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  spellCheck={false}
                  autoFocus
                  required
                  className="h-11!"
                />
                <Button type="submit" loading={loading} className="h-11! w-full text-sm">
                  {loading ? "Signing in…" : "Sign in to Demo"}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-ink-500">
                Demo mode — campaigns, customers and reports are sample data stored only in this browser.
              </p>
            </div>
          </div>
        </div>

        <footer className="mx-auto flex w-full max-w-md flex-col gap-1 pt-8 text-xs text-ink-500">
          <p className="flex items-center gap-1.5">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            Frontend-only demo. Nothing is sent to a server.
          </p>
          <p>© {new Date().getFullYear()} TierData</p>
        </footer>
      </main>
    </div>
  );
}
