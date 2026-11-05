import { http } from "@/lib/http";
import type { Customer, CustomerStatus, SmsEligibility } from "@/types/entities";
import type { ListParams } from "@/types/api";

export interface CustomerListParams extends ListParams {
  status?: CustomerStatus;
  smsEligibility?: SmsEligibility;
}

export const customersApi = {
  list: (params: CustomerListParams = {}) => http.list<Customer[]>("/customers/", { ...params }),
  get: (id: string) => http.get<Customer>(`/customers/${id}`),
  create: (input: { name: string; phone: string; email: string }) => http.post<Customer>("/customers/", input),
  update: (id: string, input: { name: string; phone: string; email: string }) => http.put<Customer>(`/customers/${id}`, input),
  archive: (id: string) => http.post<Customer>(`/customers/${id}/archive`),
  activate: (id: string) => http.post<Customer>(`/customers/${id}/activate`),
  updateSmsEligibility: (id: string, smsEligibility: SmsEligibility) =>
    http.patch<Customer>(`/customers/${id}/sms-eligibility`, { smsEligibility }),
};
