import { http } from "@/lib/http";
import type { AppUser, Role } from "@/types/entities";
import type { ListParams } from "@/types/api";

export const usersApi = {
  list: (params: ListParams = {}) => http.list<AppUser[]>("/users/", { ...params }),
  // inviteSent is false when the user has no email or the invite email failed to send.
  create: (input: { email: string; phone: string; role: Role }) =>
    http.post<AppUser & { inviteSent: boolean }>("/users/", input),
  resendInvite: (id: string) => http.post<null>(`/users/${id}/invite`),
  deactivate: (id: string) => http.post<AppUser>(`/users/${id}/deactivate`),
  updateRole: (id: string, role: Role) => http.patch<AppUser>(`/users/${id}/role`, { role }),
};
