import { useEffect, useState, type FormEvent } from "react";
import { settingsApi } from "@/api/settings";
import { useMutation, useQuery } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { SpinnerBlock } from "@/components/ui/Spinner";

export function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = can(user?.role, "settings:write");

  const { data, loading, error, refetch } = useQuery(() => settingsApi.getApprovals(), []);
  const [required, setRequired] = useState("1");

  useEffect(() => {
    if (data) setRequired(String(data.requiredApprovals));
  }, [data]);

  const [save, saveState] = useMutation(() => settingsApi.saveApprovals(Number(required)));

  const { data: footerData, refetch: refetchFooter } = useQuery(() => settingsApi.getSmsFooter(), []);
  const [footer, setFooter] = useState("");
  useEffect(() => {
    if (footerData) setFooter(footerData.smsFooter);
  }, [footerData]);
  const [saveFooter, saveFooterState] = useMutation(() => settingsApi.saveSmsFooter(footer));

  async function handleFooterSubmit(e: FormEvent) {
    e.preventDefault();
    await saveFooter();
    toast.success(footer.trim() ? "SMS footer saved." : "SMS footer switched off.");
    refetchFooter();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save();
    toast.success("Approval setting saved.");
    refetch();
  }

  if (loading) return <SpinnerBlock label="Loading settings…" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Rules that apply across the whole workspace." />
      {error && <Alert variant="error">{error}</Alert>}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Campaign approvals</CardTitle>
          <CardDescription>
            How many different people must approve a campaign before it can be sent or scheduled. The person who
            created a campaign can never approve it, and each person counts once.
          </CardDescription>
        </CardHeader>
        <form id="approvals-form" onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <Input
              label="Required approvals"
              type="number"
              min={data?.minApprovals ?? 1}
              max={data?.maxApprovals ?? 10}
              step={1}
              value={required}
              onChange={(e) => setRequired(e.target.value)}
              disabled={!canWrite}
              required
              hint="Applies to campaigns that have not been sent yet, including ones already waiting for approval. Make sure at least this many other people have permission to approve."
            />
            {saveState.error && <Alert variant="error">{saveState.error}</Alert>}
          </CardContent>
          {canWrite && (
            <CardFooter>
              <Button type="submit" loading={saveState.loading}>
                Save
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>SMS opt-out line</CardTitle>
          <CardDescription>
            Added automatically as the last line of every campaign SMS, so customers know how to stop receiving them.
            It is never added to emails. Leave it blank to switch it off.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleFooterSubmit}>
          <CardContent className="flex flex-col gap-4">
            <Input
              label="Line added to the end of each SMS"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              maxLength={footerData?.maxLength ?? 60}
              disabled={!canWrite}
              placeholder="e.g. STOP *456*9*5#"
              hint={`It counts toward the SMS length, so keep it short (${footerData?.maxLength ?? 60} characters at most).`}
            />
            {footer.trim() && (
              <div className="rounded-lg border border-border-subtle bg-surface-sunken p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">How a customer sees it</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-ink-900">
                  Dear Amina,{"\n"}Your Q3 dividend is ready.{"\n"}
                  <span className="font-medium">{footer.trim()}</span>
                </p>
              </div>
            )}
            {saveFooterState.error && <Alert variant="error">{saveFooterState.error}</Alert>}
          </CardContent>
          {canWrite && (
            <CardFooter>
              <Button type="submit" loading={saveFooterState.loading}>
                Save
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}
