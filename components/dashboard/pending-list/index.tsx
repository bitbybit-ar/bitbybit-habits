"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDisplayDate } from "@/lib/date";
import { CheckIcon, ClockIcon, BoltIcon } from "@/components/icons";
import styles from "./pending-list.module.scss";

interface PendingCompletion {
  id: string;
  habit_id: string;
  habit_name: string;
  habit_color: string;
  kid_name: string;
  sat_reward: number;
  date: string;
  completed_at: string;
}

interface PendingListProps {
  completions: PendingCompletion[];
  onApprove: (completionId: string) => Promise<void>;
  onReject: (completionId: string) => Promise<void>;
}

export function PendingList({ completions, onApprove, onReject }: PendingListProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleApprove = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await onApprove(id);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReject = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await onReject(id);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (completions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <ClockIcon size={32} />
        <p className={styles.emptyText}>{t("sponsorDashboard.noPending")}</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {completions.map((completion) => {
        const isProcessing = processingIds.has(completion.id);

        return (
          <div key={completion.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <div className={styles.itemHeader}>
                <div className={styles.colorDot} style={{ backgroundColor: completion.habit_color }} />
                <span className={styles.habitName}>{completion.habit_name}</span>
                <div className={styles.satBadge}>
                  <BoltIcon size={12} />
                  {completion.sat_reward} {t("sats.sats")}
                </div>
              </div>
              <div className={styles.itemMeta}>
                <span className={styles.kidName}>{completion.kid_name}</span>
                <span className={styles.date}>{formatDisplayDate(completion.date, locale)}</span>
              </div>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.approveButton}
                onClick={() => handleApprove(completion.id)}
                disabled={isProcessing}
              >
                <CheckIcon size={16} />
                {t("habits.approve")}
              </button>
              <button
                className={styles.rejectButton}
                onClick={() => handleReject(completion.id)}
                disabled={isProcessing}
              >
                {t("habits.reject")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { PendingCompletion };
export default PendingList;
