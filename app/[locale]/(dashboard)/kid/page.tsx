"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { LogOutIcon, SettingsIcon } from "@/components/icons";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { HabitList } from "@/components/dashboard/habit-list";
import { FamilyCard } from "@/components/dashboard/family-card";
import { Onboarding } from "@/components/dashboard/onboarding";
import type { Habit, Completion, AuthSession } from "@/lib/types";
import styles from "./kid.module.scss";

interface StatsData {
  totalSats: number;
  bestStreak: number;
  pendingCount: number;
}

interface FamilyWithMembers {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  members: {
    user_id: string;
    display_name: string;
    username: string;
    role: string;
    avatar_url: string | null;
  }[];
}

type TabType = "habits" | "family";

export default function KidDashboard() {
  const t = useTranslations();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("habits");
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
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
        const [sessionRes, habitsRes, completionsRes, statsRes, familiesRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/habits"),
          fetch("/api/completions"),
          fetch("/api/stats"),
          fetch("/api/families"),
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

        if (familiesRes.ok) {
          const familiesData = await familiesRes.json();
          if (familiesData.success) setFamilies(familiesData.data ?? []);
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

  const handleJoinFamily = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    setJoinLoading(true);
    try {
      const res = await fetch("/api/families/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: joinCode, role: "kid" }),
      });
      const data = await res.json();
      if (data.success) {
        setJoinCode("");
        // Refresh families
        const famRes = await fetch("/api/families");
        if (famRes.ok) {
          const famData = await famRes.json();
          if (famData.success) setFamilies(famData.data ?? []);
        }
      } else {
        setJoinError(data.error);
      }
    } catch {
      setJoinError("Error");
    } finally {
      setJoinLoading(false);
    }
  }, [joinCode]);

  const handleLeaveFamily = useCallback(async (familyId: string) => {
    try {
      const res = await fetch("/api/families/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family_id: familyId }),
      });
      if (res.ok) {
        setFamilies((prev) => prev.filter((f) => f.id !== familyId));
      }
    } catch {
      // Silently handle
    }
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

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "habits" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("habits")}
            >
              {t("dashboard.myHabits")}
            </button>
            <button
              className={`${styles.tab} ${activeTab === "family" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("family")}
            >
              {t("family.myFamily")}
            </button>
          </div>

          {activeTab === "habits" && (
            <>
              <h2 className={styles.sectionTitle}>{t("dashboard.myHabits")}</h2>
              <HabitList
                habits={habits}
                completions={completions}
                onComplete={handleComplete}
              />
            </>
          )}

          {activeTab === "family" && (
            <>
              <h2 className={styles.sectionTitle}>{t("family.myFamily")}</h2>
              {families.length === 0 ? (
                <p className={styles.loadingText}>{t("family.noFamilies")}</p>
              ) : (
                families.map((family) => (
                  <FamilyCard
                    key={family.id}
                    familyId={family.id}
                    name={family.name}
                    inviteCode={family.invite_code}
                    members={family.members}
                    createdBy={family.created_by}
                    currentUserId={session?.user_id ?? ""}
                    currentUserRole={family.members.find((m) => m.user_id === session?.user_id)?.role}
                    onLeave={handleLeaveFamily}
                  />
                ))
              )}

              <div className={styles.joinSection}>
                <h3 className={styles.joinTitle}>{t("family.joinFamily")}</h3>
                <form onSubmit={handleJoinFamily} className={styles.joinForm}>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder={t("family.enterInviteCode")}
                    maxLength={6}
                    className={styles.joinInput}
                  />
                  <button
                    type="submit"
                    className={styles.joinButton}
                    disabled={joinLoading || !joinCode.trim()}
                  >
                    {joinLoading ? t("common.loading") : t("family.join")}
                  </button>
                </form>
                {joinError && <p className={styles.joinError}>{joinError}</p>}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
