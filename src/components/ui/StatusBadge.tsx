import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { humanize } from "@/lib/statusTones";

export function StatusBadge<T extends string>({ status, toneMap }: { status: T; toneMap: Record<T, BadgeTone> }) {
  return <Badge tone={toneMap[status]}>{humanize(status)}</Badge>;
}
