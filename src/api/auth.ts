import { http } from "@/lib/http";
import type { CurrentUser, Session } from "@/types/entities";

// The server answers as soon as ONE channel has delivered the code; a channel
// still in flight at that moment is reported as pending, not failed.
export interface OtpRequestResult {
  emailSent: boolean;
  smsSent: boolean;
  emailPending?: boolean;
  smsPending?: boolean;
}

export const authApi = {
  requestOtp: (identifier: string) =>
    http.post<OtpRequestResult>("/auth/otp/request", { identifier }),

  verifyOtp: (identifier: string, code: string) =>
    http.post<Session>("/auth/otp/verify", { identifier, code }),

  logout: (sessionId: string) => http.post<null>("/auth/logout", { sessionId }),

  session: () => http.get<CurrentUser>("/auth/session"),

  // Restarts the full session duration; the server records it in the audit log.
  extendSession: () => http.post<{ expiresAt: string; expiresInSeconds: number }>("/auth/session/extend"),
};
