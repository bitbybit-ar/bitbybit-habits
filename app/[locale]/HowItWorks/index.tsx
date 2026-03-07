"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import Card from "@/components/ui/card";
import styles from "./how-it-works.module.scss";

export const HowItWorks: React.FC = () => {
  const t = useTranslations("landing.howItWorks");

  const STEPS = [
    { number: 1, title: t("step1Title"), description: t("step1Desc") },
    { number: 2, title: t("step2Title"), description: t("step2Desc") },
    { number: 3, title: t("step3Title"), description: t("step3Desc") },
    { number: 4, title: t("step4Title"), description: t("step4Desc") },
  ];

  return (
    <Section id="how-it-works" aria-labelledby="how-title">
      <SectionTitle
        id="how-title"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <div className={styles.steps}>
        {STEPS.map((step) => (
          <Card key={step.number} variant="hover" className={styles.step}>
            <div className={styles.stepNumber} aria-hidden="true">
              {step.number}
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
};

export default HowItWorks;
