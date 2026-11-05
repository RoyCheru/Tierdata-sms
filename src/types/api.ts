// Mirrors backend/internal/platform/httpresponse/envelope.go exactly.
export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface Envelope<T> {
  status: number;
  message: string;
  data: T;
  pagination: Pagination | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}
