import { useRef, useState } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ACCEPT, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES, checkPicked, formatBytes } from "@/lib/attachments";

interface AttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** Choose the files to send with an email campaign. They are uploaded after the campaign is created. */
export function AttachmentPicker({ files, onChange, disabled }: AttachmentPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);

  function handlePick(list: FileList | null) {
    const { accepted, problems: rejected } = checkPicked(files, Array.from(list ?? []));
    setProblems(rejected);
    if (accepted.length > 0) onChange([...files, ...accepted]);
    if (input.current) input.current.value = ""; // allow choosing the same file again later
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        aria-label="Choose files to attach"
        onChange={(e) => handlePick(e.target.files)}
        disabled={disabled}
      />

      {files.length > 0 && (
        <ul className="flex flex-col divide-y divide-border-subtle rounded-lg border border-border-default">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3 py-2">
              <FileText className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-900" title={file.name}>
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-ink-400">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((f) => f !== file))}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="rounded-md p-1 text-ink-400 hover:bg-surface-hover hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {problems.length > 0 && (
        <Alert variant="warning">
          <ul className="list-inside list-disc">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || files.length >= MAX_FILES}
          onClick={() => input.current?.click()}
        >
          <Paperclip className="size-4" />
          {files.length > 0 ? "Add another file" : "Attach files"}
        </Button>
        <span className="text-xs text-ink-500">
          PDF, Word, Excel, PowerPoint, images, CSV or text. Up to {MAX_FILES} files, {formatBytes(MAX_FILE_BYTES)} each and{" "}
          {formatBytes(MAX_TOTAL_BYTES)} in total. Every recipient receives a copy.
        </span>
      </div>
    </div>
  );
}
