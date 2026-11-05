import type { Pagination } from "@/types/api";
import { ApiError } from "@/types/api";
import { demoPaginated, demoRawRequest, demoRequest } from "@/mock/handler";

const SESSION_STORAGE_KEY = "centum.sessionId";

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

export function setSessionId(sessionId: string | null) {
  if (sessionId) {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(DEADLINE_STORAGE_KEY);
  }
}

// When the session ends, as an epoch-ms deadline. It lives in localStorage
// next to the session id so every open tab counts down to the same moment, and
// extending in one tab is seen by the others instead of one of them logging
// the shared session out early.
const DEADLINE_STORAGE_KEY = "centum.sessionDeadline";

export function getSessionDeadline(): number | null {
  const raw = localStorage.getItem(DEADLINE_STORAGE_KEY);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** The server reports seconds left (not a timestamp) so a wrong browser clock can't skew the countdown. */
export function setSessionExpiresIn(seconds: number) {
  localStorage.setItem(DEADLINE_STORAGE_KEY, String(Date.now() + seconds * 1000));
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  raw?: boolean; // when true, resolves to the fetch Response instead of parsing envelope (e.g. CSV export)
}


export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, raw } = options;
  try {
    if (raw) {
      return (await demoRawRequest(path, method, query)) as unknown as T;
    }
    return await demoRequest<T>(path, method, body, query);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && onUnauthorized) onUnauthorized();
    throw err;
  }
}

export async function requestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; pagination: Pagination | null }> {
  const { method = "GET", query } = options;
  try {
    return await demoPaginated<T>(path, method, query);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && onUnauthorized) onUnauthorized();
    throw err;
  }
}

export const http = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown, query?: RequestOptions["query"]) =>
    request<T>(path, { method: "POST", body, query }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  list: <T>(path: string, query?: RequestOptions["query"]) => requestPaginated<T>(path, { query }),
};
