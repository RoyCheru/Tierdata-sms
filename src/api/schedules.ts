import { http } from "@/lib/http";
import type { Schedule } from "@/types/entities";
import type { ListParams } from "@/types/api";

export const schedulesApi = {
  list: (params: Pick<ListParams, "page" | "limit"> = {}) => http.list<Schedule[]>("/schedules/", { ...params }),
  create: (input: { campaignId: string; runAt: string }) => http.post<Schedule>("/schedules/", input),
  cancel: (id: string) => http.post<Schedule>(`/schedules/${id}/cancel`),
  reschedule: (id: string, runAt: string) => http.patch<Schedule>(`/schedules/${id}`, { runAt }),
};
