import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, Download } from "lucide-react";
import { importsApi } from "@/api/imports";
import { groupsApi } from "@/api/groups";
import type { ImportRow, ImportSummary } from "@/types/entities";
import type { Group } from "@/types/entities";
import { useMutation, useQuery } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatGrid, StatCard } from "@/components/ui/StatGrid";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { importStatusTone, humanize } from "@/lib/statusTones";

const OUTCOME_TONE = { valid: "green", invalid: "red", duplicate: "amber" } as const;

export function ImportsPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [groupId, setGroupId] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [confirmingApply, setConfirmingApply] = useState(false);

  const { data: groupsData } = useQuery(() => groupsApi.list({ limit: 200 }), []);
  const groups: Group[] = groupsData ?? [];

  const [upload, uploadState] = useMutation(async (file: File) => {
    const result = await importsApi.create(file, groupId || undefined);
    const fetchedRows = await importsApi.rows(result.id);
    setSummary(result);
    setRows(fetchedRows);
    return result;
  });

  const [apply, applyState] = useMutation(async () => {
    if (!summary) return;
    await importsApi.apply(summary.id);
    const refreshed = await importsApi.get(summary.id);
    setSummary(refreshed);
  });

  async function handleApply() {
    await apply();
    setConfirmingApply(false);
    toast.success(
      groupId
        ? "Import applied - new customers were created and everyone (new or existing) was added to the group."
        : "Import applied - valid rows are now customers.",
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  }

  function reset() {
    setSummary(null);
    setRows(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDownloadTemplate() {
    const csv = "name,phone,email\nJane Doe,+254700000000,jane.doe@example.com\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const rowColumns: Column<ImportRow>[] = [
    { key: "rowNumber", header: "#", render: (r) => r.rowNumber, className: "tabular-nums" },
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "phone", header: "Phone", render: (r) => r.phone },
    { key: "email", header: "Email", render: (r) => r.email || "-" },
    {
      key: "outcome",
      header: "Outcome",
      render: (r) => <Badge tone={OUTCOME_TONE[r.outcome]}>{r.outcome}</Badge>,
    },
    { key: "reason", header: "Reason", render: (r) => (r.reason ? humanize(r.reason) : "-") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import customers"
        description="Upload a CSV of name, phone and (optionally) email columns to bulk-add customers."
        action={
          <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
            <Download className="size-4" />
            Download template
          </Button>
        }
      />

      <Card className="p-5">
        {!summary ? (
          <div className="flex flex-col gap-4">
            <div className="w-64">
              <Select
                label="Add to group (optional)"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                hint="Rows whose phone number already belongs to a customer are added to this group too - no duplicate customer is created, and no new customer is created for them."
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            {uploadState.error && <Alert variant="error">{uploadState.error}</Alert>}
            <Alert variant="warning">
              Editing in Excel or Google Sheets first? Format the phone column as <strong>Text</strong> before typing
              or pasting numbers - otherwise long numbers get auto-converted to scientific notation (e.g.{" "}
              <code className="font-mono">2.547E+11</code>) or lose a leading zero, and we'll reject those rows.
            </Alert>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-default p-10 text-center transition-colors hover:border-brand-300 hover:bg-surface-hover">
              <UploadCloud className="size-8 text-ink-400" aria-hidden="true" />
              <p className="text-sm font-medium text-ink-700">Click to choose a CSV file</p>
              <p className="text-xs text-ink-500">Columns: name, phone, email (email is optional). Header row optional.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                aria-label="Choose a CSV file to import"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {uploadState.loading && <p className="text-sm text-ink-500">Validating file…</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink-900">{summary.filename}</p>
                <Badge tone={importStatusTone[summary.status]}>{summary.status}</Badge>
              </div>
              <div className="flex gap-2">
                {summary.status === "validated" && (
                  <Button onClick={() => setConfirmingApply(true)}>
                    <CheckCircle2 className="size-4" />
                    Apply import
                  </Button>
                )}
                <Button variant="secondary" onClick={reset}>
                  Upload another
                </Button>
              </div>
            </div>

            {applyState.error && <Alert variant="error">{applyState.error}</Alert>}
            {summary.status === "applied" && (
              <Alert variant="success">Import applied - valid rows are now customers.</Alert>
            )}

            <StatGrid>
              <StatCard label="Total rows" value={summary.totalRows} />
              <StatCard label="Valid" value={summary.validRows} />
              <StatCard label="Invalid" value={summary.invalidRows} />
              <StatCard label="Duplicate" value={summary.duplicateRows} />
            </StatGrid>

            <DataTable columns={rowColumns} data={rows} rowKey={(r) => String(r.rowNumber)} />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmingApply}
        onClose={() => setConfirmingApply(false)}
        onConfirm={handleApply}
        loading={applyState.loading}
        title="Apply this import?"
        description={
          groupId && summary && summary.duplicateRows > 0
            ? `This creates ${summary.validRows} new customer${summary.validRows === 1 ? "" : "s"} and adds ${summary.validRows + summary.duplicateRows} customer${summary.validRows + summary.duplicateRows === 1 ? "" : "s"} in total (new and already-existing) to the selected group. This can't be undone.`
            : `This creates ${summary?.validRows ?? 0} new customer${summary?.validRows === 1 ? "" : "s"} from the valid rows. This can't be undone.`
        }
        confirmLabel="Apply import"
      />
    </div>
  );
}
