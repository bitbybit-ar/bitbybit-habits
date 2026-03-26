"use client";

import { useApi } from "./useApi";

export interface StatsData {
  totalSats: number;
  bestStreak: number;
  pendingCount: number;
}

export function useStats() {
  const result = useApi<StatsData>("/api/stats", {
    totalSats: 0,
    bestStreak: 0,
    pendingCount: 0,
  });
  return result;
}
