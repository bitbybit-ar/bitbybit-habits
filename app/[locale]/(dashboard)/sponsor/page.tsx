"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LogOutIcon, BoltIcon, ClockIcon, PencilIcon, SettingsIcon, ListIcon, PlusIcon, UsersIcon, WalletIcon } from "@/components/icons";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { PendingList } from "@/components/dashboard/pending-list";
import type { PendingCompletion } from "@/components/dashboard/pending-list";
import { CreateHabitForm } from "@/components/dashboard/create-habit-form";
import type { CreateHabitData } from "@/components/dashboard/create-habit-form";
import { FamilyCard } from "@/components/dashboard/family-card";
import { HabitCard } from "@/components/dashboard/habit-card";
import { WalletConnect } from "@/components/dashboard/wallet-connect";
import { Onboarding } from "@/components/dashboard/onboarding";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Habit, Completion, AuthSession, PaymentWithDetails } from "@/lib/types";
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

type TabType = "pending" | "habits" | "create" | "family" | "payments" | "wallet";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9F43",
  paid: "#4CAF7D",
  failed: "#EE5A5A",
};

export default function SponsorDashboard() {
  const t = useTranslations();
  const { showToast } = useToast();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [pendingCompletions, setPendingCompletions] = useState<PendingCompletion[]>([]);
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
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
          setTotalPaid(pendingData.data?.totalPaid ?? 0);
        }
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

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
          showToast(t("sponsorDashboard.approveSuccess"), "success");
        }
      }
    } catch {
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t]);

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
          showToast(t("sponsorDashboard.rejectSuccess"), "info");
        }
      }
    } catch {
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t]);

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

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      // Silently handle errors
    }
  }, []);

  const handleEditHabit = useCallback((updated: Habit) => {
    setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    showToast(t("habits.editSuccess"), "success");
  }, [showToast, t]);

  const handleDeleteHabit = useCallback(async (habitId: string) => {
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      if (res.ok) {
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
        showToast(t("habits.deleteSuccess"), "info");
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
    { key: "payments", label: t("payments.title") },
    { key: "wallet", label: t("wallet.connectWallet") },
  ];

  const bottomNavTabs = [
    { key: "pending", label: t("sponsorDashboard.pendingApprovals"), icon: <ClockIcon size={20} />, badge: pendingCompletions.length },
    { key: "habits", label: t("dashboard.myHabits"), icon: <ListIcon size={20} /> },
    { key: "create", label: t("habits.createHabit"), icon: <PlusIcon size={20} /> },
    { key: "family", label: t("family.myFamily"), icon: <UsersIcon size={20} /> },
    { key: "wallet", label: t("wallet.connectWallet"), icon: <WalletIcon size={20} /> },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {t("dashboard.welcome")}, {displayName}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageSwitcher />
          <NotificationBell />
          <Link href="/settings" className={styles.logoutButton} style={{ textDecoration: "none" }}>
            <SettingsIcon size={18} />
          </Link>
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
        items={[
          {
            icon: <BoltIcon size={22} />,
            value: totalPaid.toLocaleString(),
            label: `${t("sats.sats")} ${t("sats.paid")}`,
            iconClass: statsStyles.iconSats,
            highlight: true,
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

      {/* Desktop tabs */}
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
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🎯</span>
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
              habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  completions={completions}
                  onComplete={noopComplete}
                  hideAction
                  currentUserId={session?.user_id}
                  onEdit={handleEditHabit}
                  onDelete={handleDeleteHabit}
                  kids={uniqueKids}
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
            <p className={styles.loadingText}>{t("payments.noPayments")}</p>
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

      <BottomNav
        tabs={bottomNavTabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabType)}
      />
        </>
      )}
    </div>
  );
}
