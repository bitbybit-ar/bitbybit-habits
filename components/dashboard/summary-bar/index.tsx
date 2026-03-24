"use client";

import { useTranslations } from "next-intl";
import { CheckIcon, ClockIcon, BoltIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./summary-bar.module.scss";

interface SummaryBarProps {
  completedToday: number;
  totalToday: number;
  pendingApprovals: number;
  totalSatsPaid: number;
  onClickCompleted?: () => void;
  onClickPending?: () => void;
}

export function SummaryBar({
  completedToday,
  totalToday,
  pendingApprovals,
  totalSatsPaid,
  onClickCompleted,
  onClickPending,
}: SummaryBarProps) {
  const t = useTranslations();

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={cn(styles.card, styles.cardCompleted)}
        onClick={onClickCompleted}
      >
        <div className={cn(styles.iconWrapper, styles.iconCompleted)}>
          <CheckIcon size={20} />
        </div>
        <div className={styles.cardContent}>
          <span className={styles.cardValue}>
            {completedToday}/{totalToday}
          </span>
          <span className={styles.cardLabel}>
            {t("summaryBar.completedToday")}
          </span>
        </div>
      </button>

      <button
        type="button"
        className={cn(styles.card, styles.cardPending)}
        onClick={onClickPending}
      >
        <div className={cn(styles.iconWrapper, styles.iconPending)}>
          <ClockIcon size={20} />
        </div>
        <div className={styles.cardContent}>
          <span className={styles.cardValue}>
            {pendingApprovals}
            {pendingApprovals > 0 && (
              <span className={styles.badge}>{pendingApprovals}</span>
            )}
          </span>
          <span className={styles.cardLabel}>
            {t("summaryBar.pending")}
          </span>
        </div>
      </button>

      <div className={cn(styles.card, styles.cardSats)}>
        <div className={cn(styles.iconWrapper, styles.iconSats)}>
          <BoltIcon size={20} />
        </div>
        <div className={styles.cardContent}>
          <span className={cn(styles.cardValue, styles.valueSats)}>
            {totalSatsPaid.toLocaleString()}
          </span>
          <span className={styles.cardLabel}>
            {t("summaryBar.satsPaid")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SummaryBar;
