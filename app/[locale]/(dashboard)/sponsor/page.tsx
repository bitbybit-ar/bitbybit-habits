"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BoltIcon, ListIcon, PlusIcon, UsersIcon, WalletIcon, UserIcon } from "@/components/icons";
import { SummaryBar } from "@/components/dashboard/summary-bar";
import { CreateHabitForm } from "@/components/dashboard/create-habit-form";
import type { CreateHabitData } from "@/components/dashboard/create-habit-form";
import { WalletConnect } from "@/components/dashboard/wallet-connect";
import { Onboarding } from "@/components/dashboard/onboarding";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { DashboardTab } from "@/components/dashboard/dashboard-layout";
import { InvoiceModal } from "@/components/ui/invoice-modal";
import { useToast } from "@/components/ui/toast";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/hooks/useSession";
import { useHabits } from "@/lib/hooks/useHabits";
import { useFamilies } from "@/lib/hooks/useFamilies";
import { useFamilyData } from "@/lib/hooks/useFamilyData";
import { usePayments } from "@/lib/hooks/usePayments";
import { useWebLN } from "@/lib/hooks/useWebLN";
import { SponsorHabitsTab, SponsorByKidTab } from "@/components/dashboard/sponsor/SponsorHabitsTab";
import { SponsorPaymentsTab } from "@/components/dashboard/sponsor/SponsorPaymentsTab";
import { SponsorFamilyTab } from "@/components/dashboard/sponsor/SponsorFamilyTab";
import styles from "./sponsor.module.scss";

type TabType = "byHabit" | "byKid" | "create" | "family" | "payments" | "wallet";

