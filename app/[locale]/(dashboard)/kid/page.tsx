"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { BoltIcon, FlameIcon, ListIcon, UsersIcon, WalletIcon } from "@/components/icons";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { HabitList } from "@/components/dashboard/habit-list";
import { FamilyCard } from "@/components/dashboard/family-card";
import { WalletConnect } from "@/components/dashboard/wallet-connect";
import { Onboarding } from "@/components/dashboard/onboarding";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { DashboardTab } from "@/components/dashboard/dashboard-layout";
import { useToast } from "@/components/ui/toast";
import { Container } from "@/components/ui/container";
import { BlockLoader } from "@/components/ui/block-loader";
import { Spinner } from "@/components/ui/spinner";
import { FormInput, FormButton } from "@/components/ui/form";
import { useSession } from "@/lib/hooks/useSession";
import { useHabits } from "@/lib/hooks/useHabits";
import { useCompletions } from "@/lib/hooks/useCompletions";
import { useFamilies } from "@/lib/hooks/useFamilies";
import { useStats } from "@/lib/hooks/useStats";
import { usePayments } from "@/lib/hooks/usePayments";
import { formatDisplayDate } from "@/lib/date";
import { resolveApiError } from "@/lib/error-messages";
import styles from "./kid.module.scss";

type TabType = "habits" | "family" | "earnings" | "wallet";

export default function KidDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("habits");
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [satsAnimation, setSatsAnimation] = useState<{ amount: number; key: number } | null>(null);
  const [prevApprovedCount, setPrevApprovedCount] = useState<number | null>(null);

  const session = useSession();
  const habits = useHabits();
  const completions = useCompletions();
  const families = useFamilies();
  const stats = useStats();
  const kidPayments = usePayments({ role: "kid", skip: activeTab !== "earnings" });

  const isLoading = session.isLoading || habits.isLoading || completions.isLoading || families.isLoading || stats.isLoading;

  // Role guard: redirect non-kids away
  useEffect(() => {
    if (!session.isLoading && session.data && session.data.role !== "kid") {
      router.replace(session.data.role === "sponsor" ? "/sponsor" : "/dashboard");
    }
  }, [session.isLoading, session.data, router]);

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
          setTimeout(() => setSatsAnimation(null), 2000);
        }
      }
    }
    setPrevApprovedCount(approvedCount);
  }, [completions.data, habits.data, prevApprovedCount]);

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
        families.refetch();
      } else {
        setJoinError(resolveApiError(data.error, t));
      }
    } catch {
      setJoinError("Error");
    } finally {
      setJoinLoading(false);
    }
  }, [joinCode, showToast, t, families]);

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
          showToast(t("dashboard.completed") + " ⚡", "success");
        }
      }
    } catch {
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t, completions, stats]);

  if (isLoading || (session.data && session.data.role !== "kid")) return <Container center><BlockLoader /></Container>;

  const displayName = session.data?.display_name ?? session.data?.username ?? "Kid";
  const level = Math.floor(stats.data.totalSats / 100) + 1;

  const todayStr = new Date().toISOString().split("T")[0];
  const todaySats = completions.data
    .filter((c) => c.date === todayStr && c.status === "approved")
    .reduce((sum, c) => {
      const habit = habits.data.find((h) => h.id === c.habit_id);
      return sum + (habit?.sat_reward ?? 0);
    }, 0);

  const tabs: DashboardTab[] = [
    { key: "habits", icon: <ListIcon size={20} />, label: t("dashboard.myHabits") },
    { key: "family", icon: <UsersIcon size={20} />, label: t("family.myFamily") },
    { key: "earnings", icon: <BoltIcon size={20} />, label: t("kidDashboard.earnings") },
    { key: "wallet", icon: <WalletIcon size={20} />, label: t("wallet.title") },
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

  const layoutContent = (
    <>
      {activeTab === "habits" && (
        <>
          <h2 className={styles.sectionTitle}>{t("dashboard.myHabits")}</h2>
          {habits.data.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>⚡</span>
              <h3 className={styles.emptyTitle}>{t("emptyState.noHabitsTitle")}</h3>
              <p className={styles.emptySubtext}>{t("emptyState.kidNoHabitsDesc")}</p>
            </div>
          ) : (
            <HabitList habits={habits.data} completions={completions.data} onComplete={handleComplete} />
          )}
        </>
      )}
      {activeTab === "family" && (
        <>
          <h2 className={styles.sectionTitle}>{t("family.myFamily")}</h2>
          {families.data.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><UsersIcon size={48} /></span>
              <h3 className={styles.emptyTitle}>{t("emptyState.noFamily")}</h3>
              <p className={styles.emptySubtext}>{t("emptyState.noFamilyKidDesc")}</p>
            </div>
          ) : (
            families.data.map((family) => (
              <FamilyCard
                key={family.id}
                familyId={family.id}
                name={family.name}
                inviteCode={family.invite_code}
                members={family.members}
                createdBy={family.created_by}
                currentUserId={session.data?.user_id ?? ""}
                currentUserRole={family.members.find((m) => m.user_id === session.data?.user_id)?.role}
                onLeave={handleLeaveFamily}
              />
            ))
          )}
          {/* MVP: Single-family mode — only show join form when kid has no family */}
          {families.data.length === 0 && (
            <div className={styles.joinSection}>
              <h3 className={styles.joinTitle}>{t("family.joinFamily")}</h3>
              <form onSubmit={handleJoinFamily} className={styles.joinForm}>
                <FormInput
                  id="join-code"
                  placeholder={t("family.enterInviteCode")}
                  maxLength={6}
                  value={joinCode}
                  onChange={(v) => setJoinCode(v.toUpperCase())}
                  error={joinError || undefined}
                />
                <FormButton type="submit" loading={joinLoading} loadingText={t("common.loading")} disabled={!joinCode.trim()}>
                  {t("family.join")}
                </FormButton>
              </form>
            </div>
          )}
        </>
      )}
      {activeTab === "earnings" && (
        <>
          <h2 className={styles.sectionTitle}>{t("kidDashboard.earnings")}</h2>
          {kidPayments.isLoading ? (
            <Spinner size="sm" />
          ) : kidPayments.data.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><BoltIcon size={48} /></span>
              <h3 className={styles.emptyTitle}>{t("emptyState.noPayments")}</h3>
              <p className={styles.emptySubtext}>{t("kidDashboard.earningsDesc")}</p>
            </div>
          ) : (
            <div className={styles.earningsList}>
              {kidPayments.data.map((p) => (
                <div key={p.id} className={styles.earningsItem}>
                  <div className={styles.earningsInfo}>
                    <span className={styles.earningsHabit}>{p.habit_name}</span>
                    <span className={styles.earningsDate}>{formatDisplayDate(p.created_at, locale)}</span>
                  </div>
                  <div className={styles.earningsAmount}>
                    <BoltIcon size={14} />
                    <span>+{p.amount_sats}</span>
                    <span
                      className={styles.earningsStatus}
                      data-status={p.status}
                    >
                      {t(`payments.status.${p.status}`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {activeTab === "wallet" && (
        <>
          <h2 className={styles.sectionTitle}>{t("wallet.title")}</h2>
          <WalletConnect />
        </>
      )}
    </>
  );

  return (
    <div style={{ position: "relative" }}>
      {satsAnimation && (
        <div key={satsAnimation.key} className={styles.satsAnimation}>+{satsAnimation.amount} sats ⚡</div>
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
          layoutContent
        )}
      </DashboardLayout>
    </div>
  );
}
