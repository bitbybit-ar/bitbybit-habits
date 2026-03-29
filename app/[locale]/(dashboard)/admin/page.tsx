"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ShieldIcon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { BlockLoader } from "@/components/ui/block-loader";
import { AdminUsersTable } from "@/components/dashboard/admin-users-table";
import styles from "./admin.module.scss";

export default function AdminPage() {
  const t = useTranslations("admin");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        setIsAdmin(res.ok);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <Container center><BlockLoader /></Container>;
  }

  if (!isAdmin) {
    return (
      <Container center>
        <div className={styles.accessDenied}>
          <h2 className={styles.accessDeniedTitle}>{t("accessDenied")}</h2>
          <p className={styles.accessDeniedText}>{t("accessDeniedText")}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
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
    </Container>
  );
}
