"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Container } from "@/components/ui/container";
import { BlockLoader } from "@/components/ui/block-loader";
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
  const router = useRouter();
  const { showToast } = useToast();
  const { hasExtension: hasWebLN, sendPayment: weblnSendPayment, extensionName } = useWebLN();
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

  /**
   * Runs the 3-tier payment cascade:
   * 1. Generate invoice from kid's wallet
   * 2. Try WebLN (browser extension)
   * 3. Try NWC auto-pay (sponsor's wallet)
   * 4. Fall back to QR invoice modal
   */
  const runPaymentCascade = useCallback(async (completionId: string, amountSats: number, habitName: string, existingPaymentId?: string) => {
    // Generate invoice from kid's wallet
    const invoiceRes = await fetch("/api/payments/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completion_id: completionId, amount_sats: amountSats, payment_id: existingPaymentId }),
    });

    if (!invoiceRes.ok) {
      showToast(t("payments.paymentError"), "error");
      return;
    }

    const invoiceData = await invoiceRes.json();
    if (!invoiceData.success || !invoiceData.data) {
      showToast(t("payments.paymentError"), "error");
      return;
    }

    const { paymentRequest, payment_id: paymentId } = invoiceData.data;

    // Tier 1: WebLN (browser extension — invisible to user)
    if (hasWebLN) {
      try {
        const { preimage } = await weblnSendPayment(paymentRequest);
        try {
          await fetch(`/api/payments/${paymentId}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preimage }),
          });
          showToast(t("payments.weblnPaidSuccess", { amount: amountSats, extension: extensionName ?? "WebLN" }), "success");
        } catch {
          showToast(t("payments.weblnConfirmError"), "info");
        }
        return; // CRITICAL: never fall through after sendPayment succeeds
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("rejected") || msg.includes("denied") || msg.includes("cancelled")) {
          showToast(t("payments.weblnRejected"), "info");
        }
        // Fall through to NWC
      }
    }

    // Tier 2: NWC auto-pay (invisible to user)
    try {
      const payRes = await fetch(`/api/payments/${paymentId}/pay`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (payRes.ok) {
        const payData = await payRes.json();
        if (payData.success && payData.data?.paid) {
          showToast(t("payments.autoPaidSuccess", { amount: amountSats }), "success");
          return;
        }
      } else {
        const payData = await payRes.json().catch(() => null);
        if (payData?.error === "insufficient_funds") {
          showToast(t("payments.insufficientFunds"), "error");
        }
        // sponsor_no_wallet or other — fall through to QR
      }
    } catch { /* network error — fall through to QR */ }

    // Tier 3: Show QR invoice modal
    setInvoiceModal({ paymentRequest, paymentId, amountSats, habitName });
    showToast(t("payments.scanInvoice", { amount: amountSats }), "info");
  }, [hasWebLN, weblnSendPayment, extensionName, showToast, t]);

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

      const data = await res.json();

      if (!res.ok || !data.success) {
        revertOptimistic();
        if (data.error === "kid_no_wallet") {
          showToast(t("payments.kidNoWallet"), "error");
        }
        return;
      }

      const paymentStatus = data.data?.payment_status;
      const completionData = familyData.completions.find((c) => c.id === completionId);

      if (paymentStatus === "none" || !completionData?.sat_reward) {
        showToast(t("sponsorDashboard.approveSuccess"), "success");
        return;
      }

      // Run the 3-tier payment cascade with the payment_id from approve
      const paymentId = data.data?.payment_id;
      await runPaymentCascade(completionId, completionData.sat_reward, completionData.habit_name, paymentId);
    } catch {
      revertOptimistic();
      showToast(t("auth.connectionError"), "error");
    }
  }, [showToast, t, familyData, runPaymentCascade]);

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
    const result = await payments.retryPayment(paymentId);
    if (!result.success) {
      showToast(t("payments.retryError"), "error");
      return;
    }
    // Re-run the full payment cascade with the reset payment
    const payment = result.payment;
    // Find habit name from the completion data or payments list
    const paymentData = payments.data.find((p) => p.id === paymentId);
    const habitName = paymentData?.habit_name ?? "";
    await runPaymentCascade(payment.completion_id, payment.amount_sats, habitName, paymentId);
  }, [payments, showToast, t, runPaymentCascade]);

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

  if (isLoading) return <Container center><BlockLoader /></Container>;

  if (session.data?.role === "kid") {
    router.replace("/kid");
    return <Container center><BlockLoader /></Container>;
  }

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

  const activeTabLabel = tabs.find((t) => t.key === activeTab)?.label ?? "";
  const breadcrumbs = [
    { label: t("dashboard.title"), href: "/sponsor" },
    { label: activeTabLabel },
  ];

  if (showOnboarding) {
    return (
      <DashboardLayout displayName={`${t("dashboard.welcome")}, ${displayName}`} statsBar={statsBar} tabs={tabs} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as TabType)} breadcrumbs={breadcrumbs}>
        <Onboarding displayName={displayName} onDismiss={handleDismissOnboarding} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout displayName={`${t("dashboard.welcome")}, ${displayName}`} statsBar={statsBar} tabs={tabs} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as TabType)} breadcrumbs={breadcrumbs}>
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
