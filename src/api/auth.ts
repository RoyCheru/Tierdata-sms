import { http } from "@/lib/http";
import type { CurrentUser, Session } from "@/types/entities";

export const authApi = {
  demoLogin: (identifier: string) =>
    http.post<Session>("/auth/demo-login", { identifier }),

  logout: (sessionId: string) => http.post<null>("/auth/logout", { sessionId }),

  session: () => http.get<CurrentUser>("/auth/session"),

  extendSession: () => http.post<{ expiresAt: string; expiresInSeconds: number }>("/auth/session/extend"),
};
