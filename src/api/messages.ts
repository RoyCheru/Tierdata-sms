import { http } from "@/lib/http";
import type { Message, MessageStatus } from "@/types/entities";
import type { ListParams } from "@/types/api";

export interface MessageListParams extends ListParams {
  campaignId?: string;
  status?: MessageStatus;
}

export const messagesApi = {
  list: (params: MessageListParams = {}) => http.list<Message[]>("/messages", { ...params }),
};
