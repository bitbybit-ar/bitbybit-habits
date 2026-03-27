"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import ScrollReveal from "@/components/ui/scroll-reveal";
import styles from "./tech-stack.module.scss";

interface TechItem {
  icon: React.ReactNode;
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
      icon: <Image src="https://upload.wikimedia.org/wikipedia/commons/5/5a/Lightning_Network.svg" alt="Lightning Network" width={40} height={40} className={styles.logoImg} />,
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
      icon: <Image src="https://user-images.githubusercontent.com/99301796/223592277-34058d0e-af30-411d-8dfe-87c42dacdcf2.png" alt="Nostr" width={40} height={40} className={styles.logoImg} />,
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
      icon: <Image src="https://github.com/openclaw.png?size=64" alt="OpenClaw" width={40} height={40} className={styles.logoImg} />,
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
      <ScrollReveal>
        <SectionTitle
          id="tech-title"
          title={t("title")}
          subtitle={t("subtitle")}
        />
      </ScrollReveal>
      <ScrollReveal variant="stagger">
      <div className={styles.grid}>
        {TECH.map((tech, i) => (
          <article key={tech.title} className={styles.card}>
            <div className={styles.iconCircle} aria-hidden="true">{tech.icon}</div>
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
      </ScrollReveal>

      {activeModal !== null && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={closeModal} aria-label="Close">
              ✕
            </button>
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>{TECH[activeModal].icon}</div>
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
