"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import styles from "./tech-stack.module.scss";

export const TechStack: React.FC = () => {
  const t = useTranslations("landing.techStack");

  const TECH = [
    { emoji: "⚡", title: "Lightning Network", description: t("lightningDesc") },
    { emoji: "🔐", title: "Nostr", description: t("nostrDesc") },
    { emoji: "🤖", title: "OpenClaw", description: t("openclawDesc") },
    { emoji: "🍬", title: "Cashu", description: t("cashuDesc") },
    { emoji: "🗣️", title: "Whisper", description: t("whisperDesc") },
    { emoji: "🧠", title: "Local AI (Ollama)", description: t("ollamaDesc") },
  ];

  return (
    <Section id="tech-stack" alternate aria-labelledby="tech-title">
      <SectionTitle
        id="tech-title"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <div className={styles.grid}>
        {TECH.map((tech) => (
          <article key={tech.title} className={styles.card}>
            <span className={styles.emoji} aria-hidden="true">{tech.emoji}</span>
            <div>
              <h4>{tech.title}</h4>
              <p>{tech.description}</p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
};

export default TechStack;
