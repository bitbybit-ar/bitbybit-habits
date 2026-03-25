"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BoltIcon, FlameIcon, ListIcon, UsersIcon, WalletIcon } from "@/components/icons";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { HabitList } from "@/components/dashboard/habit-list";
import { FamilyCard } from "@/components/dashboard/family-card";
import { WalletConnect } from "@/components/dashboard/wallet-connect";
import { Onboarding } from "@/components/dashboard/onboarding";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { DashboardTab } from "@/components/dashboard/dashboard-layout";
import { useToast } from "@/components/ui/toast";
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

type TabType = "habits" | "family" | "wallet";

export default function KidDashboard() {
  const t = useTranslations();
  const { showToast } = useToast();
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
  const [satsAnimation, setSatsAnimation] = useState<{ amount: number; key: number } | null>(null);
  const [prevApprovedCount, setPrevApprovedCount] = useState<number | null>(null);

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

  // Track approved completions for sats animation
  useEffect(() => {
    const approvedCount = completions.filter((c) => c.status === "approved").length;
    if (prevApprovedCount !== null && approvedCount > prevApprovedCount) {
      const lastApproved = completions
        .filter((c) => c.status === "approved")
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
      if (lastApproved) {
        const habit = habits.find((h) => h.id === lastApproved.habit_id);
        if (habit) {
          setSatsAnimation({ amount: habit.sat_reward, key: Date.now() });
          setTimeout(() => setSatsAnimation(null), 2000);
        }
      }
    }
    setPrevApprovedCount(approvedCount);
  }, [completions, habits, prevApprovedCount]);

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
        showToast(t("family.joinSuccess"), "success");
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
  }, [joinCode, showToast, t]);

  const handleLeaveFamily = useCallback(async (familyId: string) => {
    try {
      const res = await fetch("/api/families/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family_id: familyId }),
      });
      if (res.ok) {
        setFamilies((prev) => prev.filter((f) => f.id !== familyId));
        showToast(t("family.leaveSuccess"), "info");
      }
    } catch {
      // Silently handle
    }
  }, [showToast, t]);

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
          showToast(t("dashboard.completed") + " ⚡", "success");
        }
      }
    } catch {
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t]);



  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>{t("common.loading")}</p>
      </div>
    );
  }

  const displayName = session?.display_name ?? session?.username ?? "Kid";
  const level = Math.floor(stats.totalSats / 100) + 1;

  // Calculate today's sats
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCompletions = completions.filter(
    (c) => c.date === todayStr && c.status === "approved"
  );
  const todaySats = todayCompletions.reduce((sum, c) => {
    const habit = habits.find((h) => h.id === c.habit_id);
    return sum + (habit?.sat_reward ?? 0);
  }, 0);

  const tabs: DashboardTab[] = [
    { key: "habits", icon: <ListIcon size={20} />, label: t("dashboard.myHabits") },
    { key: "family", icon: <UsersIcon size={20} />, label: t("family.myFamily") },
    { key: "wallet", icon: <WalletIcon size={20} />, label: t("wallet.connectWallet") },
  ];

  const headerExtra = (
    <div className={styles.levelBadge}>
      <BoltIcon size={14} />
      {t("kidDashboard.level")} {level}
    </div>
  );

  const statsBar = (
    <>
      {/* Hero sats today */}
      <div className={styles.heroSats}>
        <div className={styles.heroSatsIcon}>
          <BoltIcon size={32} />
        </div>
        <div className={styles.heroSatsInfo}>
          <span className={styles.heroSatsValue}>{todaySats}</span>
          <span className={styles.heroSatsLabel}>{t("kidDashboard.satsToday")}</span>
        </div>
        {stats.bestStreak > 0 && (
          <div className={styles.heroStreak}>
            <FlameIcon size={20} />
            <span>{stats.bestStreak}</span>
          </div>
        )}
      </div>
      <StatsBar
        totalSats={stats.totalSats}
        bestStreak={stats.bestStreak}
        pendingCount={stats.pendingCount}
      />
    </>
  );

  const layoutContent = (
    <>
      {activeTab === "habits" && (
        <>
          <h2 className={styles.sectionTitle}>{t("dashboard.myHabits")}</h2>
          {habits.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>⚡</span>
              <h3 className={styles.emptyTitle}>{t("emptyState.noHabitsTitle")}</h3>
              <p className={styles.emptySubtext}>{t("emptyState.kidNoHabitsDesc")}</p>
            </div>
          ) : (
            <HabitList
              habits={habits}
              completions={completions}
              onComplete={handleComplete}
            />
          )}
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

      {activeTab === "wallet" && (
        <>
          <h2 className={styles.sectionTitle}>{t("wallet.connectWallet")}</h2>
          <WalletConnect />
        </>
      )}
    </>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Sats animation overlay */}
      {satsAnimation && (
        <div key={satsAnimation.key} className={styles.satsAnimation}>
          +{satsAnimation.amount} sats ⚡
        </div>
      )}

      {showOnboarding ? (
        <DashboardLayout
          displayName={`${t("dashboard.welcome")}, ${displayName}`}
          headerExtra={headerExtra}
          statsBar={statsBar}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as TabType)}

        >
          <Onboarding
            displayName={displayName}
            onDismiss={handleDismissOnboarding}
          />
        </DashboardLayout>
      ) : (
        <DashboardLayout
          displayName={`${t("dashboard.welcome")}, ${displayName}`}
          headerExtra={headerExtra}
          statsBar={statsBar}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as TabType)}

        >
          {layoutContent}
        </DashboardLayout>
      )}
    </div>
  );
}
