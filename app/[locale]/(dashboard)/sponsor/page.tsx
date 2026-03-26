"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { BoltIcon, ClockIcon, ListIcon, PlusIcon, UsersIcon, WalletIcon, UserIcon } from "@/components/icons";
import { SummaryBar } from "@/components/dashboard/summary-bar";
import { WeeklyTracker } from "@/components/dashboard/weekly-tracker";
import { CreateHabitForm } from "@/components/dashboard/create-habit-form";
import type { CreateHabitData } from "@/components/dashboard/create-habit-form";
import { FamilyCard } from "@/components/dashboard/family-card";
import { WalletConnect } from "@/components/dashboard/wallet-connect";
import { Onboarding } from "@/components/dashboard/onboarding";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { DashboardTab } from "@/components/dashboard/dashboard-layout";
import { InvoiceModal } from "@/components/ui/invoice-modal";
import { useToast } from "@/components/ui/toast";
import { useWebLN } from "@/lib/hooks/useWebLN";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import type { Habit, AuthSession, PaymentWithDetails } from "@/lib/types";
import styles from "./sponsor.module.scss";

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

interface FamilyCompletion {
  id: string;
  habit_id: string;
  habit_name: string;
  kid_user_id: string;
  kid_display_name: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  sat_reward: number;
}

interface FamilyStats {
  completedToday: number;
  totalToday: number;
  pendingApprovals: number;
  totalSatsPaid: number;
}

type TabType = "byHabit" | "byKid" | "create" | "family" | "payments" | "wallet";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9F43",
  paid: "#4CAF7D",
  failed: "#EE5A5A",
};

