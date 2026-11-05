import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, KeyRound, Lock, Mail, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ApiError } from "@/types/api";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

const HIGHLIGHTS = [
  { icon: Send, text: "SMS and email campaigns in one place" },
  { icon: ShieldCheck, text: "Approvals and a full audit trail" },
  { icon: Activity, text: "Live delivery and read tracking" },
];

export function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const [step, setStep] = useState<"identifier" | "code">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Counts down the wait before a code can be requested again.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    const result = await requestOtp(identifier);
    const sent = [result.emailSent && "email", result.smsSent && "SMS"].filter(Boolean).join(" and ");
    const coming = [result.emailPending && "email", result.smsPending && "SMS"].filter(Boolean).join(" and ");
    setInfo(
      sent
        ? `Code sent by ${sent}.${coming ? ` It may also arrive by ${coming} shortly.` : ""}`
        : "Code sent.",
    );
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendCode();
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send login code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      await sendCode();
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(identifier, code);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't verify login code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function backToIdentifier() {
    setStep("identifier");
    setCode("");
    setError(null);
    setInfo(null);
    setCooldown(0);
  }

  return (
    <div className="grid min-h-screen bg-surface-app lg:grid-cols-[1.1fr_1fr]">
      {/*
        Brand panel. The photo is a CSS background under the lg: variant, so
        phones and tablets, which never show this panel, never download it.
      */}
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
        {/*
          The first step is centred exactly (top padding = half the free height,
          where 30rem is that step's content plus the footer). Later steps and
          error messages are taller, so they grow downward instead of re-centring:
          the logo and heading never shift.
        */}
        <div className="flex flex-1 items-start justify-center pt-[max(2rem,calc((100vh_-_30rem)/2))]">
          <div className="w-full max-w-md">
            <img src="/tierdata-logo.png" alt="TierData" className="mb-10 h-28 w-auto object-contain" />

            {/* key restarts the entrance animation when the step changes */}
            <div key={step} className="motion-safe:animate-fade-up">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
                {step === "identifier" ? "Welcome back" : "Check your messages"}
              </h1>
              <p className="mt-2 text-sm text-ink-500">
                {step === "identifier" ? (
                  "Sign in with a one-time code. There's no password to remember."
                ) : (
                  <>
                    Enter the {CODE_LENGTH}-digit code we sent to{" "}
                    <span className="font-medium text-ink-700">{identifier}</span>.
                  </>
                )}
              </p>

              {/* Always mounted so screen readers announce messages; only takes space when it has one. */}
              <div className={error || (info && step === "code") ? "mt-6 flex flex-col gap-4" : "contents"} aria-live="polite">
                {error && <Alert variant="error">{error}</Alert>}
                {info && step === "code" && !error && <Alert variant="success">{info}</Alert>}
              </div>

              {step === "identifier" ? (
                <form onSubmit={handleRequestOtp} className="mt-6 flex flex-col gap-5">
                  <Input
                    label="Email or phone number"
                    placeholder="you@company.com"
                    icon={<Mail className="size-4" />}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    spellCheck={false}
                    autoFocus
                    required
                    className="h-11!"
                  />
                  <Button type="submit" loading={loading} className="h-11! w-full text-sm">
                    {loading ? "Sending code…" : "Send login code"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="mt-4 flex flex-col gap-5">
                  <Input
                    label="Login code"
                    placeholder="••••••"
                    icon={<KeyRound className="size-4" />}
                    value={code}
                    // Digits only, capped at the code length: a pasted "123 456" still works.
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern={`\\d{${CODE_LENGTH}}`}
                    maxLength={CODE_LENGTH}
                    spellCheck={false}
                    autoFocus
                    required
                    className="h-14! pl-9! text-xl! font-semibold tracking-[0.4em] tabular-nums"
                  />
                  <Button
                    type="submit"
                    loading={loading}
                    disabled={code.length !== CODE_LENGTH}
                    className="h-11! w-full text-sm"
                  >
                    {loading ? "Verifying…" : "Verify and sign in"}
                  </Button>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <button
                      type="button"
                      onClick={backToIdentifier}
                      className="flex items-center gap-1.5 rounded-md text-ink-500 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Use a different email or phone
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResend()}
                      disabled={cooldown > 0 || loading}
                      className="rounded-md font-medium text-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:text-ink-400"
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <footer className="mx-auto flex w-full max-w-md flex-col gap-1 pt-8 text-xs text-ink-500">
          <p className="flex items-center gap-1.5">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            For your security, sessions end after 30 minutes.
          </p>
          <p>© {new Date().getFullYear()} TierData</p>
        </footer>
      </main>
    </div>
  );
}
