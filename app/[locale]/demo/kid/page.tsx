"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Navbar from "@/components/layout/navbar";
import KidDemo from "@/components/demo/KidDemo";
import { BoltIcon } from "@/components/icons";
import styles from "../demo.module.scss";

export default function KidDemoPage() {
  const t = useTranslations("demo");

  return (
    <>
      <Navbar />
      <div className={styles.demoPage}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <BoltIcon size={28} color="#4DB6AC" /> <span>{t("kidDemoTitle")}</span>
          </h1>
          <p className={styles.subtitle}>{t("kidDemoSubtitle")}</p>
        </div>

        <div className={styles.demoContainer}>
          <KidDemo />
        </div>
      </div>
    </>
  );
}
