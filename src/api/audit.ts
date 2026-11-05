import { http } from "@/lib/http";
import type { AuditEvent } from "@/types/entities";
import type { ListParams } from "@/types/api";

export interface AuditListParams extends ListParams {
  actorId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  list: (params: AuditListParams = {}) => http.list<AuditEvent[]>("/audit/events", { ...params }),
};
