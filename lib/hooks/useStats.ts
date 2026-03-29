"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface StatsData {
  totalSats: number;
  bestStreak: number;
  pendingCount: number;
}

interface StatsApiResponse {
  total_sats_earned: number;
  streaks: { habit_id: string; habit_name: string; current_streak: number }[];
  pending_completions: number;
}

const initialData: StatsData = { totalSats: 0, bestStreak: 0, pendingCount: 0 };

function transform(raw: StatsApiResponse): StatsData {
  const bestStreak = raw.streaks.length > 0
    ? Math.max(...raw.streaks.map((s) => s.current_streak))
    : 0;
  return {
    totalSats: raw.total_sats_earned,
    bestStreak,
    pendingCount: raw.pending_completions,
  };
}

export function useStats() {
  const [data, setData] = useState<StatsData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats", { signal: controller.signal, cache: "no-store" });
      if (controller.signal.aborted) return;
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data ? transform(json.data) : initialData);
        } else {
          setError(json.error ?? "Unknown error");
        }
      } else {
        setError(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) setError("Network error");
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData, setData };
}
