import { buildSeed } from "./seed";
import type { DemoDb } from "./types";

const STORAGE_KEY = "tierdata.demo.db";
const DB_VERSION = 1;

let cached: DemoDb | null = null;

function persist(db: DemoDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage can be unavailable in private browsing or when the quota is full.
  }
}

export function getDb(): DemoDb {
  if (cached) return cached;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDb;
      if (parsed.version === DB_VERSION) {
        cached = parsed;
        return cached;
      }
    }
  } catch {
    // Fall through to a clean seed.
  }

  cached = buildSeed();
  persist(cached);
  return cached;
}

export function saveDb(): void {
  if (cached) persist(cached);
}

export function resetDb(): DemoDb {
  cached = buildSeed();
  persist(cached);
  return cached;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addAudit(
  db: DemoDb,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
): void {
  const email = db.sessionEmail ?? "demo@tierdata.app";
  db.audit.unshift({
    id: newId("aud"),
    actorId: "demo-user",
    actorLabel: email,
    action,
    targetType,
    targetId,
    occurredAt: nowIso(),
    metadata: JSON.stringify(metadata),
  });
  db.audit = db.audit.slice(0, 500);
}
