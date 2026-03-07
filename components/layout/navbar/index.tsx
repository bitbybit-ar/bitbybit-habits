"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./navbar.module.scss";
import { cn } from "@/lib/utils";

export const Navbar: React.FC = () => {
  const t = useTranslations("landing.nav");
  const [visible, setVisible] = useState(false);

  const NAV_LINKS = [
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#use-cases", label: t("useCases") },
    { href: "#why-lightning", label: t("whyLightning") },
    { href: "#tech-stack", label: t("techStack") },
    { href: "#roadmap", label: t("roadmap") },
    { href: "#team", label: t("team") },
  ];

  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={cn(styles.navbar, visible && styles.visible)}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={styles.container}>
        <a href="#" className={styles.brand} aria-label="BitByBit home">
          BitByBit
        </a>
        <ul className={styles.links}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
