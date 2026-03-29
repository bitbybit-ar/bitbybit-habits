"use client";

import { useTranslations } from "next-intl";
import styles from "./admin-users-table.module.scss";

interface AdminStats {
  db: "local" | "production";
  users: number;
  families: number;
  habits: number;
  completions: { total: number; approved: number; pending: number; rejected: number };
  payments: { total: number; paid: number; total_sats: number };
  familyList: { id: string; name: string }[];
}

interface AdminStatsPanelProps {
  stats: AdminStats;
}

export function AdminStatsPanel({ stats }: AdminStatsPanelProps) {
  const t = useTranslations("admin");

  const items = [
    { value: stats.users, label: t("statUsers") },
    { value: stats.families, label: t("statFamilies") },
    { value: stats.habits, label: t("statHabits") },
    { value: stats.completions.approved, label: t("statApproved") },
    { value: stats.payments.paid, label: t("statPayments") },
    { value: stats.payments.total_sats.toLocaleString(), label: t("statSats") },
  ];

  return (
    <>
      <div className={`${styles.dbIndicator} ${stats.db === "local" ? styles.dbLocal : styles.dbProd}`}>
        {stats.db === "local" ? "LOCAL DB" : "PROD DB"}
      </div>
      <div className={styles.statsGrid}>
        {items.map((item) => (
          <div key={item.label} className={styles.statCard}>
            <div className={styles.statValue}>{item.value}</div>
            <div className={styles.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
