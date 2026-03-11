"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import KidDemo from "@/components/demo/KidDemo";
import styles from "../demo.module.scss";

export default function KidDemoPage() {
  const t = useTranslations("demo");

  return (
    <div className={styles.demoPage}>
      <Link href="/demo" className={styles.backLink}>
        ← {t("backToDemo")}
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>
          <span>⚡ {t("kidDemoTitle")}</span>
        </h1>
        <p className={styles.subtitle}>{t("kidDemoSubtitle")}</p>
      </div>

      <div className={styles.demoContainer}>
        <KidDemo />
      </div>
    </div>
  );
}
