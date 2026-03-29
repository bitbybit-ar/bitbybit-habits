"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import SponsorDemo from "@/components/demo/SponsorDemo";
import { ShieldIcon } from "@/components/icons";
import styles from "../demo.module.scss";

export default function SponsorDemoPage() {
  const t = useTranslations("demo");

  return (
    <div className={styles.demoPage}>
      <div className={styles.headerRow}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <ShieldIcon size={28} color="#F7A825" /> <span>{t("sponsorDemoTitle")}</span>
          </h1>
          <p className={styles.subtitle}>{t("sponsorDemoSubtitle")}</p>
        </div>
        <Link href="/" className={styles.exitDemo}>
          {t("exitDemo")}
        </Link>
      </div>

      <div className={styles.demoContainer}>
        <SponsorDemo />
      </div>
    </div>
  );
}
