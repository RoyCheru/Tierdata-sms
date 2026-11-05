import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/types/api";
import type { Pagination } from "@/types/api";

interface QueryState<T> {
  data: T | null;
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
}

/**
 * Lightweight fetch-on-deps hook. Deliberately avoids pulling in a cache
 * library (TanStack Query etc.) since this app has no realtime data and
 * simple refetch-on-mutation covers every list/detail page here.
 */
export function useQuery<T>(
  fn: () => Promise<T | { data: T; pagination: Pagination | null }>,
  deps: unknown[],
): QueryState<T> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({ data: null, pagination: null, loading: true, error: null });
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fn()
      .then((result) => {
        if (id !== requestId.current) return;
        if (result && typeof result === "object" && "pagination" in result) {
          const paged = result as { data: T; pagination: Pagination | null };
          setState({ data: paged.data, pagination: paged.pagination, loading: false, error: null });
        } else {
          setState({ data: result as T, pagination: null, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;
        const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        setState({ data: null, pagination: null, loading: false, error: message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return { ...state, refetch: run };
}

interface MutationState {
  loading: boolean;
  error: string | null;
}

export function useMutation<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
): [(...args: Args) => Promise<T>, MutationState] {
  const [state, setState] = useState<MutationState>({ loading: false, error: null });

  const mutate = useCallback(
    async (...args: Args) => {
      setState({ loading: true, error: null });
      try {
        const result = await fn(...args);
        setState({ loading: false, error: null });
        return result;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        setState({ loading: false, error: message });
        throw err;
      }
    },
    [fn],
  );

  return [mutate, state];
}
