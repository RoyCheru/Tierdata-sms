import { ChannelBadge } from "@/components/ui/ChannelBadge";
import { Avatar } from "@/components/ui/Avatar";
import { buildMessageColumns } from "@/components/tables/messageColumns";
import { formatDateTime } from "@/lib/format";
import { ACCEPT, checkPicked, formatBytes } from "@/lib/attachments";
import { salutationTemplate } from "@/lib/salutation";
import { cn } from "@/lib/cn";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, CheckCircle2, Send, Download, CalendarPlus, Users, MessageSquare, ShieldCheck, Paperclip, FileText, Trash2 } from "lucide-react";
import { campaignsApi } from "@/api/campaigns";
import { messagesApi } from "@/api/messages";
import { groupsApi } from "@/api/groups";
import { campaignOptionsApi } from "@/api/campaignOptions";
import { audienceLabel } from "@/lib/audience";
import { reportsApi } from "@/api/reports";
import type { CampaignPreview, CampaignRecipient, CampaignReport, Message } from "@/types/entities";
import { useMutation, useQuery } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { SpinnerBlock } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Stepper, type StepperStep } from "@/components/ui/Stepper";
import { StatGrid, StatCard } from "@/components/ui/StatGrid";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { humanize } from "@/lib/statusTones";
import { CampaignStatusBadge } from "@/components/ui/CampaignStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";
import { ScheduleModal } from "@/pages/campaigns/ScheduleModal";

