"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Habit } from "@/lib/types";

export function useHabits() {
  const [data, setData] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/habits");
      if (!mountedRef.current) return;
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          // Handle both paginated { habits, pagination } and flat array responses
          const habits = json.data?.habits ?? json.data ?? [];
          setData(habits);
        } else {
          setError(json.error ?? "Unknown error");
        }
      }
    } catch {
      if (mountedRef.current) setError("Network error");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData, setData };
}
