"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { LogOutIcon, SettingsIcon } from "@/components/icons";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { HabitList } from "@/components/dashboard/habit-list";
import { Onboarding } from "@/components/dashboard/onboarding";
import type { Habit, Completion, AuthSession } from "@/lib/types";
import styles from "./kid.module.scss";

interface StatsData {
  totalSats: number;
  bestStreak: number;
  pendingCount: number;
}

export default function KidDashboard() {
  const t = useTranslations();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalSats: 0,
    bestStreak: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessionRes, habitsRes, completionsRes, statsRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/habits"),
          fetch("/api/completions"),
          fetch("/api/stats"),
        ]);

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.success) setSession(sessionData.data);
        }

        if (habitsRes.ok) {
          const habitsData = await habitsRes.json();
          if (habitsData.success) setHabits(habitsData.data ?? []);
        }

        if (completionsRes.ok) {
          const completionsData = await completionsRes.json();
          if (completionsData.success) setCompletions(completionsData.data ?? []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success) {
            setStats({
              totalSats: statsData.data?.totalSats ?? 0,
              bestStreak: statsData.data?.bestStreak ?? 0,
              pendingCount: statsData.data?.pendingCount ?? 0,
            });
          }
        }
      } catch {
        // Silently handle fetch errors - data stays at defaults
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && habits.length === 0) {
      const dismissed = localStorage.getItem("bitbybit_onboarding_done");
      if (!dismissed) setShowOnboarding(true);
    }
  }, [loading, habits.length]);

  const handleDismissOnboarding = useCallback(() => {
    localStorage.setItem("bitbybit_onboarding_done", "1");
    setShowOnboarding(false);
  }, []);

  const handleComplete = useCallback(async (habitId: string) => {
    try {
      const res = await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habit_id: habitId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCompletions((prev) => [...prev, data.data]);
          setStats((prev) => ({
            ...prev,
            pendingCount: prev.pendingCount + 1,
          }));
        }
      }
    } catch {
      // Silently handle errors
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      // Silently handle errors
    }
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>{t("common.loading")}</p>
      </div>
    );
  }

  const displayName = session?.display_name ?? session?.username ?? "Kid";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {t("dashboard.welcome")}, {displayName}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <NotificationBell />
          <a href="/settings" className={styles.logoutButton} style={{ textDecoration: "none" }}>
            <SettingsIcon size={18} />
          </a>
          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOutIcon size={18} />
            <span>{t("auth.logout")}</span>
          </button>
        </div>
      </div>

      {showOnboarding ? (
        <Onboarding
          displayName={displayName}
          onDismiss={handleDismissOnboarding}
        />
      ) : (
        <>
          <StatsBar
            totalSats={stats.totalSats}
            bestStreak={stats.bestStreak}
            pendingCount={stats.pendingCount}
          />

          <h2 className={styles.sectionTitle}>{t("dashboard.myHabits")}</h2>

          <HabitList
            habits={habits}
            completions={completions}
            onComplete={handleComplete}
          />
        </>
      )}
    </div>
  );
}