export default function SponsorDashboard() {
  const t = useTranslations();
  const { showToast } = useToast();
  const { hasExtension: hasWebLN } = useWebLN();
  const [activeTab, setActiveTab] = useState<TabType>("byHabit");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState<{
    paymentRequest: string;
    paymentId: string;
    amountSats: number;
    habitName: string;
  } | null>(null);

  const session = useSession();
  const habits = useHabits();
  const families = useFamilies();
  const familyData = useFamilyData(families.data);
  const payments = usePayments({ role: "sponsor", skip: activeTab !== "payments" });

  const isLoading = session.isLoading || habits.isLoading || families.isLoading;

  useEffect(() => {
    if (!isLoading && habits.data.length === 0 && families.data.length === 0) {
      const dismissed = localStorage.getItem("bitbybit_onboarding_done");
      if (!dismissed) setShowOnboarding(true);
    }
  }, [isLoading, habits.data.length, families.data.length]);

  useEffect(() => {
    if (activeTab === "payments") payments.refetch();
  }, [activeTab]); // Only refetch when tab changes

  const handleDismissOnboarding = useCallback(() => {
    localStorage.setItem("bitbybit_onboarding_done", "1");
    setShowOnboarding(false);
  }, []);

  const handleApprove = useCallback(async (completionId: string) => {
    // Optimistic update
    familyData.setCompletions((prev) =>
      prev.map((c) => (c.id === completionId ? { ...c, status: "approved" as const } : c))
    );
    familyData.setStats((prev) => ({
      ...prev,
      pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
    }));

    const revertOptimistic = () => {
      familyData.setCompletions((prev) =>
        prev.map((c) => (c.id === completionId ? { ...c, status: "pending" as const } : c))
      );
      familyData.setStats((prev) => ({
        ...prev,
        pendingApprovals: prev.pendingApprovals + 1,
      }));
    };

    try {
      const res = await fetch("/api/completions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_id: completionId }),
      });

      if (!res.ok) { revertOptimistic(); return; }
      const data = await res.json();
      if (!data.success) { revertOptimistic(); return; }

      const paymentStatus = data.data?.payment_status;
      const completionData = familyData.completions.find((c) => c.id === completionId);

      if (paymentStatus === "no_wallet") {
        showToast(t("sponsorDashboard.approveNoWallet"), "info");
        return;
      }

      if (paymentStatus === "none" || !completionData?.sat_reward) {
        showToast(t("sponsorDashboard.approveSuccess"), "success");
        return;
      }

      // Generate invoice
      const invoiceRes = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_id: completionId, amount_sats: completionData.sat_reward }),
      });

      if (invoiceRes.ok) {
        const invoiceData = await invoiceRes.json();
        if (invoiceData.success && invoiceData.data) {
          const { paymentRequest, payment_id: paymentId } = invoiceData.data;

          // Priority 1: WebLN
          if (hasWebLN) {
            try {
              const webln = (window as unknown as { webln?: { enable: () => Promise<void>; sendPayment: (invoice: string) => Promise<{ preimage: string }> } }).webln;
              if (webln) {
                await webln.enable();
                await webln.sendPayment(paymentRequest);
                showToast(t("payments.autoPaidSuccess", { amount: completionData.sat_reward }), "success");
                return;
              }
            } catch { /* fall through */ }
          }

          // Priority 2: NWC auto-pay
          try {
            const payRes = await fetch(`/api/payments/${paymentId}/pay`, { method: "POST", headers: { "Content-Type": "application/json" } });
            if (payRes.ok) {
              const payData = await payRes.json();
              if (payData.success && payData.data?.paid) {
                showToast(t("payments.autoPaidSuccess", { amount: completionData.sat_reward }), "success");
                return;
              }
            }
          } catch { /* fall through */ }

          // Priority 3: Invoice modal
          setInvoiceModal({ paymentRequest, paymentId, amountSats: completionData.sat_reward, habitName: completionData.habit_name });
          showToast(t("payments.scanInvoice", { amount: completionData.sat_reward }), "info");
          return;
        }
      }

      if (invoiceRes.status === 422) {
        showToast(t("payments.approvedNoPay"), "info");
        return;
      }

      showToast(t("payments.paymentError"), "error");
    } catch {
      revertOptimistic();
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t, familyData, hasWebLN]);

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
          habits.setData((prev) => [...newHabits, ...prev]);
          setActiveTab("byHabit");
          showToast(t("sponsorDashboard.createSuccess"), "success");
        }
      }
    } catch {
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t, habits]);

  const handleRetryPayment = useCallback(async (paymentId: string) => {
    const ok = await payments.retryPayment(paymentId);
    showToast(ok ? t("payments.retrySuccess") : t("payments.retryError"), ok ? "info" : "error");
  }, [payments, showToast, t]);

  const handleLeaveFamily = useCallback(async (familyId: string) => {
    const ok = await families.leaveFamily(familyId);
    if (ok) showToast(t("family.leaveSuccess"), "info");
  }, [families, showToast, t]);

  const handleDeleteFamily = useCallback(async (familyId: string) => {
    const ok = await families.deleteFamily(familyId);
    if (ok) showToast(t("family.deleteSuccess"), "info");
  }, [families, showToast, t]);

  const handleRoleChange = useCallback(async (familyId: string, userId: string, newRole: string) => {
    const ok = await families.changeRole(familyId, userId, newRole);
    if (ok) showToast(t("family.roleChanged"), "success");
  }, [families, showToast, t]);

  const handleRemoveMember = useCallback(async (familyId: string, userId: string) => {
    const ok = await families.removeMember(familyId, userId);
    if (ok) showToast(t("family.memberRemoved"), "info");
  }, [families, showToast, t]);

  if (isLoading) return <DashboardSkeleton />;

  const displayName = session.data?.display_name ?? session.data?.username ?? "Sponsor";
  const allKids = families.data.flatMap((f) =>
    f.members.filter((m) => m.role === "kid").map((m) => ({ user_id: m.user_id, display_name: m.display_name || m.username }))
  );
  const uniqueKids = allKids.filter((kid, i, self) => self.findIndex((k) => k.user_id === kid.user_id) === i);
  const familyOptions = families.data.map((f) => ({ id: f.id, name: f.name }));

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
      completedToday={familyData.stats.completedToday}
      totalToday={familyData.stats.totalToday}
      pendingApprovals={familyData.stats.pendingApprovals}
      totalSatsPaid={familyData.stats.totalSatsPaid}
      onClickCompleted={() => setActiveTab("byHabit")}
      onClickPending={() => setActiveTab("byHabit")}
    />
  );

  if (showOnboarding) {
    return (
      <DashboardLayout displayName={`${t("dashboard.welcome")}, ${displayName}`} statsBar={statsBar} tabs={tabs} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as TabType)}>
        <Onboarding displayName={displayName} onDismiss={handleDismissOnboarding} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout displayName={`${t("dashboard.welcome")}, ${displayName}`} statsBar={statsBar} tabs={tabs} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as TabType)}>
      {activeTab === "byHabit" && (
        <SponsorHabitsTab habits={habits.data} families={families.data} familyCompletions={familyData.completions} onApprove={handleApprove} onCreateHabit={() => setActiveTab("create")} />
      )}
      {activeTab === "byKid" && (
        <SponsorByKidTab habits={habits.data} families={families.data} familyCompletions={familyData.completions} onApprove={handleApprove} />
      )}
      {activeTab === "create" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("habits.createHabit")}</h2>
          <CreateHabitForm families={familyOptions} kids={uniqueKids} onSubmit={handleCreateHabit} />
        </div>
      )}
      {activeTab === "family" && (
        <SponsorFamilyTab families={families.data} sessionUserId={session.data?.user_id ?? ""} onLeave={handleLeaveFamily} onDelete={handleDeleteFamily} onRoleChange={handleRoleChange} onRemoveMember={handleRemoveMember} />
      )}
      {activeTab === "payments" && (
        <SponsorPaymentsTab payments={payments.data} isLoading={payments.isLoading} onRetry={handleRetryPayment} />
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
          onPaid={() => { setInvoiceModal(null); showToast(t("payments.autoPaidSuccess", { amount: invoiceModal.amountSats }), "success"); }}
          onClose={() => setInvoiceModal(null)}
        />
      )}
    </DashboardLayout>
  );
}
