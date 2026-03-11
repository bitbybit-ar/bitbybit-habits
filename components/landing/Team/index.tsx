"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import { cn } from "@/lib/utils";
import styles from "./team.module.scss";

interface TeamMember {
  name: string;
  github: string;
  role: string;
  description: string;
  isBot?: boolean;
}

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
    {
      name: "Annaloppo",
      github: "annaloppo",
      role: t("annaloppoRole"),
      description: t("annaloppoDesc"),
      isBot: true,
    },
    {
      name: "Topolino",
      github: "topolino-claw",
      role: t("topolinoRole"),
      description: t("topolinoDesc"),
      isBot: true,
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
        {(TEAM as TeamMember[]).map((member) => (
          <article key={member.name} className={cn(styles.card, member.isBot && styles.cardBot)}>
            <img
              src={`https://github.com/${member.github}.png?size=128`}
              alt={member.name}
              className={cn(styles.avatar, member.isBot && styles.avatarBot)}
            />
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
