"use client";

import { useTranslations, useLocale } from "next-intl";
import { BoltIcon } from "@/components/icons";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Spinner } from "@/components/ui/spinner";
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
    <DashboardSection title={t("payments.title")}>
      {isLoading ? (
        <Spinner size="sm" />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<BoltIcon size={48} />}
          title={t("emptyState.noPayments")}
          description={t("emptyState.noPaymentsDesc")}
        />
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
    </DashboardSection>
  );
}
