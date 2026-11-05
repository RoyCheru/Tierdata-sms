import type { Envelope, Pagination } from "@/types/api";
import { ApiError } from "@/types/api";

// In dev, Vite proxies /api-backend -> http://localhost:8080 (the Go API has
// no CORS middleware configured, so a direct cross-origin call would fail).
// In production set VITE_API_BASE_URL to the API's own origin (still requires
// the backend to add CORS, or to be served behind the same reverse proxy).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api-backend";

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

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query } = options;
  const headers: Record<string, string> = {};
  const sessionId = getSessionId();
  if (sessionId) headers.Authorization = `Bearer ${sessionId}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: payload,
  });

  if (options.raw) {
    if (!response.ok) {
      throw new ApiError(response.status, `Request failed with status ${response.status}`);
    }
    return response as unknown as T;
  }

  const envelope = (await response.json()) as Envelope<T>;

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!response.ok) {
    throw new ApiError(envelope.status ?? response.status, envelope.message ?? "Request failed");
  }

  return envelope.data;
}

export async function requestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; pagination: Pagination | null }> {
  const { method = "GET", query } = options;
  const headers: Record<string, string> = {};
  const sessionId = getSessionId();
  if (sessionId) headers.Authorization = `Bearer ${sessionId}`;

  const response = await fetch(buildUrl(path, query), { method, headers });
  const envelope = (await response.json()) as Envelope<T>;

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!response.ok) {
    throw new ApiError(envelope.status ?? response.status, envelope.message ?? "Request failed");
  }

  return { data: envelope.data, pagination: envelope.pagination };
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
