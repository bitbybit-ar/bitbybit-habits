"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Navbar from "@/components/layout/navbar";
import styles from "./demo.module.scss";

export default function DemoPage() {
  const t = useTranslations("demo");

  return (
    <>
      <Navbar />
      <div className={styles.demoPage}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span>{t("title")}</span>
          </h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>

        <div className={styles.rolesExplainer}>
          <div className={styles.roleExplain}>
            <div className={styles.roleIcon}>👨‍👩‍👧</div>
            <h4>Sponsor</h4>
            <p>{t("sponsorExplain")}</p>
          </div>
          <div className={styles.roleExplain}>
            <div className={styles.roleIcon}>🧒</div>
            <h4>Kid</h4>
            <p>{t("kidExplain")}</p>
          </div>
        </div>

        <div className={styles.roles}>
          <Link href="/demo/sponsor" className={styles.roleCard}>
            <div className={styles.roleIcon}>🛡️</div>
            <div className={styles.roleName}>{t("trySponsor")}</div>
            <div className={styles.roleDesc}>{t("trySponsorDesc")}</div>
          </Link>
          <Link href="/demo/kid" className={styles.roleCard}>
            <div className={styles.roleIcon}>⚡</div>
            <div className={styles.roleName}>{t("tryKid")}</div>
            <div className={styles.roleDesc}>{t("tryKidDesc")}</div>
          </Link>
        </div>
      </div>
    </>
  );
}
