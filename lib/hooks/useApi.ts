"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T>>;
}

interface UseApiOptions {
  /** Skip the initial fetch */
  skip?: boolean;
}

/**
 * Generic hook for fetching from the API.
 * Handles loading, error, and the standard { success, data } response shape.
 */
export function useApi<T>(
  url: string,
  initialData: T,
  options?: UseApiOptions
): UseApiResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(!options?.skip);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!mountedRef.current) return;
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data ?? initialData);
        } else {
          setError(json.error ?? "Unknown error");
        }
      } else {
        setError(`HTTP ${res.status}`);
      }
    } catch {
      if (mountedRef.current) setError("Network error");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [url]); // initialData intentionally excluded — only for default value

  useEffect(() => {
    mountedRef.current = true;
    if (!options?.skip) fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData, options?.skip]);

  return { data, isLoading, error, refetch: fetchData, setData };
}
