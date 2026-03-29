"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FamilyWithMembers } from "./useFamilies";

export interface FamilyCompletion {
  id: string;
  habit_id: string;
  habit_name: string;
  kid_user_id: string;
  kid_display_name: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  sat_reward: number;
}

export interface FamilyStats {
  completedToday: number;
  totalToday: number;
  pendingApprovals: number;
  totalSatsPaid: number;
}

const EMPTY_STATS: FamilyStats = {
  completedToday: 0,
  totalToday: 0,
  pendingApprovals: 0,
  totalSatsPaid: 0,
};

/**
 * Fetches completions + stats for all families (sponsor view).
 * Aggregates data across multiple families.
 */
export function useFamilyData(families: FamilyWithMembers[]) {
  const [completions, setCompletions] = useState<FamilyCompletion[]>([]);
  const [stats, setStats] = useState<FamilyStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  const fetchFamilyData = useCallback(async () => {
    if (families.length === 0) return;
    setIsLoading(true);

    try {
      // MVP: Single-family mode — fetch data for the one family only
      const family = families[0];
      const [compRes, statsRes] = await Promise.all([
        fetch(`/api/families/${family.id}/completions?days=7`),
        fetch(`/api/families/${family.id}/stats`),
      ]);

      if (!mountedRef.current) return;

      let allCompletions: FamilyCompletion[] = [];
      const aggregated = { ...EMPTY_STATS };

      if (compRes.ok) {
        const data = await compRes.json();
        if (data.success) allCompletions = data.data ?? [];
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.success && data.data) {
          aggregated.completedToday = data.data.completedToday ?? 0;
          aggregated.totalToday = data.data.totalToday ?? 0;
          aggregated.pendingApprovals = data.data.pendingApprovals ?? 0;
          aggregated.totalSatsPaid = data.data.totalSatsPaid ?? 0;
        }
      }

      setCompletions(allCompletions);
      setStats(aggregated);

      // ROADMAP: Multi-family support (commented for MVP single-family mode)
      // const requests = families.flatMap((f) => [
      //   fetch(`/api/families/${f.id}/completions?days=7`),
      //   fetch(`/api/families/${f.id}/stats`),
      // ]);
      //
      // const responses = await Promise.all(requests);
      // if (!mountedRef.current) return;
      //
      // let allCompletions: FamilyCompletion[] = [];
      // const aggregated = { ...EMPTY_STATS };
      //
      // for (let i = 0; i < families.length; i++) {
      //   const compRes = responses[i * 2];
      //   const statsRes = responses[i * 2 + 1];
      //
      //   if (compRes.ok) {
      //     const data = await compRes.json();
      //     if (data.success) allCompletions = [...allCompletions, ...(data.data ?? [])];
      //   }
      //
      //   if (statsRes.ok) {
      //     const data = await statsRes.json();
      //     if (data.success && data.data) {
      //       aggregated.completedToday += data.data.completedToday ?? 0;
      //       aggregated.totalToday += data.data.totalToday ?? 0;
      //       aggregated.pendingApprovals += data.data.pendingApprovals ?? 0;
      //       aggregated.totalSatsPaid += data.data.totalSatsPaid ?? 0;
      //     }
      //   }
      // }
      //
      // setCompletions(allCompletions);
      // setStats(aggregated);
    } catch {
      // Silently handle
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [families]);

  useEffect(() => {
    mountedRef.current = true;
    fetchFamilyData();
    return () => { mountedRef.current = false; };
  }, [fetchFamilyData]);

  return {
    completions,
    setCompletions,
    stats,
    setStats,
    isLoading,
    refetch: fetchFamilyData,
  };
}
