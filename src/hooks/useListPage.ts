import { useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQuery } from "@/hooks/useApi";
import type { Pagination } from "@/types/api";

interface UseListPageOptions<T, F extends Record<string, unknown>> {
  fetcher: (params: { page: number; limit: number; search?: string } & F) => Promise<{ data: T[]; pagination: Pagination | null }>;
  limit?: number;
  filters?: F;
  extraDeps?: unknown[];
}

export function useListPage<T, F extends Record<string, unknown> = Record<string, never>>({
  fetcher,
  limit = 20,
  filters = {} as F,
  extraDeps = [],
}: UseListPageOptions<T, F>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const filterValues = Object.values(filters);

  const { data, pagination, loading, error, refetch } = useQuery(
    () => fetcher({ page, limit, search: debouncedSearch || undefined, ...filters }),
    [page, limit, debouncedSearch, ...filterValues, ...extraDeps],
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return {
    rows: data ?? [],
    pagination,
    loading,
    error,
    refetch,
    page,
    setPage,
    search,
    onSearchChange: handleSearchChange,
  };
}
