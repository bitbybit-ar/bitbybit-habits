"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Section from "@/components/ui/section";
import ScrollReveal from "@/components/ui/scroll-reveal";
import { BoltIcon, LogInIcon, UserPlusIcon } from "@/components/icons";
import styles from "./call-to-action.module.scss";

export const CallToAction: React.FC = () => {
  const t = useTranslations("landing.cta");

  return (
    <Section aria-labelledby="cta-title">
      <ScrollReveal variant="scale">
      <div className={styles.wrapper}>
        <div className={styles.icon} aria-hidden="true">
          <BoltIcon size={48} color="#F7A825" />
        </div>
        <h2 id="cta-title" className={styles.title}>{t("title")}</h2>
        <p className={styles.subtitle}>{t("subtitle")}</p>
        <div className={styles.buttons}>
          <Link href="/register" className={styles.primaryButton}>
            <UserPlusIcon size={18} />
            <span>{t("signup")}</span>
          </Link>
          <Link href="/login" className={styles.secondaryButton}>
            <LogInIcon size={18} />
            <span>{t("login")}</span>
          </Link>
        </div>
        <Link href="/demo" className={styles.previewLink}>
          {t("preview")}
        </Link>
      </div>
      </ScrollReveal>
    </Section>
  );
};

export default CallToAction;
