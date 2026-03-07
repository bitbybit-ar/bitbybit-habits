"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import styles from "./roadmap.module.scss";
import { cn } from "@/lib/utils";

export const Roadmap: React.FC = () => {
  const t = useTranslations("landing.roadmap");

  const MILESTONES = [
    { month: t("mar"), title: t("marTitle"), description: t("marDesc"), difficulty: t("diffBeginner"), current: true },
    { month: t("apr"), title: t("aprTitle"), description: t("aprDesc"), difficulty: t("diffBeginner") },
    { month: t("may"), title: t("mayTitle"), description: t("mayDesc"), difficulty: t("diffIntermediate") },
    { month: t("jun"), title: t("junTitle"), description: t("junDesc"), difficulty: t("diffIntermediate") },
    { month: t("jul"), title: t("julTitle"), description: t("julDesc"), difficulty: t("diffAdvanced") },
    { month: t("aug"), title: t("augTitle"), description: t("augDesc"), difficulty: t("diffAdvanced") },
    { month: t("sep"), title: t("sepTitle"), description: t("sepDesc"), difficulty: t("diffExpert") },
    { month: t("oct"), title: t("octTitle"), description: t("octDesc"), difficulty: t("diffExpert") },
  ];

  return (
    <Section id="roadmap" aria-labelledby="roadmap-title">
      <SectionTitle
        id="roadmap-title"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <div className={styles.roadmap} role="list">
        {MILESTONES.map((milestone) => (
          <div
            key={milestone.month}
            className={cn(styles.item, "current" in milestone && milestone.current && styles.current)}
            role="listitem"
          >
            <div className={styles.month}>{milestone.month}</div>
            <div className={styles.line}>
              <div className={styles.dot} />
              <div className={styles.connector} />
            </div>
            <div className={styles.content}>
              <h4>{milestone.title}</h4>
              <p>{milestone.description}</p>
              <span className={styles.difficulty}>{milestone.difficulty}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

export default Roadmap;
