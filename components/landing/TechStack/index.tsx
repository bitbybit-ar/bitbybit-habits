"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import styles from "./tech-stack.module.scss";

interface TechItem {
  emoji: string;
  title: string;
  description: string;
  linkLabel: string;
  detailTitle: string;
  detailItems: { stat: string; title: string; desc: string }[];
}

export const TechStack: React.FC = () => {
  const t = useTranslations("landing.techStack");
  const [activeModal, setActiveModal] = useState<number | null>(null);

  const TECH: TechItem[] = [
    {
      emoji: "⚡",
      title: "Lightning Network",
      description: t("lightningDesc"),
      linkLabel: t("lightningLink"),
      detailTitle: t("lightningDetailTitle"),
      detailItems: [
        { stat: t("lightning1Stat"), title: t("lightning1Title"), desc: t("lightning1Desc") },
        { stat: t("lightning2Stat"), title: t("lightning2Title"), desc: t("lightning2Desc") },
        { stat: t("lightning3Stat"), title: t("lightning3Title"), desc: t("lightning3Desc") },
        { stat: t("lightning4Stat"), title: t("lightning4Title"), desc: t("lightning4Desc") },
      ],
    },
    {
      emoji: "🔐",
      title: "Nostr",
      description: t("nostrDesc"),
      linkLabel: t("nostrLink"),
      detailTitle: t("nostrDetailTitle"),
      detailItems: [
        { stat: t("nostr1Stat"), title: t("nostr1Title"), desc: t("nostr1Desc") },
        { stat: t("nostr2Stat"), title: t("nostr2Title"), desc: t("nostr2Desc") },
        { stat: t("nostr3Stat"), title: t("nostr3Title"), desc: t("nostr3Desc") },
      ],
    },
    {
      emoji: "🤖",
      title: "OpenClaw",
      description: t("openclawDesc"),
      linkLabel: t("openclawLink"),
      detailTitle: t("openclawDetailTitle"),
      detailItems: [
        { stat: t("openclaw1Stat"), title: t("openclaw1Title"), desc: t("openclaw1Desc") },
        { stat: t("openclaw2Stat"), title: t("openclaw2Title"), desc: t("openclaw2Desc") },
        { stat: t("openclaw3Stat"), title: t("openclaw3Title"), desc: t("openclaw3Desc") },
      ],
    },
    {
      emoji: "🗣️",
      title: "Whisper",
      description: t("whisperDesc"),
      linkLabel: t("whisperLink"),
      detailTitle: t("whisperDetailTitle"),
      detailItems: [
        { stat: t("whisper1Stat"), title: t("whisper1Title"), desc: t("whisper1Desc") },
        { stat: t("whisper2Stat"), title: t("whisper2Title"), desc: t("whisper2Desc") },
      ],
    },
  ];

  const closeModal = useCallback(() => setActiveModal(null), []);

  useEffect(() => {
    if (activeModal === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activeModal, closeModal]);

  return (
    <Section id="tech-stack" alternate aria-labelledby="tech-title">
      <SectionTitle
        id="tech-title"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <div className={styles.grid}>
        {TECH.map((tech, i) => (
          <article key={tech.title} className={styles.card}>
            <span className={styles.emoji} aria-hidden="true">{tech.emoji}</span>
            <div>
              <h4>{tech.title}</h4>
              <p>{tech.description}</p>
              <button
                className={styles.detailLink}
                onClick={() => setActiveModal(i)}
              >
                {tech.linkLabel}
              </button>
            </div>
          </article>
        ))}
      </div>

      {activeModal !== null && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={closeModal} aria-label="Close">
              ✕
            </button>
            <div className={styles.modalHeader}>
              <span className={styles.modalEmoji}>{TECH[activeModal].emoji}</span>
              <h3>{TECH[activeModal].detailTitle}</h3>
            </div>
            <div className={styles.modalGrid}>
              {TECH[activeModal].detailItems.map((item) => (
                <div key={item.title} className={styles.modalCard}>
                  <div className={styles.modalStat}>{item.stat}</div>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
};

export default TechStack;
