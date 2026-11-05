import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { campaignsApi } from "@/api/campaigns";
import { groupsApi } from "@/api/groups";
import { campaignOptionsApi } from "@/api/campaignOptions";
import { campaignDraftApi, type CampaignFormDraft } from "@/api/campaignDraft";
import { SpinnerBlock } from "@/components/ui/Spinner";
import { formatDateTime } from "@/lib/format";
import type { AudienceType, Campaign, CampaignChannel } from "@/types/entities";
import { useMutation, useQuery } from "@/hooks/useApi";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormSection } from "@/components/forms/FormSection";
import { AttachmentPicker } from "@/pages/campaigns/AttachmentPicker";
import {
  GREETING_PRESETS,
  MAX_GREETING_LENGTH,
  salutation,
} from "@/lib/salutation";

const NO_GREETING = "";
const CUSTOM_GREETING = "__custom__";
const EXAMPLE_NAME = "Amina Wanjiru";

type AutosaveState =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; at: string }
  | { state: "error" };

function isBlank(form: CampaignFormDraft): boolean {
  return !(
    form.name.trim() ||
    form.message.trim() ||
    form.emailSubject.trim() ||
    form.customGreeting.trim() ||
    form.greetingChoice ||
    form.includeName
  );
}

function emptyForm(): CampaignFormDraft {
  return {
    name: "",
    message: "",
    audienceType: "all",
    groupId: "",
    channel: "sms",
    emailSubject: "",
    greetingChoice: NO_GREETING,
    customGreeting: "",
    includeName: false,
  };
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CampaignFormModalProps {
  open: boolean;
  onClose: () => void;
  // failedUploads lists attachments that could not be uploaded (the campaign itself was created).
  onSaved: (campaign: Campaign, failedUploads: string[]) => void;
}

export function CampaignFormModal({
  open,
  onClose,
  onSaved,
}: CampaignFormModalProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [groupId, setGroupId] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("sms");
  const [emailSubject, setEmailSubject] = useState("");
  const [greetingChoice, setGreetingChoice] = useState(NO_GREETING);
  const [customGreeting, setCustomGreeting] = useState("");
  const [includeName, setIncludeName] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const greeting =
    greetingChoice === CUSTOM_GREETING ? customGreeting.trim() : greetingChoice;
  const opening = salutation(greeting, includeName, EXAMPLE_NAME);

  const { data: groups } = useQuery(
    () => groupsApi.list({ limit: 200 }),
    [open],
  );

  // Every campaign SMS ends with an opt-out line added by the server; show it and count it.
  const { data: options } = useQuery(
    () => (open ? campaignOptionsApi.get() : Promise.resolve(null)),
    [open],
  );
  const smsFooter = channel !== "email" ? (options?.smsFooter ?? "") : "";

  // ---- Autosave: what is typed is kept on the server, private to this user, so a
  // logout, a closed tab or another computer does not lose it. It is not a campaign
  // (nobody else can see it) until "Create draft" is pressed.
  const [draftReady, setDraftReady] = useState(false);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [autosave, setAutosave] = useState<AutosaveState>({ state: "idle" });
  const lastSaved = useRef("");

  // Fixed key order, so comparing two snapshots as strings is reliable.
  const snapshot: CampaignFormDraft = useMemo(
    () => ({
      name,
      message,
      audienceType,
      groupId,
      channel,
      emailSubject,
      greetingChoice,
      customGreeting,
      includeName,
    }),
    [
      name,
      message,
      audienceType,
      groupId,
      channel,
      emailSubject,
      greetingChoice,
      customGreeting,
      includeName,
    ],
  );

  function applyForm(form: CampaignFormDraft) {
    setName(form.name ?? "");
    setMessage(form.message ?? "");
    setAudienceType(form.audienceType === "group" ? "group" : "all");
    setGroupId(form.groupId ?? "");
    setChannel(
      form.channel === "email" || form.channel === "both"
        ? form.channel
        : "sms",
    );
    setEmailSubject(form.emailSubject ?? "");
    setGreetingChoice(form.greetingChoice ?? NO_GREETING);
    setCustomGreeting(form.customGreeting ?? "");
    setIncludeName(Boolean(form.includeName));
  }

  function resetForm() {
    applyForm({
      name: "",
      message: "",
      audienceType: "all",
      groupId: "",
      channel: "sms",
      emailSubject: "",
      greetingChoice: NO_GREETING,
      customGreeting: "",
      includeName: false,
    });
    setFiles([]);
  }

  // Each time the dialog opens: start empty, then bring back any saved draft.
  useEffect(() => {
    if (!open) return;
    resetForm();
    setDraftReady(false);
    setRestoredAt(null);
    setAutosave({ state: "idle" });
    lastSaved.current = "";

    let cancelled = false;
    campaignDraftApi
      .get()
      .then((saved) => {
        if (cancelled || !saved) return;
        applyForm(saved.form);
        setRestoredAt(saved.updatedAt);
        lastSaved.current = JSON.stringify({ ...emptyForm(), ...saved.form });
      })
      .catch(() => {
        // Not being able to load a draft must never block writing a new one.
      })
      .finally(() => {
        if (!cancelled) setDraftReady(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function persist(form: CampaignFormDraft) {
    if (isBlank(form)) {
      setAutosave({ state: "idle" });
    } else {
      setAutosave({ state: "saving" });
    }
    try {
      await campaignDraftApi.save(form);
      lastSaved.current = JSON.stringify(form);
      if (!isBlank(form))
        setAutosave({ state: "saved", at: new Date().toISOString() });
    } catch {
      setAutosave({ state: "error" });
    }
  }

  // Save shortly after the user stops typing.
  useEffect(() => {
    if (!open || !draftReady) return;
    if (JSON.stringify(snapshot) === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      // Re-check at fire time: the form may have been submitted or discarded meanwhile.
      if (JSON.stringify(snapshot) !== lastSaved.current)
        void persist(snapshot);
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftReady, snapshot]);

  // A group that was deleted since the draft was saved would leave a dangling choice.
  useEffect(() => {
    if (groups && groupId && !groups.some((g) => g.id === groupId))
      setGroupId("");
  }, [groups, groupId]);

  // Closing keeps the draft (that is the point), so save what is pending first.
  async function handleClose() {
    if (draftReady && JSON.stringify(snapshot) !== lastSaved.current)
      await persist(snapshot);
    onClose();
  }

  async function startOver() {
    await campaignDraftApi.remove().catch(() => {});
    resetForm();
    lastSaved.current = "";
    setRestoredAt(null);
    setAutosave({ state: "idle" });
  }

  const [save, saveState] = useMutation(async () => {
    const campaign = await campaignsApi.create({
      name,
      message,
      audienceType,
      groupId: audienceType === "group" ? groupId : undefined,
      channel,
      emailSubject: channel === "sms" ? undefined : emailSubject,
      greeting: greeting || undefined,
      includeName,
    });

    // Files go up one at a time once the campaign exists. If one fails the
    // campaign is still created; the user is told and can add it on the campaign page.
    const failedUploads: string[] = [];
    if (channel !== "sms") {
      for (const file of files) {
        try {
          await campaignsApi.uploadAttachment(campaign.id, file);
        } catch (err) {
          failedUploads.push(
            `${file.name}: ${err instanceof Error ? err.message : "upload failed"}`,
          );
        }
      }
    }
    return { campaign, failedUploads };
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { campaign, failedUploads } = await save();
    // The campaign exists now, so the private draft has done its job. Mark the
    // form as saved first so no pending autosave brings the draft back.
    lastSaved.current = JSON.stringify(snapshot);
    await campaignDraftApi.remove().catch(() => {});
    onSaved(campaign, failedUploads);
  }

  return (
    <Modal
      open={open}
      onClose={() => void handleClose()}
      title="New campaign"
      description="Campaigns start as drafts. You'll preview and confirm the audience before sending."
      size="lg"
      footer={
        <>
          <span
            className="mr-auto self-center text-xs text-ink-500"
            aria-live="polite"
          >
            {autosave.state === "saving" && "Saving…"}
            {autosave.state === "saved" &&
              `Draft saved · ${timeOf(autosave.at)}. Only you can see it.`}
            {autosave.state === "error" && (
              <span className="text-status-red-text">
                Couldn&apos;t save your draft. Keep this window open.
              </span>
            )}
            {autosave.state === "idle" &&
              "Saved automatically. Only you can see it until you create the campaign."}
          </span>
          <Button variant="secondary" onClick={() => void handleClose()}>
            Cancel
          </Button>
          <Button
            form="campaign-form"
            type="submit"
            loading={saveState.loading}
            disabled={!draftReady}
          >
            Create draft
          </Button>
        </>
      }
    >
      {!draftReady ? (
        <SpinnerBlock label="Loading…" />
      ) : (
        <form
          id="campaign-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {restoredAt && (
            <Alert variant="info">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  We restored the campaign you were working on (saved{" "}
                  {formatDateTime(restoredAt)}).
                </span>
                <button
                  type="button"
                  onClick={() => void startOver()}
                  className="font-medium underline underline-offset-2"
                >
                  Start over
                </button>
              </div>
            </Alert>
          )}
          {saveState.error && <Alert variant="error">{saveState.error}</Alert>}

          <FormSection title="Content">
            <Input
              label="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <Select
              label="Send via"
              value={channel}
              onChange={(e) => setChannel(e.target.value as CampaignChannel)}
              hint="Customers without a phone eligibility or email address are skipped for that channel."
            >
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="both">SMS and email</option>
            </Select>
            {channel !== "sms" && (
              <Input
                label="Email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
              />
            )}
            <Textarea
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              hint={
                (opening
                  ? `Each message starts with its own greeting (e.g. "${opening}"), so you can begin straight with the news. `
                  : channel === "email"
                    ? "Sent as the email body. "
                    : "") +
                (channel === "email"
                  ? `${message.length} characters.`
                  : smsFooter
                    ? `${message.length} characters, plus ${smsFooter.length + 1} for the opt-out line “${smsFooter}” that every SMS ends with.`
                    : `${message.length} characters.`)
              }
              required
            />
          </FormSection>

          <FormSection title="Personalise (optional)">
            <Select
              label="Start each message with a greeting"
              value={greetingChoice}
              onChange={(e) => setGreetingChoice(e.target.value)}
            >
              <option value={NO_GREETING}>No greeting</option>
              {GREETING_PRESETS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              <option value={CUSTOM_GREETING}>Write my own…</option>
            </Select>
            {greetingChoice === CUSTOM_GREETING && (
              <Input
                label="Your greeting"
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
                maxLength={MAX_GREETING_LENGTH}
                placeholder="e.g. Good evening"
              />
            )}
            <label className="flex items-start gap-2.5 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={includeName}
                onChange={(e) => setIncludeName(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border-default accent-brand-600"
              />
              <span>
                Add the customer&apos;s first name
                <span className="block text-xs text-ink-500">
                  Taken from their record, e.g. &ldquo;Amina&rdquo; for Amina
                  Wanjiru.
                </span>
              </span>
            </label>
            {(opening || smsFooter) && (
              <div className="rounded-lg border border-border-subtle bg-surface-sunken p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  {channel === "email" ? "Email" : "SMS"} preview for{" "}
                  {EXAMPLE_NAME}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-ink-900">
                  {opening && (
                    <>
                      <span className="font-medium">{opening}</span>
                      {"\n"}
                    </>
                  )}
                  {message.trim() ? (
                    message
                  ) : (
                    <span className="text-ink-400">
                      Your message appears here.
                    </span>
                  )}
                  {smsFooter && (
                    <>
                      {"\n"}
                      <span className="font-medium">{smsFooter}</span>
                    </>
                  )}
                </p>
                {smsFooter && channel === "both" && (
                  <p className="mt-1.5 text-xs text-ink-500">
                    The SMS ends with the opt-out line; the email does not.
                  </p>
                )}
              </div>
            )}
          </FormSection>

          {channel !== "sms" && (
            <FormSection title="Attachments (optional)">
              <AttachmentPicker
                files={files}
                onChange={setFiles}
                disabled={saveState.loading}
              />
              <p className="text-xs text-ink-500">
                Attached files are not autosaved: if you leave and come back,
                choose them again before creating the campaign.
              </p>
            </FormSection>
          )}

          <FormSection title="Audience">
            <Select
              label="Audience"
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value as AudienceType)}
            >
              <option value="all">All customers</option>
              <option value="group">Specific group</option>
            </Select>
            {audienceType === "group" && (
              <Select
                label="Group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a group…
                </option>
                {(groups ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            )}
          </FormSection>
        </form>
      )}
    </Modal>
  );
}
