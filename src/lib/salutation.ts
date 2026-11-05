/** Greetings offered in the campaign form. "" means none; "custom" lets the user type their own. */
export const GREETING_PRESETS = ["Hello", "Hi", "Dear", "Good morning", "Good afternoon", "Good evening"] as const;

export const MAX_GREETING_LENGTH = 40;

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * The opening line of a personalised message, e.g. "Dear Jane,". Mirrors
 * backend/internal/campaign/salutation.go, which builds the real one when the
 * campaign is sent; this is used for previews. Returns "" when neither a
 * greeting nor the name is wanted.
 */
export function salutation(greeting: string, includeName: boolean, customerName: string): string {
  const parts: string[] = [];
  if (greeting.trim()) parts.push(greeting.trim());
  if (includeName) {
    const first = firstName(customerName);
    if (first) parts.push(first);
  }
  return parts.length ? `${parts.join(" ")},` : "";
}

/** The same line with the name shown as a placeholder, for reviewers who see no real customer. */
export function salutationTemplate(greeting: string, includeName: boolean): string {
  // Not routed through salutation(): that keeps only the first word of a name,
  // which would cut the placeholder "[first name]" down to "[first".
  const parts: string[] = [];
  if (greeting.trim()) parts.push(greeting.trim());
  if (includeName) parts.push("[first name]");
  return parts.length ? `${parts.join(" ")},` : "";
}
