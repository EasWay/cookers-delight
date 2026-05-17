import { useState, useEffect, useCallback, useRef } from 'react';
import type { AxiosPromise } from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Tiny data-fetching hook backed by axios.
 *
 * IMPORTANT: callers typically pass an inline arrow as `fetcher`
 * (e.g. `useApi(() => fooApi.list())`). That arrow is a NEW reference
 * on every render. If `fetcher` were a useEffect dependency, the effect
 * would re-fire on every render and create an infinite fetch loop.
 *
 * To avoid forcing every caller to memoize, we stash the latest fetcher
 * in a ref and run the effect exactly once on mount.
 */
export function useApi<T>(
  fetcher: () => AxiosPromise<{ data: T }>,
): UseApiState<T> {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  // Always keep the latest fetcher available without making it a dep.
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  const fetchData = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    fetcherRef.current()
      .then(res => {
        setData(res.data.data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError(err.message ?? 'Request failed');
          setLoading(false);
        }
      });
  }, []);

  // Run exactly once on mount; the consumer can manually refetch.
  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
