import { http } from "@/lib/http";
import type { Group, GroupMembers } from "@/types/entities";
import type { ListParams } from "@/types/api";

export const groupsApi = {
  list: (params: ListParams = {}) => http.list<Group[]>("/groups/", { ...params }),
  get: (id: string) => http.get<Group>(`/groups/${id}`),
  create: (input: { name: string; description: string }) => http.post<Group>("/groups/", input),
  members: (id: string) => http.get<GroupMembers>(`/groups/${id}/members`),
  addMember: (id: string, customerId: string) => http.post<null>(`/groups/${id}/members`, { customerId }),
  removeMember: (id: string, customerId: string) => http.delete<null>(`/groups/${id}/members/${customerId}`),
};
