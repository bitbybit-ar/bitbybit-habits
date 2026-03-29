"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BoltIcon, FlameIcon, ListIcon, UsersIcon, WalletIcon } from "@/components/icons";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { WalletConnect } from "@/components/dashboard/wallet-connect";
import { Onboarding } from "@/components/dashboard/onboarding";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { DashboardTab } from "@/components/dashboard/dashboard-layout";
import { useToast } from "@/components/ui/toast";
import { Container } from "@/components/ui/container";
import { BlockLoader } from "@/components/ui/block-loader";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { KidHabitsTab } from "@/components/dashboard/kid/KidHabitsTab";
import { KidFamilyTab } from "@/components/dashboard/kid/KidFamilyTab";
import { KidEarningsTab } from "@/components/dashboard/kid/KidEarningsTab";
import { useSession } from "@/lib/hooks/useSession";
import { useHabits } from "@/lib/hooks/useHabits";
import { useCompletions } from "@/lib/hooks/useCompletions";
import { useFamilies } from "@/lib/hooks/useFamilies";
import { useStats } from "@/lib/hooks/useStats";
import { usePayments } from "@/lib/hooks/usePayments";
import styles from "./kid.module.scss";

type TabType = "habits" | "family" | "earnings" | "wallet";

export default function KidDashboard() {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("habits");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [satsAnimation, setSatsAnimation] = useState<{ amount: number; key: number } | null>(null);
  const [prevApprovedCount, setPrevApprovedCount] = useState<number | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = useSession();
  const habits = useHabits();
  const completions = useCompletions();
  const families = useFamilies();
  const stats = useStats();
  const kidPayments = usePayments({ role: "kid", skip: activeTab !== "earnings" });

  const isLoading = session.isLoading || habits.isLoading || completions.isLoading || families.isLoading || stats.isLoading;

  // Track approved completions for sats animation
  useEffect(() => {
    const approvedCount = completions.data.filter((c) => c.status === "approved").length;
    if (prevApprovedCount !== null && approvedCount > prevApprovedCount) {
      const lastApproved = completions.data
        .filter((c) => c.status === "approved")
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
      if (lastApproved) {
        const habit = habits.data.find((h) => h.id === lastApproved.habit_id);
        if (habit) {
          setSatsAnimation({ amount: habit.sat_reward, key: Date.now() });
          animationTimerRef.current = setTimeout(() => setSatsAnimation(null), 2000);
        }
      }
    }
    setPrevApprovedCount(approvedCount);
  }, [completions.data, habits.data, prevApprovedCount]);

  // Cleanup animation timer on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && habits.data.length === 0) {
      const dismissed = localStorage.getItem("bitbybit_onboarding_done");
      if (!dismissed) setShowOnboarding(true);
    }
  }, [isLoading, habits.data.length]);

  useEffect(() => {
    if (activeTab === "earnings") kidPayments.refetch();
  }, [activeTab]); // Only refetch when tab changes

  const handleDismissOnboarding = useCallback(() => {
    localStorage.setItem("bitbybit_onboarding_done", "1");
    setShowOnboarding(false);
  }, []);

  const handleLeaveFamily = useCallback(async (familyId: string) => {
    const ok = await families.leaveFamily(familyId);
    if (ok) showToast(t("family.leaveSuccess"), "info");
  }, [families, showToast, t]);

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
          completions.setData((prev) => [...prev, data.data]);
          stats.setData((prev) => ({ ...prev, pendingCount: prev.pendingCount + 1 }));
          showToast(t("dashboard.completed") + " \u26A1", "success");
        }
      }
    } catch {
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t, completions, stats]);

  if (isLoading) return <Container center><BlockLoader /></Container>;

  if (session.data?.role === "sponsor") {
    router.replace("/sponsor");
    return <Container center><BlockLoader /></Container>;
  }

  const displayName = session.data?.display_name ?? session.data?.username ?? "Kid";
  const level = Math.floor(stats.data.totalSats / 100) + 1;
  const todaySats = stats.data.todaySats;

  const tabs: DashboardTab[] = [
    { key: "habits", icon: <ListIcon size={20} />, label: t("dashboard.myHabits") },
    { key: "family", icon: <UsersIcon size={20} />, label: t("family.myFamily") },
    { key: "earnings", icon: <BoltIcon size={20} />, label: t("kidDashboard.earnings") },
    { key: "wallet", icon: <WalletIcon size={20} />, label: t("wallet.connectWallet") },
  ];

  const headerExtra = (
    <div className={styles.levelBadge}><BoltIcon size={14} /> {t("kidDashboard.level")} {level}</div>
  );

  const statsBar = (
    <>
      <div className={styles.heroSats}>
        <div className={styles.heroSatsIcon}><BoltIcon size={32} /></div>
        <div className={styles.heroSatsInfo}>
          <span className={styles.heroSatsValue}>{todaySats}</span>
          <span className={styles.heroSatsLabel}>{t("kidDashboard.satsToday")}</span>
        </div>
        {stats.data.bestStreak > 0 && (
          <div className={styles.heroStreak}><FlameIcon size={20} /><span>{stats.data.bestStreak}</span></div>
        )}
      </div>
      <StatsBar totalSats={stats.data.totalSats} bestStreak={stats.data.bestStreak} pendingCount={stats.data.pendingCount} />
    </>
  );

  return (
    <div className={styles.animationWrapper}>
      {satsAnimation && (
        <div key={satsAnimation.key} className={styles.satsAnimation}>+{satsAnimation.amount} sats &#x26A1;</div>
      )}
      <DashboardLayout
        displayName={`${t("dashboard.welcome")}, ${displayName}`}
        headerExtra={headerExtra}
        statsBar={statsBar}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabType)}
        breadcrumbs={[
          { label: t("dashboard.title"), href: "/kid" },
          { label: tabs.find((tb) => tb.key === activeTab)?.label ?? "" },
        ]}
      >
        {showOnboarding ? (
          <Onboarding displayName={displayName} onDismiss={handleDismissOnboarding} />
        ) : (
          <>
            {activeTab === "habits" && (
              <KidHabitsTab habits={habits.data} completions={completions.data} onComplete={handleComplete} />
            )}
            {activeTab === "family" && (
              <KidFamilyTab
                families={families.data}
                sessionUserId={session.data?.user_id ?? ""}
                onJoinSuccess={families.refetch}
                onLeave={handleLeaveFamily}
                showToast={showToast}
              />
            )}
            {activeTab === "earnings" && (
              <KidEarningsTab payments={kidPayments.data} isLoading={kidPayments.isLoading} />
            )}
            {activeTab === "wallet" && (
              <DashboardSection title={t("wallet.connectWallet")}>
                <WalletConnect />
              </DashboardSection>
            )}
          </>
        )}
      </DashboardLayout>
    </div>
  );
}
