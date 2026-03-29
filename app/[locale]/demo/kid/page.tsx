"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import KidDemo from "@/components/demo/KidDemo";
import { BoltIcon } from "@/components/icons";
import styles from "../demo.module.scss";

export default function KidDemoPage() {
  const t = useTranslations("demo");

  return (
    <div className={styles.demoPage}>
      <div className={styles.headerRow}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <BoltIcon size={28} color="#4DB6AC" /> <span>{t("kidDemoTitle")}</span>
          </h1>
          <p className={styles.subtitle}>{t("kidDemoSubtitle")}</p>
        </div>
        <Link href="/" className={styles.exitDemo}>
          {t("exitDemo")}
        </Link>
      </div>

      <div className={styles.demoContainer}>
        <KidDemo />
      </div>
    </div>
  );
}
