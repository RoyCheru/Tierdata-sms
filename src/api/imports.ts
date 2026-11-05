import { http } from "@/lib/http";
import type { ImportSummary, ImportRow } from "@/types/entities";

export const importsApi = {
  create: (file: File, groupId?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (groupId) form.append("groupId", groupId);
    return http.post<ImportSummary>("/imports/", form);
  },
  get: (id: string) => http.get<ImportSummary>(`/imports/${id}`),
  rows: (id: string) => http.get<ImportRow[]>(`/imports/${id}/rows`),
  apply: (id: string) => http.post<null>(`/imports/${id}/apply`),
};
