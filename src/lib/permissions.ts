import type { Role } from "@/types/entities";

// Note: the backend also defines senders:read/write (the /senders API still
// exists), but nothing in this frontend uses it anymore -- campaigns send
// from a single fixed sender ID (SMS_FROM) configured server-side, not a
// per-campaign choice -- so it's intentionally omitted here.
export type Permission =
  | "users:read" | "users:write"
  | "customers:read" | "customers:write"
  | "audit:read"
  | "groups:read" | "groups:write"
  | "imports:read" | "imports:write"
  | "provider:read" | "provider:write"
  | "campaigns:read" | "campaigns:write" | "campaigns:approve"
  | "settings:read" | "settings:write"
  | "messages:read"
  | "schedules:read" | "schedules:write"
  | "reports:read";

// Mirrors backend/internal/identity role -> permission grants exactly, for
// the permissions this frontend actually uses (see note above).
const GRANTS: Record<Role, Permission[]> = {
  admin: [
    "users:read", "users:write",
    "customers:read", "customers:write",
    "audit:read",
    "groups:read", "groups:write",
    "imports:read", "imports:write",
    "provider:read", "provider:write",
    "campaigns:read", "campaigns:write", "campaigns:approve",
    "settings:read", "settings:write",
    "messages:read",
    "schedules:read", "schedules:write",
    "reports:read",
  ],
  manager: [
    "customers:read", "customers:write",
    "audit:read",
    "groups:read", "groups:write",
    "imports:read", "imports:write",
    "provider:read", "provider:write",
    "campaigns:read", "campaigns:write", "campaigns:approve",
    "settings:read",
    "messages:read",
    "schedules:read", "schedules:write",
    "reports:read",
  ],
  communicator: [
    "customers:read", "customers:write",
    "groups:read", "groups:write",
    "imports:read", "imports:write",
    "campaigns:read", "campaigns:write",
    "messages:read",
    "schedules:read", "schedules:write",
    "reports:read",
  ],
  viewer: [
    "customers:read",
    "groups:read",
    "imports:read",
    "provider:read",
    "campaigns:read",
    "messages:read",
    "schedules:read",
    "reports:read",
  ],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return GRANTS[role].includes(permission);
}
