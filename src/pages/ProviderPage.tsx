import { useEffect, useState, type FormEvent } from "react";
import { Mail, PlugZap, Send } from "lucide-react";
import { providerApi } from "@/api/provider";
import type { EmailSecurityMode, ProviderMode } from "@/types/entities";
import { useMutation, useQuery } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { SpinnerBlock } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";

export function ProviderPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = can(user?.role, "provider:write");

  const { data, loading, error, refetch } = useQuery(
    () => providerApi.get(),
    [],
  );

  const {
    data: emailData,
    loading: emailLoading,
    error: emailError,
    refetch: refetchEmail,
  } = useQuery(() => providerApi.getEmail(), []);

  const [mode, setMode] = useState<ProviderMode>("mock");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (data) {
      setMode(data.mode);
      setBaseUrl(data.baseUrl);
    }
  }, [data]);

  const [emailHost, setEmailHost] = useState("");
  const [emailPort, setEmailPort] = useState("587");
  const [emailUsername, setEmailUsername] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSender, setEmailSender] = useState("");
  const [emailSecurityMode, setEmailSecurityMode] =
    useState<EmailSecurityMode>("starttls");

  useEffect(() => {
    if (emailData) {
      setEmailHost(emailData.host);
      setEmailPort(String(emailData.port));
      setEmailUsername(emailData.username);
      setEmailSender(emailData.sender_email);
      setEmailSecurityMode(emailData.security_mode);
    }
  }, [emailData]);

  function emailInput() {
    return {
      host: emailHost.trim(),
      port: Number(emailPort),
      username: emailUsername.trim(),
      password: emailPassword,
      sender_email: emailSender.trim(),
      security_mode: emailSecurityMode,
    };
  }

  const [saveEmail, saveEmailState] = useMutation(() =>
    providerApi.saveEmail(emailInput()),
  );

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    await saveEmail();
    setEmailPassword("");
    toast.success("Email configuration saved.");
    refetchEmail();
  }

  const [testEmail, testEmailState] = useMutation(() =>
    providerApi.testEmail(emailInput()),
  );
  const [emailTestResult, setEmailTestResult] = useState<boolean | null>(null);

  async function handleTestEmail() {
    try {
      const result = await testEmail();
      setEmailTestResult(result.success);
    } catch {
      setEmailTestResult(false);
    }
  }

  const [save, saveState] = useMutation(() =>
    providerApi.save({ mode, apiKey, baseUrl }),
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save();
    setApiKey("");
    toast.success("Provider configuration saved.");
    refetch();
  }

  // Checks credentials/connectivity only - uses the API key, no sender ID involved.
  const [checkBalance, balanceState] = useMutation(() => providerApi.test());
  const [balanceResult, setBalanceResult] = useState<{
    success: boolean;
    balance?: number;
    currency?: string;
  } | null>(null);

  async function handleCheckBalance() {
    const result = await checkBalance();
    setBalanceResult(result);
  }

  // Sends a real SMS using the app's fixed sender ID (SMS_FROM, set by
  // the backend operator) - the caller only ever enters a phone number
  // and message here, never a sender ID.
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sendTest, sendTestState] = useMutation(() =>
    providerApi.sendTest({ phone, message }),
  );
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    providerMessageId: string;
    status: string;
  } | null>(null);

  async function handleSendTest(e: FormEvent) {
    e.preventDefault();
    const result = await sendTest();
    setSendResult(result);
    toast.success("Test message sent.");
  }

  if (loading || emailLoading)
    return <SpinnerBlock label="Loading provider configuration…" />;

  const hasBalance =
    Boolean(balanceResult?.balance) || Boolean(balanceResult?.currency);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Provider"
        description="Tiara SMS gateway configuration."
      />

      {error && <Alert variant="error">{error}</Alert>}

      {/* Side by side on wide screens instead of leaving the right half empty. */}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Tiara connection</CardTitle>
              <CardDescription>
                {data?.active
                  ? "Configured and active."
                  : "Not configured yet."}
              </CardDescription>
            </div>
            <Badge tone={data?.active ? "green" : "gray"}>
              {data?.active ? "Active" : "Inactive"}
            </Badge>
          </CardHeader>

          <form id="provider-form" onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4">
              <Select
                label="Mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as ProviderMode)}
                disabled={!canWrite}
              >
                <option value="mock">
                  Mock (sandbox, no credentials needed)
                </option>
                <option value="live">Live</option>
              </Select>

              {data?.apiKeyMasked && (
                <Alert variant="info">
                  Tiara never returns a saved API key, so it can't be
                  pre-filled. Re-enter the API key any time you update this
                  configuration, even if you're only changing another field - an
                  empty key overwrites the one on file.
                </Alert>
              )}

              <Input
                label="API key"
                type="password"
                autoComplete="off"
                placeholder={
                  mode === "live"
                    ? "Required for live mode…"
                    : "Optional in mock mode"
                }
                hint={
                  data?.apiKeyMasked
                    ? `Current key ends in ${data.apiKeyMasked}.`
                    : undefined
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={!canWrite}
                required={mode === "live"}
              />
              <Input
                label="Base URL"
                type="url"
                placeholder="https://provider.example.com/send"
                hint="The complete SMS-send endpoint URL from Tiara for your account - not a host to append paths to. Required for live mode; there's no default."
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={!canWrite}
                required={mode === "live"}
              />
              {saveState.error && (
                <Alert variant="error">{saveState.error}</Alert>
              )}
              {balanceState.error && (
                <Alert variant="error">{balanceState.error}</Alert>
              )}
              {balanceResult && (
                <Alert variant={balanceResult.success ? "success" : "error"}>
                  {balanceResult.success
                    ? hasBalance
                      ? `Connected. Balance: ${balanceResult.balance} ${balanceResult.currency}`
                      : "Connection verified."
                    : "Connection failed."}
                </Alert>
              )}
            </CardContent>

            {canWrite && (
              <CardFooter>
                <Button
                  type="button"
                  variant="secondary"
                  loading={balanceState.loading}
                  onClick={() => void handleCheckBalance()}
                >
                  <PlugZap className="size-4" />
                  Check balance
                </Button>
                <Button type="submit" loading={saveState.loading}>
                  Save configuration
                </Button>
              </CardFooter>
            )}
          </form>
        </Card>

        {canWrite && (
          <Card>
            <CardHeader>
              <CardTitle>Send a test SMS</CardTitle>
              <CardDescription>
                Verifies real end-to-end delivery using the app's configured
                sender ID - no sender ID needed here.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSendTest}>
              <CardContent className="flex flex-col gap-4">
                <Input
                  label="Phone number"
                  type="tel"
                  placeholder="2547XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Textarea
                  label="Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  hint={`${message.length} characters`}
                  required
                />

                {sendTestState.error && (
                  <Alert variant="error">{sendTestState.error}</Alert>
                )}
                {sendResult && (
                  <Alert variant="success">
                    Sent. Status: {sendResult.status || "submitted"} · ID:{" "}
                    {sendResult.providerMessageId}
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" loading={sendTestState.loading}>
                  <Send className="size-4" />
                  Send test message
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Email (SMTP)</CardTitle>
            <CardDescription>
              Outgoing email for login codes, invitations, approvals and email
              campaigns. A saved configuration takes precedence over SMTP
              settings in the environment.
            </CardDescription>
          </div>
          <Badge tone={emailData?.active ? "green" : "gray"}>
            {emailData?.active ? "Active" : "Not configured"}
          </Badge>
        </CardHeader>

        <form id="email-form" onSubmit={handleEmailSubmit}>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input
              label="SMTP host"
              placeholder="smtp.office365.com"
              value={emailHost}
              onChange={(e) => setEmailHost(e.target.value)}
              disabled={!canWrite}
              required
            />
            <Input
              label="Port"
              type="number"
              min={1}
              max={65535}
              value={emailPort}
              onChange={(e) => setEmailPort(e.target.value)}
              disabled={!canWrite}
              required
            />
            <Input
              label="Username"
              type="text"
              autoComplete="off"
              placeholder="mailer@example.com"
              value={emailUsername}
              onChange={(e) => setEmailUsername(e.target.value)}
              disabled={!canWrite}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder={
                emailData?.password_configured
                  ? "Leave blank to keep the saved password"
                  : "SMTP password"
              }
              hint={
                emailData?.password_configured
                  ? "A password is already saved. Leave this blank to keep it."
                  : "Required the first time you save this configuration."
              }
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              disabled={!canWrite}
              required={!emailData?.password_configured}
            />
            <Input
              label="Sender email"
              type="email"
              placeholder="notifications@example.com"
              hint="The From address recipients see."
              value={emailSender}
              onChange={(e) => setEmailSender(e.target.value)}
              disabled={!canWrite}
              required
            />
            <Select
              label="Security"
              value={emailSecurityMode}
              onChange={(e) =>
                setEmailSecurityMode(e.target.value as EmailSecurityMode)
              }
              disabled
            >
              <option value="starttls">STARTTLS (required)</option>
            </Select>

            <div className="flex flex-col gap-3 md:col-span-2">
              {emailError && <Alert variant="error">{emailError}</Alert>}
              {saveEmailState.error && (
                <Alert variant="error">{saveEmailState.error}</Alert>
              )}
              {testEmailState.error && (
                <Alert variant="error">{testEmailState.error}</Alert>
              )}
              {emailTestResult !== null && (
                <Alert variant={emailTestResult ? "success" : "error"}>
                  {emailTestResult
                    ? "Connected and authenticated successfully."
                    : "Could not connect with these settings."}
                </Alert>
              )}
            </div>
          </CardContent>

          {canWrite && (
            <CardFooter>
              <Button
                type="button"
                variant="secondary"
                loading={testEmailState.loading}
                onClick={() => void handleTestEmail()}
              >
                <Mail className="size-4" />
                Test connection
              </Button>
              <Button type="submit" loading={saveEmailState.loading}>
                Save email configuration
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}
