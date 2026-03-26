"use client";

import { useTranslations, useLocale } from "next-intl";
import { BoltIcon } from "@/components/icons";
import { formatDisplayDate } from "@/lib/date";
import type { PaymentWithDetails } from "@/lib/types";
import styles from "../../../app/[locale]/(dashboard)/sponsor/sponsor.module.scss";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9F43",
  paid: "#4CAF7D",
  failed: "#EE5A5A",
};

interface SponsorPaymentsTabProps {
  payments: PaymentWithDetails[];
  isLoading: boolean;
  onRetry: (paymentId: string) => void;
}

export function SponsorPaymentsTab({ payments, isLoading, onRetry }: SponsorPaymentsTabProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t("payments.title")}</h2>
      {isLoading ? (
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
                    <span className={styles.statusBadge} style={{ backgroundColor: STATUS_COLORS[p.status] }}>
                      {t(`payments.status.${p.status}`)}
                    </span>
                  </td>
                  <td>{formatDisplayDate(p.created_at, locale)}</td>
                  <td>
                    {p.status === "failed" && (
                      <button className={styles.retryBtn} onClick={() => onRetry(p.id)}>
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
  );
}
