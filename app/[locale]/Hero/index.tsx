"use client";

import React, { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Button from "@/components/ui/button";
import styles from "./hero.module.scss";

export const Hero: React.FC = () => {
  const t = useTranslations("landing.hero");
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;

    for (let i = 0; i < 12; i++) {
      const bolt = document.createElement("div");
      bolt.className = styles.bolt;
      bolt.style.left = `${Math.random() * 100}%`;
      bolt.style.animationDuration = `${3 + Math.random() * 4}s`;
      bolt.style.animationDelay = `${Math.random() * 5}s`;
      bolt.style.height = `${40 + Math.random() * 60}px`;
      container.appendChild(bolt);
    }
  }, []);

  return (
    <header className={styles.hero} data-hero>
      <div ref={particlesRef} className={styles.particles} aria-hidden="true" />
      <div className={styles.badge}>{t("badge")}</div>
      <h1>BitByBit</h1>
      <p className={styles.subtitle}>
        {t("tagline")}
        <br />
        {t("subtitle")}
      </p>
      <div className={styles.buttons}>
        <Button href="#use-cases" size="lg">
          {t("cta")} ↓
        </Button>
        <Link href="/preview" className={styles.previewButton}>
          {t("preview")}
        </Link>
      </div>
    </header>
  );
};

export default Hero;
