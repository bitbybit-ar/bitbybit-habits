"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import SponsorDemo from "@/components/demo/SponsorDemo";
import styles from "../demo.module.scss";

export default function SponsorDemoPage() {
  const t = useTranslations("demo");

  return (
    <div className={styles.demoPage}>
      <Link href="/demo" className={styles.backLink}>
        ← {t("backToDemo")}
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>
          <span>🛡️ {t("sponsorDemoTitle")}</span>
        </h1>
        <p className={styles.subtitle}>{t("sponsorDemoSubtitle")}</p>
      </div>

      <div className={styles.demoContainer}>
        <SponsorDemo />
      </div>
    </div>
  );
}
