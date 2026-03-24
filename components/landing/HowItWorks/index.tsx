"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import ScrollReveal from "@/components/ui/scroll-reveal";
import { UsersIcon, ListIcon, BellIcon, BoltIcon } from "@/components/icons";
import styles from "./how-it-works.module.scss";

export const HowItWorks: React.FC = () => {
  const t = useTranslations("landing.howItWorks");

  const STEPS = [
    { number: 1, title: t("step1Title"), description: t("step1Desc"), icon: <UsersIcon size={24} /> },
    { number: 2, title: t("step2Title"), description: t("step2Desc"), icon: <ListIcon size={24} /> },
    { number: 3, title: t("step3Title"), description: t("step3Desc"), icon: <BellIcon size={24} /> },
    { number: 4, title: t("step4Title"), description: t("step4Desc"), icon: <BoltIcon size={24} /> },
  ];

  return (
    <Section id="how-it-works" aria-labelledby="how-title">
      <ScrollReveal>
        <SectionTitle
          id="how-title"
          title={t("title")}
          subtitle={t("subtitle")}
        />
      </ScrollReveal>
      <ScrollReveal variant="stagger">
        <div className={styles.timeline}>
          <div className={styles.timelineLine} aria-hidden="true" />

          {STEPS.map((step) => (
            <div key={step.number} className={styles.timelineStep}>
              <div className={styles.dot}>
                <span className={styles.dotNumber}>{step.number}</span>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </Section>
  );
};

export default HowItWorks;
