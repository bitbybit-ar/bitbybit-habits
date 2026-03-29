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
 * Handles loading, error, the standard { success, data } response shape,
 * and cancels in-flight requests on unmount or URL change.
 */
export function useApi<T>(
  url: string,
  initialData: T,
  options?: UseApiOptions
): UseApiResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(!options?.skip);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (controller.signal.aborted) return;
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
    } catch (err) {
      // Don't set error state if the request was intentionally aborted
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) setError("Network error");
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [url]); // initialData intentionally excluded — only for default value

  useEffect(() => {
    if (!options?.skip) fetchData();
    return () => {
      // Cancel in-flight request on unmount or dependency change
      abortRef.current?.abort();
    };
  }, [fetchData, options?.skip]);

  return { data, isLoading, error, refetch: fetchData, setData };
}
