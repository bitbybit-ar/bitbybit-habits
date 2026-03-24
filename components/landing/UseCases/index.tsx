"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import ScrollReveal from "@/components/ui/scroll-reveal";
import Tag from "@/components/ui/tag";
import { FamilyIcon, HeartPulseIcon } from "@/components/icons";
import styles from "./use-cases.module.scss";

export const UseCases: React.FC = () => {
  const t = useTranslations("landing.useCases");

  const USE_CASES = [
    {
      icon: <FamilyIcon size={28} />,
      tag: t("case1Tag"),
      tagVariant: "gold" as const,
      title: t("case1Title"),
      description: t("case1Desc"),
      items: [t("case1Item1"), t("case1Item2"), t("case1Item3"), t("case1Item4")],
    },
    {
      icon: <HeartPulseIcon size={28} />,
      tag: t("case2Tag"),
      tagVariant: "green" as const,
      title: t("case2Title"),
      description: t("case2Desc"),
      items: [t("case2Item1"), t("case2Item2"), t("case2Item3"), t("case2Item4")],
    },
  ];

  return (
    <Section id="use-cases" alternate aria-labelledby="cases-title">
      <ScrollReveal>
        <SectionTitle
          id="cases-title"
          title={t("title")}
          subtitle={t("subtitle")}
        />
      </ScrollReveal>
      <ScrollReveal variant="stagger">
      <div className={styles.useCases}>
        {USE_CASES.map((useCase) => (
          <article key={useCase.title} className={styles.useCase}>
            <div className={styles.iconCircle} aria-hidden="true">
              {useCase.icon}
            </div>
            <div>
              <Tag variant={useCase.tagVariant}>{useCase.tag}</Tag>
              <h3>{useCase.title}</h3>
              <p>{useCase.description}</p>
              <ul>
                {useCase.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
      </ScrollReveal>
    </Section>
  );
};

export default UseCases;
