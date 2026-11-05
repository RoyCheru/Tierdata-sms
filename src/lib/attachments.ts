// Mirrors the limits in backend/internal/campaign/attachment.go. The server
// enforces them regardless; checking here just gives an instant, friendly answer.
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".gif", ".csv", ".txt"];
export const ACCEPT = ALLOWED_EXTENSIONS.join(",");

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Decides which of `picked` can be added to `current`, and explains each one
 * that cannot, so the user is told why instead of a file silently vanishing.
 */
export function checkPicked(current: File[], picked: File[]): { accepted: File[]; problems: string[] } {
  const accepted: File[] = [];
  const problems: string[] = [];
  let total = current.reduce((sum, f) => sum + f.size, 0);

  for (const file of picked) {
    if (current.length + accepted.length >= MAX_FILES) {
      problems.push(`${file.name}: a campaign can have at most ${MAX_FILES} attachments.`);
    } else if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
      problems.push(`${file.name}: this type of file can't be attached.`);
    } else if (file.size === 0) {
      problems.push(`${file.name}: the file is empty.`);
    } else if (file.size > MAX_FILE_BYTES) {
      problems.push(`${file.name}: too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_FILE_BYTES)} per file.`);
    } else if (total + file.size > MAX_TOTAL_BYTES) {
      problems.push(`${file.name}: attachments can total at most ${formatBytes(MAX_TOTAL_BYTES)}.`);
    } else if ([...current, ...accepted].some((f) => f.name === file.name && f.size === file.size)) {
      problems.push(`${file.name}: already added.`);
    } else {
      accepted.push(file);
      total += file.size;
    }
  }
  return { accepted, problems };
}
