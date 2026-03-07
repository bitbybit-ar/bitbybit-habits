"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { LogOutIcon, BoltIcon, ClockIcon, PencilIcon } from "@/components/icons";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { PendingList } from "@/components/dashboard/pending-list";
import type { PendingCompletion } from "@/components/dashboard/pending-list";
import { CreateHabitForm } from "@/components/dashboard/create-habit-form";
import type { CreateHabitData } from "@/components/dashboard/create-habit-form";
import { FamilyCard } from "@/components/dashboard/family-card";
import { HabitCard } from "@/components/dashboard/habit-card";
import { Onboarding } from "@/components/dashboard/onboarding";
import { cn } from "@/lib/utils";
import type { Habit, Completion, AuthSession } from "@/lib/types";
import styles from "./sponsor.module.scss";
import statsStyles from "@/components/dashboard/stats-bar/stats-bar.module.scss";

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

type TabType = "pending" | "habits" | "create" | "family";

export default function SponsorDashboard() {
  const t = useTranslations();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [pendingCompletions, setPendingCompletions] = useState<PendingCompletion[]>([]);
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, habitsRes, familiesRes, pendingRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/habits"),
        fetch("/api/families"),
        fetch("/api/completions/pending"),
      ]);

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.success) setSession(sessionData.data);
      }

      if (habitsRes.ok) {
        const habitsData = await habitsRes.json();
        if (habitsData.success) setHabits(habitsData.data ?? []);
      }

      if (familiesRes.ok) {
        const familiesData = await familiesRes.json();
        if (familiesData.success) setFamilies(familiesData.data ?? []);
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        if (pendingData.success) {
          setPendingCompletions(pendingData.data ?? []);
          // Calculate total paid from the response or default
          setTotalPaid(pendingData.data?.totalPaid ?? 0);
        }
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!loading && habits.length === 0 && families.length === 0) {
      const dismissed = localStorage.getItem("bitbybit_onboarding_done");
      if (!dismissed) setShowOnboarding(true);
    }
  }, [loading, habits.length, families.length]);

  const handleDismissOnboarding = useCallback(() => {
    localStorage.setItem("bitbybit_onboarding_done", "1");
    setShowOnboarding(false);
  }, []);

  const handleApprove = useCallback(async (completionId: string) => {
    try {
      const res = await fetch("/api/completions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_id: completionId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPendingCompletions((prev) => prev.filter((c) => c.id !== completionId));
        }
      }
    } catch {
      // Silently handle errors
    }
  }, []);

  const handleReject = useCallback(async (completionId: string) => {
    try {
      const res = await fetch("/api/completions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_id: completionId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPendingCompletions((prev) => prev.filter((c) => c.id !== completionId));
        }
      }
    } catch {
      // Silently handle errors
    }
  }, []);

  const handleCreateHabit = useCallback(async (data: CreateHabitData) => {
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setHabits((prev) => [result.data, ...prev]);
          setActiveTab("habits");
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

  // No-op for HabitCard onComplete (sponsors don't complete habits)
  const noopComplete = useCallback(() => {}, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>{t("common.loading")}</p>
      </div>
    );
  }

  const displayName = session?.display_name ?? session?.username ?? "Sponsor";

  // Gather all kid members across families for the create form
  const allKids = families.flatMap((f) =>
    f.members
      .filter((m) => m.role === "kid")
      .map((m) => ({ user_id: m.user_id, display_name: m.display_name || m.username }))
  );

  // Deduplicate kids by user_id
  const uniqueKids = allKids.filter(
    (kid, index, self) => self.findIndex((k) => k.user_id === kid.user_id) === index
  );

  const familyOptions = families.map((f) => ({ id: f.id, name: f.name }));

  const tabs: { key: TabType; label: string; badge?: number }[] = [
    { key: "pending", label: t("sponsorDashboard.pendingApprovals"), badge: pendingCompletions.length },
    { key: "habits", label: t("dashboard.myHabits") },
    { key: "create", label: t("habits.createHabit") },
    { key: "family", label: t("family.myFamily") },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {t("dashboard.welcome")}, {displayName}
        </h1>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <LogOutIcon size={18} />
          <span>{t("auth.logout")}</span>
        </button>
      </div>

      {showOnboarding ? (
        <Onboarding
          displayName={displayName}
          onDismiss={handleDismissOnboarding}
        />
      ) : (
        <>
      <StatsBar
        items={[
          {
            icon: <BoltIcon size={22} />,
            value: totalPaid.toLocaleString(),
            label: `${t("sats.sats")} ${t("sats.paid")}`,
            iconClass: statsStyles.iconSats,
          },
          {
            icon: <PencilIcon size={22} />,
            value: habits.length,
            label: t("sponsorDashboard.habitsCreated"),
            iconClass: statsStyles.iconHabits,
          },
          {
            icon: <ClockIcon size={22} />,
            value: pendingCompletions.length,
            label: t("sponsorDashboard.pendingApprovals"),
            iconClass: statsStyles.iconPending,
          },
        ]}
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn(styles.tab, activeTab === tab.key && styles.tabActive)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className={styles.badge}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "pending" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("sponsorDashboard.pendingApprovals")}</h2>
          <PendingList
            completions={pendingCompletions}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      )}

      {activeTab === "habits" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("dashboard.myHabits")}</h2>
          <div className={styles.habitGrid}>
            {habits.length === 0 ? (
              <p className={styles.loadingText}>{t("sponsorDashboard.noHabits")}</p>
            ) : (
              habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  completions={completions}
                  onComplete={noopComplete}
                  hideAction
                />
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("habits.createHabit")}</h2>
          <CreateHabitForm
            families={familyOptions}
            kids={uniqueKids}
            onSubmit={handleCreateHabit}
          />
        </div>
      )}

      {activeTab === "family" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("family.myFamily")}</h2>
          {families.length === 0 ? (
            <p className={styles.loadingText}>{t("sponsorDashboard.noFamily")}</p>
          ) : (
            families.map((family) => (
              <FamilyCard
                key={family.id}
                name={family.name}
                inviteCode={family.invite_code}
                members={family.members}
              />
            ))
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