export default function SponsorDashboard() {
  const t = useTranslations();
  const { showToast } = useToast();
  const { hasExtension: hasWebLN } = useWebLN();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("byHabit");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [familyCompletions, setFamilyCompletions] = useState<FamilyCompletion[]>([]);
  const [familyStats, setFamilyStats] = useState<FamilyStats>({
    completedToday: 0,
    totalToday: 0,
    pendingApprovals: 0,
    totalSatsPaid: 0,
  });
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState<{
    paymentRequest: string;
    paymentId: string;
    amountSats: number;
    habitName: string;
  } | null>(null);

  // Fetch family-specific data (completions + stats) for all sponsor families
  const fetchFamilyData = useCallback(async (familyList: FamilyWithMembers[]) => {
    if (familyList.length === 0) return;

    try {
      // Fetch completions and stats for all families in parallel
      const requests = familyList.flatMap((f) => [
        fetch(`/api/families/${f.id}/completions?days=7`),
        fetch(`/api/families/${f.id}/stats`),
      ]);

      const responses = await Promise.all(requests);
      let allCompletions: FamilyCompletion[] = [];
      let aggregatedStats: FamilyStats = {
        completedToday: 0,
        totalToday: 0,
        pendingApprovals: 0,
        totalSatsPaid: 0,
      };

      for (let i = 0; i < familyList.length; i++) {
        const compRes = responses[i * 2];
        const statsRes = responses[i * 2 + 1];

        if (compRes.ok) {
          const compData = await compRes.json();
          if (compData.success) allCompletions = [...allCompletions, ...(compData.data ?? [])];
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success && statsData.data) {
            aggregatedStats.completedToday += statsData.data.completedToday ?? 0;
            aggregatedStats.totalToday += statsData.data.totalToday ?? 0;
            aggregatedStats.pendingApprovals += statsData.data.pendingApprovals ?? 0;
            aggregatedStats.totalSatsPaid += statsData.data.totalSatsPaid ?? 0;
          }
        }
      }

      setFamilyCompletions(allCompletions);
      setFamilyStats(aggregatedStats);
    } catch {
      // Silently handle
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, habitsRes, familiesRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/habits"),
        fetch("/api/families"),
      ]);

      let sessionData: AuthSession | null = null;
      let familyList: FamilyWithMembers[] = [];

      if (sessionRes.ok) {
        const data = await sessionRes.json();
        if (data.success) {
          sessionData = data.data;
          setSession(data.data);
        }
      }

      if (habitsRes.ok) {
        const data = await habitsRes.json();
        if (data.success) setHabits(data.data ?? []);
      }

      if (familiesRes.ok) {
        const data = await familiesRes.json();
        if (data.success) {
          familyList = data.data ?? [];
          setFamilies(familyList);
        }
      }

      // Now fetch family-specific data
      if (sessionData && familyList.length > 0) {
        await fetchFamilyData(familyList);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [fetchFamilyData]);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch("/api/payments?role=sponsor");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setPayments(data.data ?? []);
      }
    } catch {
      // Silently handle
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const handleRetryPayment = useCallback(async (paymentId: string) => {
    try {
      const res = await fetch("/api/payments/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPayments((prev) =>
            prev.map((p) => (p.id === paymentId ? { ...p, status: "pending" } : p))
          );
          showToast(t("payments.retrySuccess"), "info");
        }
      }
    } catch {
      showToast(t("payments.retryError"), "error");
    }
  }, [showToast, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "payments") fetchPayments();
  }, [activeTab, fetchPayments]);

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
    // Optimistic update
    setFamilyCompletions((prev) =>
      prev.map((c) => (c.id === completionId ? { ...c, status: "approved" as const } : c))
    );
    setFamilyStats((prev) => ({
      ...prev,
      pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
    }));

    const revertOptimistic = () => {
      setFamilyCompletions((prev) =>
        prev.map((c) => (c.id === completionId ? { ...c, status: "pending" as const } : c))
      );
      setFamilyStats((prev) => ({
        ...prev,
        pendingApprovals: prev.pendingApprovals + 1,
      }));
    };

    try {
      // Step 1: Approve the completion
      const res = await fetch("/api/completions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_id: completionId }),
      });

      if (!res.ok) {
        revertOptimistic();
        return;
      }

      const data = await res.json();
      if (!data.success) {
        revertOptimistic();
        return;
      }

      const approveResult = data.data;
      const paymentStatus = approveResult?.payment_status;
      const completionData = familyCompletions.find((c) => c.id === completionId);

      // Step 2: If no wallet at all, show info toast
      if (paymentStatus === "no_wallet") {
        showToast(t("sponsorDashboard.approveNoWallet"), "info");
        return;
      }

      // Step 3: If no reward, just approve
      if (paymentStatus === "none" || !completionData?.sat_reward) {
        showToast(t("sponsorDashboard.approveSuccess"), "success");
        return;
      }

      // Step 4: Try auto-pay via sponsor's NWC wallet
      // First, try to generate invoice from kid's wallet
      const invoiceRes = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completion_id: completionId,
          amount_sats: completionData.sat_reward,
        }),
      });

      if (invoiceRes.ok) {
        const invoiceData = await invoiceRes.json();
        if (invoiceData.success && invoiceData.data) {
          const { paymentRequest, payment_id: paymentId } = invoiceData.data;

          // Priority 1: Try WebLN extension (Alby, etc.)
          if (hasWebLN) {
            try {
              const webln = (window as unknown as { webln?: { enable: () => Promise<void>; sendPayment: (invoice: string) => Promise<{ preimage: string }> } }).webln;
              if (webln) {
                await webln.enable();
                await webln.sendPayment(paymentRequest);
                showToast(
                  t("payments.autoPaidSuccess", { amount: completionData.sat_reward }),
                  "success"
                );
                return;
              }
            } catch {
              // WebLN failed, fall through to NWC
            }
          }

          // Priority 2: Try auto-pay with sponsor's NWC wallet
          try {
            const payRes = await fetch(`/api/payments/${paymentId}/pay`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });

            if (payRes.ok) {
              const payData = await payRes.json();
              if (payData.success && payData.data?.paid) {
                showToast(
                  t("payments.autoPaidSuccess", { amount: completionData.sat_reward }),
                  "success"
                );
                return;
              }
            }
          } catch {
            // Auto-pay failed, fall through to invoice modal
          }

          // Priority 3: Show invoice modal for manual scan
          setInvoiceModal({
            paymentRequest,
            paymentId,
            amountSats: completionData.sat_reward,
            habitName: completionData.habit_name,
          });
          showToast(t("payments.scanInvoice", { amount: completionData.sat_reward }), "info");
          return;
        }
      }

      // Kid has no wallet (422) → approved without payment
      if (invoiceRes.status === 422) {
        showToast(t("payments.approvedNoPay"), "info");
        return;
      }

      // Other error
      showToast(t("payments.paymentError"), "error");
    } catch {
      revertOptimistic();
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t, familyCompletions]);

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
          const newHabits = Array.isArray(result.data) ? result.data : [result.data];
          setHabits((prev) => [...newHabits, ...prev]);
          setActiveTab("byHabit");
          showToast(t("sponsorDashboard.createSuccess"), "success");
        }
      }
    } catch {
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t]);

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

  const handleDeleteFamily = useCallback(async (familyId: string) => {
    try {
      const res = await fetch(`/api/families/${familyId}`, { method: "DELETE" });
      if (res.ok) {
        setFamilies((prev) => prev.filter((f) => f.id !== familyId));
        showToast(t("family.deleteSuccess"), "info");
      }
    } catch {
      // Silently handle
    }
  }, [showToast, t]);

  const handleRoleChange = useCallback(async (familyId: string, userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/families/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family_id: familyId, user_id: userId, new_role: newRole }),
      });
      if (res.ok) {
        setFamilies((prev) =>
          prev.map((f) =>
            f.id === familyId
              ? { ...f, members: f.members.map((m) => m.user_id === userId ? { ...m, role: newRole } : m) }
              : f
          )
        );
        showToast(t("family.roleChanged"), "success");
      }
    } catch {
      // Silently handle
    }
  }, [showToast, t]);



  const handleRemoveMember = useCallback(async (familyId: string, userId: string) => {
    try {
      const res = await fetch(`/api/families/${familyId}/members/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setFamilies((prev) =>
          prev.map((f) =>
            f.id === familyId
              ? { ...f, members: f.members.filter((m) => m.user_id !== userId) }
              : f
          )
        );
        showToast(t("family.memberRemoved"), "info");
      }
    } catch {
      // Silently handle
    }
  }, [showToast, t]);

  // Group completions by habit
  const byHabitGroups = useMemo(() => {
    const groups: Record<string, { habitId: string; habitName: string; satReward: number; kids: Record<string, { userId: string; displayName: string }> }> = {};

    // Seed from habits list
    for (const habit of habits) {
      groups[habit.id] = {
        habitId: habit.id,
        habitName: habit.name,
        satReward: habit.sat_reward,
        kids: {},
      };
    }

    // Add kids from completions
    for (const c of familyCompletions) {
      if (!groups[c.habit_id]) {
        groups[c.habit_id] = {
          habitId: c.habit_id,
          habitName: c.habit_name,
          satReward: c.sat_reward,
          kids: {},
        };
      }
      groups[c.habit_id].kids[c.kid_user_id] = {
        userId: c.kid_user_id,
        displayName: c.kid_display_name,
      };
    }

    // Also add kids from habits assigned_to
    for (const habit of habits) {
      if (groups[habit.id]) {
        // Find kid info from families
        const kid = families.flatMap((f) => f.members).find((m) => m.user_id === habit.assigned_to);
        if (kid && kid.role === "kid") {
          groups[habit.id].kids[kid.user_id] = {
            userId: kid.user_id,
            displayName: kid.display_name || kid.username,
          };
        }
      }
    }

    return Object.values(groups);
  }, [habits, familyCompletions, families]);

  // Group completions by kid
  const byKidGroups = useMemo(() => {
    const groups: Record<string, { userId: string; displayName: string; avatarUrl: string | null; habits: Record<string, { habitId: string; habitName: string; satReward: number }> }> = {};

    // Seed from family members
    for (const family of families) {
      for (const member of family.members) {
        if (member.role === "kid" && !groups[member.user_id]) {
          groups[member.user_id] = {
            userId: member.user_id,
            displayName: member.display_name || member.username,
            avatarUrl: member.avatar_url,
            habits: {},
          };
        }
      }
    }

    // Add habits from completions
    for (const c of familyCompletions) {
      if (!groups[c.kid_user_id]) {
        groups[c.kid_user_id] = {
          userId: c.kid_user_id,
          displayName: c.kid_display_name,
          avatarUrl: null,
          habits: {},
        };
      }
      groups[c.kid_user_id].habits[c.habit_id] = {
        habitId: c.habit_id,
        habitName: c.habit_name,
        satReward: c.sat_reward,
      };
    }

    // Add habits from assigned_to
    for (const habit of habits) {
      if (groups[habit.assigned_to]) {
        groups[habit.assigned_to].habits[habit.id] = {
          habitId: habit.id,
          habitName: habit.name,
          satReward: habit.sat_reward,
        };
      }
    }

    return Object.values(groups);
  }, [families, familyCompletions, habits]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const displayName = session?.display_name ?? session?.username ?? "Sponsor";

  const allKids = families.flatMap((f) =>
    f.members
      .filter((m) => m.role === "kid")
      .map((m) => ({ user_id: m.user_id, display_name: m.display_name || m.username }))
  );
  const uniqueKids = allKids.filter(
    (kid, index, self) => self.findIndex((k) => k.user_id === kid.user_id) === index
  );
  const familyOptions = families.map((f) => ({ id: f.id, name: f.name }));

  const tabs: DashboardTab[] = [
    { key: "byHabit", icon: <ListIcon size={20} />, label: t("sponsorDashboard.byHabit") },
    { key: "byKid", icon: <UserIcon size={20} />, label: t("sponsorDashboard.byKid") },
    { key: "create", icon: <PlusIcon size={20} />, label: t("habits.createHabit") },
    { key: "family", icon: <UsersIcon size={20} />, label: t("family.myFamily") },
    { key: "payments", icon: <BoltIcon size={20} />, label: t("payments.title") },
    { key: "wallet", icon: <WalletIcon size={20} />, label: t("wallet.connectWallet") },
  ];

  const statsBar = (
    <SummaryBar
      completedToday={familyStats.completedToday}
      totalToday={familyStats.totalToday}
      pendingApprovals={familyStats.pendingApprovals}
      totalSatsPaid={familyStats.totalSatsPaid}
      onClickCompleted={() => setActiveTab("byHabit")}
      onClickPending={() => setActiveTab("byHabit")}
    />
  );

  if (showOnboarding) {
    return (
      <DashboardLayout
        displayName={`${t("dashboard.welcome")}, ${displayName}`}
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
    );
  }

  return (
    <DashboardLayout
      displayName={`${t("dashboard.welcome")}, ${displayName}`}
      statsBar={statsBar}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as TabType)}
    >
      {activeTab === "byHabit" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("sponsorDashboard.byHabit")}</h2>
          {byHabitGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <BoltIcon size={48} />
              </span>
              <h3 className={styles.emptyTitle}>{t("emptyState.noHabitsTitle")}</h3>
              <p className={styles.emptySubtext}>{t("emptyState.sponsorNoHabitsDesc")}</p>
              <button
                className={styles.emptyCtaButton}
                onClick={() => setActiveTab("create")}
              >
                {t("emptyState.createFirstHabit")}
              </button>
            </div>
          ) : (
            <div className={styles.habitGrid}>
              {byHabitGroups.map((group) => {
                const kidList = Object.values(group.kids);
                const habit = habits.find((h) => h.id === group.habitId);
                return (
                  <div key={group.habitId} className={styles.groupCard}>
                    <div className={styles.groupHeader}>
                      <div
                        className={styles.colorDot}
                        style={{ backgroundColor: habit?.color ?? "var(--color-primary)" }}
                      />
                      <div className={styles.groupInfo}>
                        <span className={styles.groupName}>{group.habitName}</span>
                        {habit?.description && (
                          <span className={styles.groupDescription}>{habit.description}</span>
                        )}
                      </div>
                      <div className={styles.satBadge}>
                        <BoltIcon size={12} />
                        {group.satReward} {t("sats.sats")}
                      </div>
                    </div>
                    {kidList.length === 0 ? (
                      <p className={styles.noKidsText}>{t("sponsorDashboard.noKidsAssigned")}</p>
                    ) : (
                      <div className={styles.kidRows}>
                        {kidList.map((kid) => (
                          <div key={kid.userId} className={styles.kidRow}>
                            <div className={styles.kidAvatar}>
                              {kid.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.kidName}>{kid.displayName}</span>
                            <div className={styles.trackerWrapper}>
                              <WeeklyTracker
                                habitId={group.habitId}
                                completions={familyCompletions
                                  .filter((c) => c.kid_user_id === kid.userId)
                                  .map((c) => ({ id: c.id, habit_id: c.habit_id, date: c.date, status: c.status }))}
                                scheduleType={habit?.schedule_type}
                                scheduleDays={habit?.schedule_days}
                                onApprove={handleApprove}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "byKid" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("sponsorDashboard.byKid")}</h2>
          {byKidGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <UserIcon size={48} />
              </span>
              <h3 className={styles.emptyTitle}>{t("sponsorDashboard.noKids")}</h3>
              <p className={styles.emptySubtext}>{t("sponsorDashboard.noKidsDesc")}</p>
            </div>
          ) : (
            <div className={styles.habitGrid}>
              {byKidGroups.map((kid) => {
                const kidHabits = Object.values(kid.habits);
                return (
                  <div key={kid.userId} className={styles.groupCard}>
                    <div className={styles.groupHeader}>
                      <div className={styles.kidAvatarLg}>
                        {kid.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.groupInfo}>
                        <span className={styles.groupName}>{kid.displayName}</span>
                        <span className={styles.groupDescription}>
                          {kidHabits.length} {t("sponsorDashboard.habitsAssigned")}
                        </span>
                      </div>
                    </div>
                    {kidHabits.length === 0 ? (
                      <p className={styles.noKidsText}>{t("sponsorDashboard.noHabitsForKid")}</p>
                    ) : (
                      <div className={styles.kidRows}>
                        {kidHabits.map((h) => {
                          const habit = habits.find((hab) => hab.id === h.habitId);
                          return (
                            <div key={h.habitId} className={styles.kidRow}>
                              <div
                                className={styles.colorDot}
                                style={{ backgroundColor: habit?.color ?? "var(--color-primary)" }}
                              />
                              <div className={styles.habitRowInfo}>
                                <span className={styles.kidName}>{h.habitName}</span>
                                <span className={styles.habitRowSats}>
                                  <BoltIcon size={10} /> {h.satReward}
                                </span>
                              </div>
                              <div className={styles.trackerWrapper}>
                                <WeeklyTracker
                                  habitId={h.habitId}
                                  completions={familyCompletions
                                    .filter((c) => c.kid_user_id === kid.userId)
                                    .map((c) => ({ id: c.id, habit_id: c.habit_id, date: c.date, status: c.status }))}
                                  scheduleType={habit?.schedule_type}
                                  scheduleDays={habit?.schedule_days}
                                  onApprove={handleApprove}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><UsersIcon size={48} /></span>
              <h3 className={styles.emptyTitle}>{t("emptyState.noFamily")}</h3>
              <p className={styles.emptySubtext}>{t("emptyState.noFamilySponsorDesc")}</p>
            </div>
          ) : (
            families.map((family) => {
              const myMembership = family.members.find((m) => m.user_id === session?.user_id);
              return (
                <FamilyCard
                  key={family.id}
                  familyId={family.id}
                  name={family.name}
                  inviteCode={family.invite_code}
                  members={family.members}
                  createdBy={family.created_by}
                  currentUserId={session?.user_id ?? ""}
                  currentUserRole={myMembership?.role}
                  onLeave={handleLeaveFamily}
                  onDelete={handleDeleteFamily}
                  onRoleChange={handleRoleChange}
                  onRemoveMember={handleRemoveMember}
                />
              );
            })
          )}
        </div>
      )}

      {activeTab === "payments" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("payments.title")}</h2>
          {paymentsLoading ? (
            <p className={styles.loadingText}>{t("common.loading")}</p>
          ) : payments.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><BoltIcon size={48} /></span>
              <h3 className={styles.emptyTitle}>{t("emptyState.noPayments")}</h3>
              <p className={styles.emptySubtext}>{t("emptyState.noPaymentsDesc")}</p>
            </div>
          ) : (
            <div className={styles.paymentTable}>
              <table>
                <thead>
                  <tr>
                    <th>{t("payments.columns.habit")}</th>
                    <th>{t("payments.columns.user")}</th>
                    <th>{t("payments.columns.amount")}</th>
                    <th>{t("payments.columns.status")}</th>
                    <th>{t("payments.columns.date")}</th>
                    <th>{t("payments.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.habit_name}</td>
                      <td>{p.other_user_display_name}</td>
                      <td>{p.amount_sats} sats</td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{ backgroundColor: STATUS_COLORS[p.status] }}
                        >
                          {t(`payments.status.${p.status}`)}
                        </span>
                      </td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>
                        {p.status === "failed" && (
                          <button
                            className={styles.retryBtn}
                            onClick={() => handleRetryPayment(p.id)}
                          >
                            {t("payments.retryButton")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "wallet" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("wallet.connectWallet")}</h2>
          <WalletConnect />
        </div>
      )}

      {invoiceModal && (
        <InvoiceModal
          paymentRequest={invoiceModal.paymentRequest}
          paymentId={invoiceModal.paymentId}
          amountSats={invoiceModal.amountSats}
          habitName={invoiceModal.habitName}
          onPaid={() => {
            setInvoiceModal(null);
            showToast(
              t("payments.autoPaidSuccess", { amount: invoiceModal.amountSats }),
              "success"
            );
          }}
          onClose={() => setInvoiceModal(null)}
        />
      )}
    </DashboardLayout>
  );
}