// The middle step says where approval stands, so the progress line and the badge agree.
function stepsFor(campaign: { status: string; approvalState?: string }): StepperStep[] {
  const middle =
    campaign.status === "confirmed" && campaign.approvalState === "waiting"
      ? "Waiting approval"
      : campaign.status === "confirmed" && campaign.approvalState === "approved"
        ? "Approved"
        : "Confirmed";
  return [
    { key: "draft", label: "Draft" },
    { key: "confirmed", label: middle },
    { key: "dispatched", label: "Dispatched" },
  ];
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = can(user?.role, "campaigns:write");
  const canSchedule = can(user?.role, "schedules:write");

  const { data: campaign, loading, error, refetch } = useQuery(() => campaignsApi.get(id!), [id]);
  const { data: approvals, refetch: refetchApprovals } = useQuery(() => campaignsApi.approvals(id!), [id]);
  const emailCampaign = campaign ? campaign.channel !== "sms" : false;
  const smsCampaign = campaign ? campaign.channel !== "email" && campaign.status !== "dispatched" : false;
  // The opt-out line the server adds to every SMS. Shown only until the campaign is sent:
  // afterwards the setting may have changed, and this would no longer be what was sent.
  const { data: campaignOptions } = useQuery(() => (smsCampaign ? campaignOptionsApi.get() : Promise.resolve(null)), [smsCampaign]);
  const smsFooter = smsCampaign ? (campaignOptions?.smsFooter ?? "") : "";
  const { data: attachmentList, refetch: refetchAttachments } = useQuery(
    () => (emailCampaign ? campaignsApi.attachments(id!) : Promise.resolve(null)),
    [id, emailCampaign],
  );
  const attachmentInput = useRef<HTMLInputElement>(null);
  const [attachmentProblems, setAttachmentProblems] = useState<string[]>([]);
  const groupId = campaign?.groupId;
  const { data: group } = useQuery(() => (groupId ? groupsApi.get(groupId) : Promise.resolve(null)), [groupId]);
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[] | null>(null);
  const [showRecipients, setShowRecipients] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);

  const [runPreview, previewState] = useMutation(async () => {
    const result = await campaignsApi.preview(id!);
    setPreview(result);
  });

  const [runConfirm, confirmState] = useMutation(async () => {
    await campaignsApi.confirm(id!);
    toast.success("Campaign confirmed. Its audience is now locked in, and the people who can approve it are being emailed.");
    refetch();
  });

  const [uploadFiles, uploadState] = useMutation(async (picked: File[]) => {
    // Files already attached count toward the limits; the server re-checks everything.
    const existing = (attachmentList?.files ?? []).map((f) => ({ name: f.filename, size: f.size }) as File);
    const { accepted, problems } = checkPicked(existing, picked);
    const failed = [...problems];
    for (const file of accepted) {
      try {
        await campaignsApi.uploadAttachment(id!, file);
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      }
    }
    setAttachmentProblems(failed);
    refetchAttachments();
  });

  const [removeFile, removeFileState] = useMutation(async (attachmentId: string) => {
    await campaignsApi.deleteAttachment(id!, attachmentId);
    refetchAttachments();
  });

  // Anyone who can open the campaign can download its files, so approvers can review exactly what will be mailed.
  const [downloadFile, downloadFileState] = useMutation(async (attachmentId: string, filename: string) => {
    const blob = await campaignsApi.downloadAttachment(id!, attachmentId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  });

  const [runApprove, approveState] = useMutation(async () => {
    const result = await campaignsApi.approve(id!);
    toast.success(
      result.satisfied
        ? "You approved this campaign. It now has enough approvals, and its creator is being told they can send or schedule it."
        : "You approved this campaign.",
    );
    refetchApprovals();
  });

  const [runSend, sendState] = useMutation(async () => {
    await campaignsApi.send(id!);
    toast.success("Campaign sent - messages are dispatching now.");
    refetch();
  });

  async function handleConfirmSend() {
    await runSend();
    setConfirmingSend(false);
  }

  const [loadRecipients, recipientsState] = useMutation(async () => {
    const result = await campaignsApi.recipients(id!);
    setRecipients(result);
    setShowRecipients(true);
  });

  const [loadMessages, messagesState] = useMutation(async () => {
    const { data, pagination } = await messagesApi.list({ campaignId: id!, limit: 500 });
    setMessages(data);
    setMessagesTotal(pagination?.totalCount ?? data.length);
    setShowMessages(true);
  });

  // Sending a large campaign takes minutes, so once it is dispatched show live
  // progress and keep refreshing until nothing is left waiting.
  const dispatched = campaign?.status === "dispatched";
  useEffect(() => {
    if (!id || !dispatched) return;

    let cancelled = false;
    let timer: number | undefined;

    async function refresh() {
      try {
        const latest = await reportsApi.campaignReport(id!);
        if (cancelled) return;
        setReport(latest);
        if (latest.pending > 0) timer = window.setTimeout(() => void refresh(), 5000);
      } catch {
        // Progress is informational; a failed refresh just stops the polling.
      }
    }

    void refresh();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [id, dispatched]);

  const [exportCsv, exportState] = useMutation(async () => {
    const blob = await reportsApi.downloadCampaignExport(id!);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  if (loading) return <SpinnerBlock label="Loading campaign…" />;
  if (error || !campaign) {
    return (
      <EmptyState
        title="Couldn't load this campaign"
        description={error ?? "It may have been removed."}
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate("/campaigns")}>
            Back to campaigns
          </Button>
        }
      />
    );
  }

  const recipientColumns: Column<CampaignRecipient>[] = [
    { key: "contact", header: "Contact", render: (r) => [r.sendSms || !r.sendEmail ? r.phone : null, r.sendEmail ? r.email : null].filter(Boolean).join(" · ") },
    {
      key: "eligible",
      header: "Eligible",
      render: (r) => <Badge tone={r.eligible ? "green" : "red"}>{r.eligible ? "Eligible" : "Excluded"}</Badge>,
    },
    { key: "reason", header: "Reason", render: (r) => (r.reason ? humanize(r.reason) : "-") },
  ];

  const messageColumns = buildMessageColumns();

  const steps = stepsFor(campaign);
  const stepIndex = steps.findIndex((s) => s.key === campaign.status);

  const isCreator = Boolean(user && campaign.createdBy && campaign.createdBy === user.userId);
  const alreadyApproved = Boolean(user && approvals?.approvers.some((a) => a.userId === user.userId));
  const canApprove = can(user?.role, "campaigns:approve") && campaign.status === "confirmed" && !isCreator && !alreadyApproved;
  // Sending is blocked server-side too; this just keeps the buttons honest.
  const approved = approvals?.satisfied ?? false;
  const approvalsNeeded = approvals ? Math.max(approvals.required - approvals.approved, 0) : 0;

  const needsMoreApprovals = !approved && campaign.status === "confirmed";
  const sendHint = needsMoreApprovals
    ? `Needs ${approvalsNeeded} more ${approvalsNeeded === 1 ? "approval" : "approvals"} before it can be sent`
    : undefined;
  const audience = audienceLabel(campaign, group?.name);
  const opening = salutationTemplate(campaign.greeting ?? "", Boolean(campaign.includeName));
  const files = attachmentList?.files ?? [];
  const canEditFiles = canWrite && campaign.status === "draft";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate("/campaigns")}
          className="flex w-fit items-center gap-1 rounded-md text-sm text-ink-500 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to campaigns
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-balance text-ink-900">{campaign.name}</h1>
              <CampaignStatusBadge campaign={campaign} />
            </div>
            {/* Stacked on phones (so no separator dot is stranded at a line end), one line with dots on wider screens. */}
            <div className="mt-2 flex flex-col gap-1 text-sm text-ink-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
              <ChannelBadge channel={campaign.channel} />
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>{audience}</span>
              {campaign.createdByEmail && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline">·</span>
                  <span className="min-w-0 break-words">Created by {campaign.createdByEmail}</span>
                </>
              )}
            </div>
          </div>

          {/* The actions live up here, where people look for them, not in a bar at the bottom of a long page. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canWrite && campaign.status === "draft" && (
              <Button variant="secondary" loading={previewState.loading} onClick={() => void runPreview()}>
                <Eye className="size-4" />
                Preview audience
              </Button>
            )}
            {canWrite && campaign.status === "draft" && (
              <Button loading={confirmState.loading} onClick={() => void runConfirm()}>
                <CheckCircle2 className="size-4" />
                Confirm audience
              </Button>
            )}
            {canSchedule && campaign.status === "confirmed" && (
              <Button variant="secondary" disabled={!approved} title={sendHint} onClick={() => setScheduleOpen(true)}>
                <CalendarPlus className="size-4" />
                Schedule
              </Button>
            )}
            {canWrite && campaign.status === "confirmed" && (
              <Button disabled={!approved} title={sendHint} onClick={() => setConfirmingSend(true)}>
                <Send className="size-4" />
                Send now
              </Button>
            )}

            <ActionMenu
              variant="button"
              triggerLabel="More"
              label="More campaign actions"
              items={[
                {
                  label: "View messages",
                  icon: <MessageSquare className="size-4" aria-hidden="true" />,
                  onClick: () => void loadMessages(),
                  disabled: campaign.status !== "dispatched",
                  loading: messagesState.loading,
                },
                {
                  label: "Export report",
                  icon: <Download className="size-4" aria-hidden="true" />,
                  onClick: () => void exportCsv(),
                  disabled: campaign.status !== "dispatched",
                  loading: exportState.loading,
                },
              ]}
            />
          </div>
        </div>

        <Stepper steps={steps} activeIndex={stepIndex} />
      </div>

      {previewState.error && <Alert variant="error">{previewState.error}</Alert>}
      {confirmState.error && <Alert variant="error">{confirmState.error}</Alert>}
      {sendState.error && <Alert variant="error">{sendState.error}</Alert>}
      {exportState.error && <Alert variant="error">{exportState.error}</Alert>}
      {messagesState.error && <Alert variant="error">{messagesState.error}</Alert>}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Message</CardTitle>
              <span className="text-xs text-ink-400">
                {campaign.message.length} characters{campaign.channel !== "email" && ` · sent from ${campaign.senderId}`}
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {campaign.channel !== "sms" && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Email subject</p>
                  <p className="mt-1 text-base font-medium text-ink-900">{campaign.emailSubject}</p>
                </div>
              )}
              <div>
                {campaign.channel !== "sms" && (
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Body</p>
                )}
                <p className="mt-1 whitespace-pre-wrap break-words rounded-xl rounded-tl-sm border border-border-subtle bg-surface-sunken p-4 text-sm leading-relaxed text-ink-900">
                  {opening && (
                    <>
                      <span className="text-ink-500" title="Filled in with each customer's first name when sent">
                        {opening}
                      </span>
                      {"\n"}
                    </>
                  )}
                  {campaign.message}
                  {smsFooter && (
                    <>
                      {"\n"}
                      <span className="text-ink-500" title="Added automatically to every SMS">
                        {smsFooter}
                      </span>
                    </>
                  )}
                </p>
                {smsFooter && (
                  <p className="mt-1.5 text-xs text-ink-500">
                    Every SMS ends with this opt-out line, added automatically. The email does not include it.
                  </p>
                )}
                {opening && (
                  <p className="mt-1.5 text-xs text-ink-500">
                    Each message starts with a personal greeting; [first name] is replaced with the customer&apos;s own.
                  </p>
                )}
              </div>
              <div>
                <Button variant="secondary" size="sm" loading={recipientsState.loading} onClick={() => void loadRecipients()}>
                  <Users className="size-4" />
                  {showRecipients ? "Refresh recipients" : "Review recipients"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {report && report.totalMessages > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Sending progress</CardTitle>
                <span className="text-xs text-ink-400">
                  {report.pending > 0 ? "Still sending - updates automatically" : "Complete"}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-500">
                    <span className="text-2xl font-semibold tabular-nums text-ink-900">
                      {(report.sent + report.failed).toLocaleString()}
                    </span>{" "}
                    of {report.totalMessages.toLocaleString()} processed
                  </span>
                  <span className="tabular-nums text-ink-500">
                    {Math.round(((report.sent + report.failed) / report.totalMessages) * 100)}%
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-sunken"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={report.totalMessages}
                  aria-valuenow={report.sent + report.failed}
                  aria-label="Messages processed"
                >
                  <div
                    className="h-full bg-brand-600 transition-all"
                    style={{ width: `${Math.round(((report.sent + report.failed) / report.totalMessages) * 100)}%` }}
                  />
                </div>
                <StatGrid className="sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Waiting" value={report.pending} />
                  <StatCard label="Sent" value={report.sent} />
                  <StatCard label="Delivered or read" value={report.deliveryDelivered + report.deliveryRead} />
                  <StatCard label="Failed" value={report.failed} />
                </StatGrid>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" loading={messagesState.loading} onClick={() => void loadMessages()}>
                    <MessageSquare className="size-4" />
                    {showMessages ? "Refresh messages" : "View messages"}
                  </Button>
                  <Button variant="secondary" size="sm" loading={exportState.loading} onClick={() => void exportCsv()}>
                    <Download className="size-4" />
                    Export report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {preview && (
            <Card>
              <CardHeader>
                <CardTitle>Audience preview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <StatGrid className="sm:grid-cols-3">
                  <StatCard label="Candidates" value={preview.totalCandidates} />
                  <StatCard label="Eligible" value={preview.eligibleCount} />
                  <StatCard label="Excluded" value={preview.excludedCount} />
                </StatGrid>
                {Object.keys(preview.excludedReasons).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(preview.excludedReasons).map(([reason, count]) => (
                      <Badge key={reason} tone="amber">
                        {humanize(reason)}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showRecipients && (
            <Card>
              <CardHeader>
                <CardTitle>Recipients ({recipients?.length ?? 0})</CardTitle>
              </CardHeader>
              <DataTable columns={recipientColumns} data={recipients} rowKey={(r) => r.customerId} />
            </Card>
          )}

          {showMessages && (
            <Card>
              <CardHeader>
                <CardTitle>Messages ({messagesTotal || (messages?.length ?? 0)})</CardTitle>
              </CardHeader>
              {messages && messagesTotal > messages.length && (
                <div className="px-5 pt-4">
                  <Alert variant="info">
                    Showing the first {messages.length} of {messagesTotal} messages. Use Export report for the complete list.
                  </Alert>
                </div>
              )}
              <DataTable
                columns={messageColumns}
                data={messages}
                rowKey={(m) => m.id}
                emptyTitle="No messages yet"
                emptyDescription="Messages appear here once this campaign is sent."
              />
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {emailCampaign && (files.length > 0 || canEditFiles) && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Attachments{files.length > 0 ? ` (${files.length})` : ""}</CardTitle>
                {canEditFiles && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={uploadState.loading}
                    onClick={() => attachmentInput.current?.click()}
                  >
                    <Paperclip className="size-4" />
                    Add file
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <input
                  ref={attachmentInput}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  className="sr-only"
                  aria-label="Choose files to attach"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (picked.length > 0) void uploadFiles(picked);
                  }}
                />
                {files.length === 0 ? (
                  <p className="text-sm text-ink-500">No files attached. Each recipient would receive only the message.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border-subtle">
                    {files.map((file) => (
                      <li key={file.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                        <FileText className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block truncate font-medium text-ink-900" title={file.filename}>
                            {file.filename}
                          </span>
                          <span className="text-xs text-ink-400">{formatBytes(file.size)}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Download ${file.filename}`}
                          title="Download to review"
                          disabled={downloadFileState.loading}
                          onClick={() => void downloadFile(file.id, file.filename)}
                        >
                          <Download className="size-4" aria-hidden="true" />
                        </Button>
                        {canEditFiles && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${file.filename}`}
                            title="Remove"
                            disabled={removeFileState.loading}
                            onClick={() => void removeFile(file.id)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {attachmentProblems.length > 0 && (
                  <Alert variant="warning">
                    <ul className="list-inside list-disc">
                      {attachmentProblems.map((problem) => (
                        <li key={problem}>{problem}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                {(uploadState.error || removeFileState.error || downloadFileState.error) && (
                  <Alert variant="error">{uploadState.error || removeFileState.error || downloadFileState.error}</Alert>
                )}
                {campaign.status === "draft" && (
                  <p className="text-xs text-ink-500">
                    Files are locked once the campaign is confirmed, so approvers review exactly what will be sent.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {campaign.status === "draft" && approvals && (
            <Card>
              <CardHeader>
                <CardTitle>What happens next</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-4 text-sm">
                  {[
                    ["Preview and confirm", "Check who will receive it, then lock the audience in."],
                    [
                      `Get ${approvals.required} ${approvals.required === 1 ? "approval" : "approvals"}`,
                      "Someone other than the creator must review and approve it.",
                    ],
                    ["Send or schedule", "Once approved, send it now or pick a time."],
                  ].map(([title, detail], index) => (
                    <li key={title} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                        {index + 1}
                      </span>
                      <span>
                        <span className="block font-medium text-ink-900">{title}</span>
                        <span className="text-ink-500">{detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {(campaign.status === "confirmed" || campaign.status === "dispatched") && approvals && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Approvals</CardTitle>
                <Badge tone={approved ? "green" : "amber"}>{approved ? "Approved" : "Waiting"}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-ink-500">
                    <span className="text-2xl font-semibold tabular-nums text-ink-900">{approvals.approved}</span> of{" "}
                    {approvals.required} required
                  </p>
                  <div className="mt-2 flex gap-1.5" aria-hidden="true">
                    {Array.from({ length: approvals.required }).map((_, i) => (
                      <span
                        key={i}
                        className={cn("h-1.5 flex-1 rounded-full", i < approvals.approved ? "bg-status-green-text" : "bg-surface-sunken")}
                      />
                    ))}
                  </div>
                  {needsMoreApprovals && (
                    <p className="mt-2 text-sm text-ink-500">
                      {approvalsNeeded} more {approvalsNeeded === 1 ? "approval" : "approvals"} needed before this can be sent.
                    </p>
                  )}
                </div>

                {approvals.approvers.length > 0 && (
                  <ul className="flex flex-col gap-3">
                    {approvals.approvers.map((a) => (
                      <li key={a.userId} className="flex items-center gap-3">
                        <Avatar label={a.email || a.userId} size="sm" />
                        <span className="min-w-0 text-sm">
                          <span className="block truncate font-medium text-ink-900">{a.email || a.userId}</span>
                          <span className="text-xs text-ink-400">Approved {formatDateTime(a.approvedAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {campaign.status === "confirmed" && isCreator && (
                  <Alert variant="info">You created this campaign, so someone else must approve it.</Alert>
                )}
                {campaign.status === "confirmed" && alreadyApproved && (
                  <Alert variant="success">You have approved this campaign.</Alert>
                )}
                {approveState.error && <Alert variant="error">{approveState.error}</Alert>}
                {canApprove && (
                  <div className="flex flex-col items-start gap-2 border-t border-border-subtle pt-4">
                    <p className="text-sm text-ink-500">
                      Read the message and check the recipients before approving. Approval cannot be withdrawn.
                    </p>
                    <Button className="w-full" loading={approveState.loading} onClick={() => void runApprove()}>
                      <ShieldCheck className="size-4" />
                      Approve campaign
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        campaignId={campaign.id}
        onScheduled={() => {
          setScheduleOpen(false);
          toast.success("Campaign scheduled.");
        }}
      />

      <ConfirmDialog
        open={confirmingSend}
        onClose={() => setConfirmingSend(false)}
        onConfirm={handleConfirmSend}
        loading={sendState.loading}
        tone="danger"
        title="Send this campaign now?"
        description={`This immediately dispatches "${campaign.name}" to its confirmed audience. Messages cannot be recalled once sent.`}
        confirmLabel="Send campaign"
      />
    </div>
  );
}
