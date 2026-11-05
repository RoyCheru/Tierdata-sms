export function FieldLabel({ htmlFor, label, required }: { htmlFor?: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-ink-700">
      {label}
      {required && (
        <span className="ml-0.5 text-status-red-text" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
