"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { BoltIcon } from "@/components/icons";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { formatDisplayDate } from "@/lib/date";
import type { PaymentWithDetails } from "@/lib/types";
import styles from "../../../app/[locale]/(dashboard)/kid/kid.module.scss";

interface KidEarningsTabProps {
  payments: PaymentWithDetails[];
  isLoading: boolean;
}

export function KidEarningsTab({ payments, isLoading }: KidEarningsTabProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <DashboardSection title={t("kidDashboard.earnings")}>
      {isLoading ? (
        <Spinner size="sm" />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<BoltIcon size={48} />}
          title={t("emptyState.noPayments")}
          description={t("kidDashboard.earningsDesc")}
        />
      ) : (
        <div className={styles.earningsList}>
          {payments.map((p) => (
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
    </DashboardSection>
  );
}
