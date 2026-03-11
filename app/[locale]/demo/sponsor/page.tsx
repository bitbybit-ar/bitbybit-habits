"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/layout/navbar";
import SponsorDemo from "@/components/demo/SponsorDemo";
import { ShieldIcon } from "@/components/icons";
import styles from "../demo.module.scss";

export default function SponsorDemoPage() {
  const t = useTranslations("demo");

  return (
    <>
      <Navbar />
      <div className={styles.demoPage}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <ShieldIcon size={28} color="#F7A825" /> <span>{t("sponsorDemoTitle")}</span>
          </h1>
          <p className={styles.subtitle}>{t("sponsorDemoSubtitle")}</p>
        </div>

        <div className={styles.demoContainer}>
          <SponsorDemo />
        </div>
      </div>
    </>
  );
}
