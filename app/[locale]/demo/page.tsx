"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import Navbar from "@/components/layout/navbar";
import { UsersIcon, BoltIcon, ArrowRightIcon } from "@/components/icons";
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

        <div className={styles.roles}>
          {/* Sponsor Card */}
          <div className={`${styles.flipCard} ${styles.sponsorCard}`}>
            <div className={styles.flipCardInner}>
              <div className={styles.flipFront}>
                <div className={styles.iconWrapper}>
                  <UsersIcon size={36} color="#F7A825" />
                </div>
                <h3 className={styles.roleName}>Sponsor</h3>
                <p className={styles.roleDesc}>
                  {t("sponsorExplain")}
                </p>
                <Link href="/demo/sponsor" className={styles.ctaButton}>
                  {t("trySponsor")} <ArrowRightIcon size={16} />
                </Link>
              </div>
              <div className={styles.flipBack}>
                <Image
                  src="/images/demo-sponsor-preview.svg"
                  alt="Sponsor dashboard preview"
                  fill
                  className={styles.previewImage}
                />
                <div className={styles.backOverlay}>
                  <Link href="/demo/sponsor" className={styles.ctaButton}>
                    {t("trySponsor")} <ArrowRightIcon size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Kid Card */}
          <div className={`${styles.flipCard} ${styles.kidCard}`}>
            <div className={styles.flipCardInner}>
              <div className={styles.flipFront}>
                <div className={styles.iconWrapper}>
                  <BoltIcon size={36} color="#4DB6AC" />
                </div>
                <h3 className={styles.roleName}>Kid</h3>
                <p className={styles.roleDesc}>
                  {t("kidExplain")}
                </p>
                <Link href="/demo/kid" className={styles.ctaButton}>
                  {t("tryKid")} <ArrowRightIcon size={16} />
                </Link>
              </div>
              <div className={styles.flipBack}>
                <Image
                  src="/images/demo-kid-preview.svg"
                  alt="Kid dashboard preview"
                  fill
                  className={styles.previewImage}
                />
                <div className={styles.backOverlay}>
                  <Link href="/demo/kid" className={styles.ctaButton}>
                    {t("tryKid")} <ArrowRightIcon size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
