import { http } from "@/lib/http";
import type { DashboardAnalytics } from "@/types/entities";

export const analyticsApi = {
  dashboard: () => http.get<DashboardAnalytics>("/analytics/dashboard"),
};
