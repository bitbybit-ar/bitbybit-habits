"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import Card from "@/components/ui/card";
import styles from "./why-lightning.module.scss";

export const WhyLightning: React.FC = () => {
  const t = useTranslations("landing.whyLightning");

  const REASONS = [
    { icon: "⚡", stat: t("reason1Stat"), title: t("reason1Title"), description: t("reason1Desc") },
    { icon: "🪙", stat: t("reason2Stat"), title: t("reason2Title"), description: t("reason2Desc") },
    { icon: "🌍", stat: t("reason3Stat"), title: t("reason3Title"), description: t("reason3Desc") },
    { icon: "🔓", stat: t("reason4Stat"), title: t("reason4Title"), description: t("reason4Desc") },
    { icon: "🤖", stat: t("reason5Stat"), title: t("reason5Title"), description: t("reason5Desc") },
  ];

  return (
    <Section id="why-lightning" aria-labelledby="why-title">
      <SectionTitle
        id="why-title"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <div className={styles.grid}>
        {REASONS.map((reason) => (
          <Card key={reason.title} variant="hover" className={styles.card}>
            <div className={styles.icon} aria-hidden="true">{reason.icon}</div>
            <div className={styles.stat}>{reason.stat}</div>
            <h4>{reason.title}</h4>
            <p>{reason.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
};

export default WhyLightning;
