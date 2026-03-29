"use client";

import { useTranslations } from "next-intl";
import { useSession } from "@/lib/hooks/useSession";
import { ShieldIcon } from "@/components/icons";
import { AdminUsersTable } from "@/components/dashboard/admin-users-table";
import styles from "./admin.module.scss";

const ADMIN_PUBKEY_HEX = "d9590d95a7811e1cb312be66edd664d7e3e6ed57822ad9f213ed620fc6748be8";

export default function AdminPage() {
  const t = useTranslations("admin");
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className={styles.layout}>
        <div className={styles.loadingContainer}>
          <p className={styles.loadingText}>{t("loading")}</p>
        </div>
      </div>
    );
  }

  const isAdmin = session?.nostr_pubkey === ADMIN_PUBKEY_HEX;

  if (!session || !isAdmin) {
    return (
      <div className={styles.layout}>
        <div className={styles.container}>
          <div className={styles.accessDenied}>
            <h2 className={styles.accessDeniedTitle}>{t("accessDenied")}</h2>
            <p className={styles.accessDeniedText}>{t("accessDeniedText")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <ShieldIcon size={24} />
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.headerTitle}>{t("title")}</h1>
            <p className={styles.headerSubtitle}>{t("subtitle")}</p>
          </div>
        </div>

        <AdminUsersTable />
      </div>
    </div>
  );
}
