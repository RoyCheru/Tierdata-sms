import { http } from "@/lib/http";
import type {
  EmailConfig,
  EmailConfigInput,
  EmailTestResult,
  ProviderConfig,
  ProviderMode,
  ProviderTestResult,
  SendTestMessageResult,
} from "@/types/entities";

export const providerApi = {
  get: () => http.get<ProviderConfig>("/provider/tiara/"),
  save: (input: { mode: ProviderMode; apiKey: string; baseUrl: string }) => http.put<ProviderConfig>("/provider/tiara/", input),
  test: () => http.post<ProviderTestResult>("/provider/tiara/test"),
  // Sends a real SMS using the app's fixed sender ID - no sender ID input needed here.
  sendTest: (input: { phone: string; message: string }) =>
    http.post<SendTestMessageResult>("/provider/tiara/test-sms", input),
  getEmail: () => http.get<EmailConfig>("/provider/email/"),
  saveEmail: (input: EmailConfigInput) => http.put<EmailConfig>("/provider/email/", input),
  testEmail: (input: EmailConfigInput) => http.post<EmailTestResult>("/provider/email/test", input),
};
