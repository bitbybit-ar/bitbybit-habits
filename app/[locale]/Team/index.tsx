"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import styles from "./team.module.scss";

export const Team: React.FC = () => {
  const t = useTranslations("landing.team");

  const TEAM = [
    {
      name: "Anix",
      github: "analiaacostaok",
      role: t("anixRole"),
      description: t("anixDesc"),
    },
    {
      name: "Llopo",
      github: "fabricio333",
      role: t("llopoRole"),
      description: t("llopoDesc"),
    },
    {
      name: "Wander",
      github: "Pizza-Wder",
      role: t("wanderRole"),
      description: t("wanderDesc"),
    },
    {
      name: "Leon",
      github: "leonacostaok",
      role: t("leonRole"),
      description: t("leonDesc"),
    },
  ];

  return (
    <Section id="team" aria-labelledby="team-title">
      <SectionTitle
        id="team-title"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <div className={styles.grid}>
        {TEAM.map((member) => (
          <article key={member.name} className={styles.card}>
            <div className={styles.avatar}>
              {member.name.charAt(0)}
            </div>
            <div className={styles.info}>
              <h4 className={styles.name}>{member.name}</h4>
              <span className={styles.role}>{member.role}</span>
              <p className={styles.description}>{member.description}</p>
              {member.github && (
                <a
                  href={`https://github.com/${member.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.github}
                >
                  @{member.github}
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
};

export default Team;
